"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  User, 
  Phone, 
  Mail, 
  BookOpen, 
  Hash, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertCircle, 
  Loader2, 
  KeyRound,
  Sparkles
} from "lucide-react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import BrandHeader from "@/components/BrandHeader";

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-apple-blue" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams?.get("phone") || "";
  
  // Navigation / UI States
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoBanner, setDemoBanner] = useState(!isFirebaseConfigured);
  
  // Step 1: Contact Details
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Step 2: OTP Verification
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(60);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  
  // Step 3: Academic Details
  const [universityName, setUniversityName] = useState("");
  const [universityEmail, setUniversityEmail] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");

  // Pre-fill phone number if passed in query string
  useEffect(() => {
    if (phoneParam) {
      setPhoneNumber(phoneParam);
    }
  }, [phoneParam]);

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

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Handle OTP focus sequence
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    // Take only the last character in case of double press
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    
    // Focus next if filled
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // STEP 1 Submission: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!name.trim()) return setError("Name is required");
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      return setError("Please enter a valid phone number (including country code, e.g., +919876543210)");
    }

    setLoading(true);

    if (!isFirebaseConfigured) {
      // Demo Mode
      setTimeout(() => {
        setLoading(false);
        setStep(2);
        setResendTimer(60);
        setSuccessMsg("Demo Mode: SMS verification code sent! Use 123456.");
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
        size: "invisible",
        callback: () => {}
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
      setError(err.message || "Failed to send verification SMS. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 Submission: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const otpCode = otp.join("");
    
    if (otpCode.length < 6) {
      return setError("Please enter the full 6-digit code");
    }

    setLoading(true);

    if (!isFirebaseConfigured) {
      // Demo Mode verification
      setTimeout(() => {
        setLoading(false);
        if (otpCode === "123456" || otpCode.startsWith("123")) {
          setStep(3);
          setSuccessMsg("Phone number verified successfully!");
        } else {
          setError("Invalid verification code in Demo Mode. Try '123456'.");
        }
      }, 1000);
      return;
    }

    // Actual Firebase OTP Confirm
    try {
      if (!confirmationResult) {
        throw new Error("No confirmation code found. Please restart registration.");
      }
      await confirmationResult.confirm(otpCode);
      setSuccessMsg("Phone number verified successfully!");
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 Submission: Academic Details & Complete Registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Academic Validations
    if (!universityName.trim()) return setError("University name is required");
    if (!universityEmail.trim() || !universityEmail.includes("@")) {
      return setError("Please enter a valid university email");
    }
    if (!enrollmentNumber.trim()) return setError("Enrollment number is required");

    setLoading(true);

    try {
      const uid = auth?.currentUser?.uid || `demo_${Date.now()}`;
      
      // Save details to MongoDB Atlas
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid,
          name,
          phoneNumber,
          universityName,
          universityEmail,
          enrollmentNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register profile in database.");
      }

      // Save user profile locally for state check
      localStorage.setItem("unirent_current_user", JSON.stringify(data.user));
      
      setSuccessMsg("Account created and saved successfully!");
      
      // Navigate to main app dashboard after short delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Try again.");
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
        setSuccessMsg("Demo SMS resent! Use 123456.");
      }, 1000);
      return;
    }

    try {
      if (!auth) throw new Error("Firebase Auth is not initialized");
      let verifier = recaptchaVerifierRef.current;
      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {}
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
      
      {/* Invisible Recaptcha Element */}
      <div id="recaptcha-container"></div>

      {demoBanner && (
        <div className="w-full max-w-md mb-6 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300 animate-slide-up-fade">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold block mb-0.5">Demo Mode Active</span>
            Firebase credentials are not set in `.env.local`. SMS codes will be simulated. Use **123456** as the OTP verification code.
          </div>
        </div>
      )}

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-xl transition-all duration-500 animate-slide-up-fade">
        <BrandHeader subtitle="Create your student account to start renting" />

        {/* Stepper Status Bar */}
        <div className="flex items-center justify-between w-full mt-8 mb-8 px-4">
          <div className="flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-all ${
              step >= 1 
                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" 
                : "border-zinc-300 dark:border-zinc-700 text-zinc-400"
            }`}>
              {step > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <span className={`ml-2 text-xs font-medium ${step === 1 ? "text-black dark:text-white" : "text-zinc-400"}`}>Contact</span>
          </div>
          <div className={`h-px flex-1 mx-4 ${step > 1 ? "bg-black dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"}`} />
          <div className="flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-all ${
              step >= 2 
                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" 
                : "border-zinc-300 dark:border-zinc-700 text-zinc-400"
            }`}>
              {step > 2 ? <Check className="w-4 h-4" /> : "2"}
            </div>
            <span className={`ml-2 text-xs font-medium ${step === 2 ? "text-black dark:text-white" : "text-zinc-400"}`}>Verify</span>
          </div>
          <div className={`h-px flex-1 mx-4 ${step > 2 ? "bg-black dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"}`} />
          <div className="flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-all ${
              step >= 3 
                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" 
                : "border-zinc-300 dark:border-zinc-700 text-zinc-400"
            }`}>
              3
            </div>
            <span className={`ml-2 text-xs font-medium ${step === 3 ? "text-black dark:text-white" : "text-zinc-400"}`}>Academic</span>
          </div>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && !error && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
            <Check className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1 Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5 animate-fade-in">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <User className="w-5 h-5" />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black transition-all text-sm font-medium"
                />
              </div>
            </div>

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
                Include country code (e.g. +91 for India, +1 for US). An SMS code will be sent to verify.
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
                  Send OTP Code
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2 Form: OTP Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in">
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
                    Verify & Continue
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3 Form: Academic Details */}
        {step === 3 && (
          <form onSubmit={handleCompleteRegistration} className="space-y-5 animate-fade-in">
            <div>
              <label htmlFor="university" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                University Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <BookOpen className="w-5 h-5" />
                </span>
                <input
                  id="university"
                  type="text"
                  required
                  placeholder="e.g. Stanford University"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                University Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="johndoe@university.edu"
                  value={universityEmail}
                  onChange={(e) => setUniversityEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="enrollment" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Enrollment / ID Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <Hash className="w-5 h-5" />
                </span>
                <input
                  id="enrollment"
                  type="text"
                  required
                  placeholder="e.g. SU-2026-9817"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black transition-all text-sm font-medium"
                />
              </div>
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
                  Complete Registration
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Already have an account?{" "}
          <button 
            onClick={() => router.push("/login")}
            className="font-semibold text-black dark:text-white hover:underline focus:outline-none"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
