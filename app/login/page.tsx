"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Phone, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertCircle, 
  Loader2, 
  KeyRound,
  LogIn
} from "lucide-react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import BrandHeader from "@/components/BrandHeader";

export default function LoginPage() {
  const router = useRouter();
  
  // UI States
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoBanner, setDemoBanner] = useState(!isFirebaseConfigured);
  
  // Form Inputs
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(60);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error("Error clearing recaptcha on unmount:", e);
        }
      }
    };
  }, []);

  // Handle OTP focus sequence
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Phase 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      return setError("Please enter a valid phone number (including country code, e.g., +919876543210)");
    }

    setLoading(true);

    if (!isFirebaseConfigured) {
      // Demo Mode
      setTimeout(() => {
        setLoading(false);
        
        // Check if user is registered in our mock DB (localStorage)
        const profileStr = localStorage.getItem(`unirent_profile_${phoneNumber}`);
        if (!profileStr) {
          // Warn that they are not registered but allow continuing for demo convenience
          setSuccessMsg("Demo Mode: Phone number not registered yet, but you can continue to log in as a guest! OTP is 123456.");
        } else {
          setSuccessMsg("Demo Mode: SMS code sent! Use 123456.");
        }
        
        setStep(2);
        setResendTimer(60);
      }, 1200);
      return;
    }

    // Actual Firebase Phone Auth
    try {
      if (!auth) throw new Error("Firebase Auth is not initialized");

      // Clear any existing verifier instance
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error("Error clearing recaptcha:", e);
        }
      }

      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible"
      });
      recaptchaVerifierRef.current = verifier;

      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      
      setConfirmationResult(confirmation);
      setSuccessMsg(`Verification code sent to ${formattedPhone}`);
      setStep(2);
      setResendTimer(60);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send verification SMS.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: Confirm OTP / Log In
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const otpCode = otp.join("");
    
    if (otpCode.length < 6) {
      return setError("Please enter the full 6-digit code");
    }

    setLoading(true);

    let phoneToQuery = phoneNumber;

    if (!isFirebaseConfigured) {
      // Demo verification
      if (otpCode !== "123456" && !otpCode.startsWith("123")) {
        setLoading(false);
        return setError("Invalid verification code in Demo Mode. Try '123456'.");
      }
    } else {
      // Actual Firebase OTP Verification
      try {
        if (!confirmationResult) {
          throw new Error("No verification context found. Please request verification again.");
        }
        const result = await confirmationResult.confirm(otpCode);
        if (result.user.phoneNumber) {
          phoneToQuery = result.user.phoneNumber;
        }
      } catch (err: any) {
        console.error(err);
        setLoading(false);
        return setError(err.message || "Invalid code. Authentication failed.");
      }
    }

    // Connect to MongoDB Atlas via API route to fetch profile
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: phoneToQuery }),
      });

      const data = await response.json();

      if (response.status === 404) {
        // Successful verification but no DB record exists. Redirect to sign up.
        setSuccessMsg("Phone verified! Redirecting to Sign Up to complete your profile...");
        setTimeout(() => {
          router.push(`/signup?phone=${encodeURIComponent(phoneToQuery)}`);
        }, 2000);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to retrieve student profile.");
      }

      // Save user profile locally for state check
      localStorage.setItem("unirent_current_user", JSON.stringify(data.user));
      setSuccessMsg("Logged in successfully!");
      
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setLoading(true);

    if (!isFirebaseConfigured) {
      setTimeout(() => {
        setLoading(false);
        setResendTimer(60);
        setSuccessMsg("Demo SMS code resent! Use 123456.");
      }, 1000);
      return;
    }

    try {
      if (!auth) throw new Error("Firebase Auth is not initialized");
      let verifier = recaptchaVerifierRef.current;
      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible"
        });
        recaptchaVerifierRef.current = verifier;
      }
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setResendTimer(60);
      setSuccessMsg("SMS code resent successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to resend SMS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 md:py-24 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-950 min-h-screen">
      
      <div id="recaptcha-container"></div>

      {demoBanner && (
        <div className="w-full max-w-md mb-6 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300 animate-slide-up-fade">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold block mb-0.5">Demo Mode Active</span>
            SMS codes will be simulated. Use **123456** as the OTP verification code. If you completed a Sign Up first, you can log in with that phone number to restore your details.
          </div>
        </div>
      )}

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-xl transition-all duration-500 animate-slide-up-fade">
        <BrandHeader subtitle="Log in with your phone number to access your campus rental items" />

        {/* Global Messages */}
        {error && (
          <div className="mt-6 mb-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && !error && (
          <div className="mt-6 mb-2 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
            <Check className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-6 mt-8 animate-fade-in">
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <Phone className="w-5 h-5" />
                </span>
                <input
                  id="phone"
                  type="tel"
                  required
                  placeholder="+919876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black transition-all text-sm font-medium"
                />
              </div>
              <p className="mt-2 text-xxs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                Enter your registered phone number, including country code (e.g. +91).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-black dark:bg-white hover:bg-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50 text-white dark:text-black font-semibold rounded-2xl shadow-md transition-all active:scale-99"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Send Verification Code
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Entry */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6 mt-8 animate-fade-in">
            <div>
              <div className="flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 mb-6">
                <KeyRound className="w-5 h-5" />
                <span className="text-sm font-medium">Verify Phone Number</span>
              </div>
              
              <div className="flex justify-between gap-2 max-w-xs mx-auto mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    className="w-12 h-14 text-center text-xl font-bold bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-apple-blue focus:bg-white dark:focus:bg-black otp-input-shadow transition-all text-black dark:text-white"
                  />
                ))}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || loading}
                  className="text-xs font-semibold text-apple-blue hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Verification Code"}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 flex items-center justify-center gap-1.5 py-4 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-2xl transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 flex items-center justify-center gap-2 py-4 bg-black dark:bg-white hover:bg-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50 text-white dark:text-black font-semibold rounded-2xl shadow-md transition-all active:scale-99"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <LogIn className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
          New to UniRent?{" "}
          <button 
            onClick={() => router.push("/signup")}
            className="font-semibold text-black dark:text-white hover:underline focus:outline-none"
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
}
