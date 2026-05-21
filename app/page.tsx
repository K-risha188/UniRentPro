"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Plus, 
  LogOut, 
  MapPin, 
  DollarSign, 
  Calendar, 
  User, 
  BookOpen, 
  ShieldCheck, 
  Filter,
  Sparkles,
  Smartphone,
  Book,
  PlusCircle,
  Clock,
  Compass,
  Tag,
  GraduationCap,
  Loader2,
  Check,
  X,
  Phone
} from "lucide-react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

// Interface for Rental Items
interface RentalItem {
  id?: string;
  _id?: string;
  title: string;
  category: string;
  price: number;
  university: string;
  ownerName: string;
  ownerPhone?: string;
  ownerUid?: string;
  availableDate: string;
  imageColor: string;
  description: string;
  iconName?: string;
}

export default function Home() {
  const router = useRouter();
  
  // App States
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  
  // List Form State
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Electronics");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemDate, setNewItemDate] = useState("");

  // Active database items list
  const [items, setItems] = useState<RentalItem[]>([]);

  // Item Detail & Request Modal state
  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);
  const [selectedItemRequests, setSelectedItemRequests] = useState<any[]>([]);
  const [userSentRequest, setUserSentRequest] = useState<any | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Load login details and fetch live listings from database
  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem("unirent_current_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }

    // Load active listings from MongoDB Atlas
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => {
        if (data.listings && data.listings.length > 0) {
          setItems(data.listings);
        }
      })
      .catch((err) => console.error("Error loading database listings:", err));
  }, []);

  const handleItemClick = async (item: RentalItem) => {
    setSelectedItem(item);
    setLoadingRequests(true);
    setRequestError(null);
    setSelectedItemRequests([]);
    setUserSentRequest(null);

    const activeUser = user || JSON.parse(localStorage.getItem("unirent_current_user") || "null");
    if (!activeUser) {
      setLoadingRequests(false);
      return;
    }

    const itemOwnerUid = item.ownerUid || (item as any).ownerUid;
    const activeUserUid = activeUser.uid || activeUser._id;
    const itemId = item.id || (item as any)._id;

    try {
      if (activeUserUid === itemOwnerUid) {
        // Owner clicks: load all requests for this listing
        const res = await fetch(`/api/requests?listingId=${itemId}`);
        const data = await res.json();
        if (data.success) {
          setSelectedItemRequests(data.data);
        } else {
          setRequestError(data.error);
        }
      } else {
        // Tenant clicks: check if this tenant has sent a request
        const res = await fetch(`/api/requests?listingId=${itemId}&requesterUid=${activeUserUid}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setUserSentRequest(data.data[0]);
        }
      }
    } catch (err: any) {
      console.error("Error loading requests:", err);
      setRequestError("Failed to check request details.");
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRequestToRent = async () => {
    if (!selectedItem || !user) return;
    setRequestSubmitting(true);
    setRequestError(null);

    const activeUserUid = user.uid || user._id;
    const itemId = selectedItem.id || (selectedItem as any)._id;
    const itemOwnerUid = selectedItem.ownerUid || (selectedItem as any).ownerUid;

    const payload = {
      listingId: itemId,
      requesterUid: activeUserUid,
      requesterName: user.name || "Anonymous",
      requesterPhone: user.phoneNumber || "0000000000",
      ownerUid: itemOwnerUid
    };

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setUserSentRequest(data.data);
      } else {
        setRequestError(data.error || "Failed to submit request.");
      }
    } catch (err: any) {
      console.error("Error submitting request:", err);
      setRequestError("Server connection error. Please try again.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, status: "approved" | "declined") => {
    setRequestError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ requestId, status })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedItemRequests((prev) =>
          prev.map((req) => (req._id === requestId ? { ...req, status } : req))
        );
      } else {
        setRequestError(data.error || "Failed to update request status.");
      }
    } catch (err: any) {
      console.error("Error updating request:", err);
      setRequestError("Server connection error.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("unirent_current_user");
    setUser(null);
    if (isFirebaseConfigured && auth) {
      auth.signOut();
    }
    router.refresh();
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newItemTitle.trim() || !newItemPrice || !newItemDate) {
      alert("Please fill in all listing details.");
      return;
    }

    const priceNum = parseFloat(newItemPrice);
    if (isNaN(priceNum)) return;

    // Pick random gradient matching the green & yellow theme
    const gradients = [
      "from-green-400 to-yellow-500",
      "from-emerald-400 to-amber-500",
      "from-yellow-400 to-green-500",
      "from-lime-400 to-green-600",
      "from-green-500 to-emerald-600"
    ];
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const listingPayload = {
      title: newItemTitle,
      category: newItemCategory,
      price: priceNum,
      university: user.universityName || "Stanford University",
      ownerName: user.name || "Anonymous Student",
      ownerPhone: user.phoneNumber || "0000000000",
      ownerUid: user.uid || user._id || "unknown_uid",
      availableDate: newItemDate === new Date().toISOString().split('T')[0] ? "Today" : newItemDate,
      imageColor: randomGradient,
      description: newItemDesc || "No description provided."
    };

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(listingPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create listing.");
      }

      // Prepend live MongoDB listing to state list
      setItems([data.listing, ...items]);
      setIsListingModalOpen(false);
      
      // Clear fields
      setNewItemTitle("");
      setNewItemPrice("");
      setNewItemDesc("");
      setNewItemDate("");
    } catch (err: any) {
      alert(err.message || "Unable to save listing to database.");
    }
  };

  const renderIcon = (categoryOrType: string) => {
    const val = categoryOrType?.toLowerCase() || "";
    if (val.includes("elect") || val === "electronics") {
      return <Smartphone className="w-6 h-6 text-white" />;
    }
    if (val.includes("book") || val === "textbooks") {
      return <Book className="w-6 h-6 text-white" />;
    }
    if (val.includes("calc") || val === "calculators") {
      return <GraduationCap className="w-6 h-6 text-white" />;
    }
    if (val.includes("trans") || val === "transport") {
      return <Compass className="w-6 h-6 text-white" />;
    }
    return <Tag className="w-6 h-6 text-white" />;
  };

  // Filter items based on search query and category
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-black min-h-screen transition-colors duration-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-zinc-50/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-extrabold text-sm">
              UR
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 to-zinc-700 dark:from-zinc-50 dark:to-zinc-300">
              UniRent
            </span>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search calculators, text books, bikes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-200/50 dark:bg-zinc-900/50 border-0 rounded-full text-sm text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5">
                  {/* Student Badge Card */}
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{user.name}</span>
                    <span className="text-xxs text-zinc-400 dark:text-zinc-500">{user.universityName || "Verified Student"}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-sm">
                    {user.name ? user.name.charAt(0) : "S"}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="p-2 text-zinc-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-950 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => router.push("/signup")}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-900 dark:hover:bg-zinc-100 font-semibold rounded-full text-sm transition-all"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Banner for Search on Mobile */}
        <div className="md:hidden w-full mb-6">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-200/50 dark:bg-zinc-900/50 border-0 rounded-2xl text-sm text-black dark:text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Hero Section */}
        <section className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 py-6">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-apple-blue/10 text-apple-blue dark:bg-apple-blue/20 rounded-full text-xs font-semibold animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Campus Marketplace
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              Rent campus essentials <br className="hidden sm:inline" />
              for a day.
            </h2>
            <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed">
              Need a graphing calculator for an exam? A camera for a weekend project? Find items listed by students at your university, list yours to earn, and borrow with trust.
            </p>

            <div className="pt-2 flex justify-center md:justify-start gap-4">
              <button
                onClick={() => {
                  if (!user) {
                    router.push("/signup");
                  } else {
                    setIsListingModalOpen(true);
                  }
                }}
                className="flex items-center gap-2 py-3 px-6 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-2xl shadow-md hover:bg-zinc-900 dark:hover:bg-zinc-100 transition-all hover:scale-102 active:scale-98"
              >
                <Plus className="w-5 h-5" />
                List an Item
              </button>
              
              {!user && (
                <button
                  onClick={() => router.push("/login")}
                  className="py-3 px-6 bg-zinc-200/50 dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-semibold rounded-2xl transition-all"
                >
                  Explore Items
                </button>
              )}
            </div>
          </div>

          {/* Verification Badge Visual */}
          <div className="relative w-full max-w-xs md:max-w-sm glass-panel p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-4 shadow-lg animate-slide-up-fade">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Trust & Safety</h4>
                <p className="text-xxs text-zinc-400">Exclusively for university members</p>
              </div>
            </div>
            
            <div className="border-t border-zinc-200/40 dark:border-zinc-800/40 pt-4 space-y-2">
              <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Verify with campus email (.edu / official)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Phone OTP verification required for listings</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Daily rental lock and handoff agreements</span>
              </div>
            </div>

            {user && (
              <div className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-950/60 rounded-xl flex items-center gap-3 border border-zinc-200/30 dark:border-zinc-800/30">
                <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="truncate text-left">
                  <span className="block text-xxs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Verified User</span>
                  <span className="block text-xs font-semibold truncate text-zinc-500 dark:text-zinc-400">{user.universityEmail}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Filters and Search Results Header */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-zinc-200/30 dark:border-zinc-900/30 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Explore Catalog</h3>
            </div>
            
            {/* Category Capsules */}
            <div className="flex flex-wrap gap-2">
              {["All", "Electronics", "Calculators", "Textbooks", "Transport", "Sports"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                      : "bg-zinc-200/50 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div 
                  key={item.id || (item as any)._id}
                  onClick={() => handleItemClick(item)}
                  className="group flex flex-col bg-white dark:bg-zinc-900/40 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/40 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer duration-300 animate-slide-up-fade"
                >
                  {/* Card Banner Image Placeholder */}
                  <div className={`h-40 w-full bg-gradient-to-br ${item.imageColor} relative flex items-center justify-center p-4`}>
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/35 backdrop-blur-md text-white rounded-full text-[10px] font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Rent: ₹{item.price}/day
                    </div>
                    
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                      {renderIcon(item.category || item.iconName || "")}
                    </div>

                    <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-200 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                      {item.category}
                    </div>
                  </div>

                  {/* Card Description */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-xs">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="font-semibold truncate">{item.university}</span>
                      </div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-base leading-snug group-hover:text-apple-blue transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
                          {item.ownerName.charAt(0)}
                        </div>
                        <span className="font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]">
                          {item.ownerName}
                        </span>
                      </div>
                      
                      <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Avail: {item.availableDate}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-zinc-900/20 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl">
              <Search className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-lg mb-1">No items found</h4>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
                We couldn't find any results matching "{searchQuery}". Try updating your search or filters!
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-zinc-200/40 dark:border-zinc-900/40 py-10 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-2">
          <p>© 2026 UniRent Campus Marketplace. All student details are verified through phone and campus email authentication.</p>
          <p className="text-[10px] text-zinc-300 dark:text-zinc-600">Built with standard Next.js, Firebase Auth & Apple-inspired design conventions.</p>
        </div>
      </footer>

      {/* List an Item Modal */}
      {isListingModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative animate-slide-up-fade">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-apple-blue" />
              List an Item for Rent
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Fill details to list an item at {user.universityName || "your university"}.
            </p>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xxs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GoPro Hero 10 Black"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-black text-black dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-black text-black dark:text-white"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Calculators">Calculators</option>
                    <option value="Textbooks">Textbooks</option>
                    <option value="Transport">Transport</option>
                    <option value="Sports">Sports</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Price (₹ / Day)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 text-xs pointer-events-none">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="5"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full pl-7 pr-4 py-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-black text-black dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Availability Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newItemDate}
                  onChange={(e) => setNewItemDate(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-black text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xxs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  placeholder="Describe condition, pickup location details or accessories included..."
                  value={newItemDesc}
                  rows={3}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-black text-black dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsListingModalOpen(false)}
                  className="w-1/3 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 bg-black hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-semibold rounded-xl text-sm shadow-md transition-all active:scale-98"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail & Request Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl relative border border-zinc-100 dark:border-zinc-850 animate-slide-up-fade flex flex-col max-h-[90vh]">
            
            {/* Gradient Banner */}
            <div className={`h-44 w-full bg-gradient-to-br ${selectedItem.imageColor} relative flex items-center justify-center p-6 shrink-0`}>
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-black/35 hover:bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg">
                {renderIcon(selectedItem.category || (selectedItem as any).iconName || "")}
              </div>

              <div className="absolute bottom-4 left-6 px-3 py-1 bg-white/95 text-zinc-900 rounded-full text-xs font-bold uppercase tracking-wider">
                {selectedItem.category}
              </div>
            </div>

            {/* Scrollable details container */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-xs">
                  <MapPin className="w-4 h-4 text-apple-blue" />
                  <span className="font-semibold text-zinc-650 dark:text-zinc-400">{selectedItem.university}</span>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                  {selectedItem.title}
                </h3>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="px-3.5 py-1.5 bg-brand-yellow-light border border-yellow-200 text-brand-yellow rounded-full text-sm font-bold flex items-center gap-1">
                    Rent: ₹{selectedItem.price}/day
                  </div>
                  <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500" />
                    Available: {selectedItem.availableDate}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Description</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-350 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  {selectedItem.description}
                </p>
              </div>

              {/* Contact/Verification Badge */}
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-emerald-950/10 border border-green-100 dark:border-emerald-900/20 rounded-2xl">
                <ShieldCheck className="w-6 h-6 text-apple-blue shrink-0" />
                <div className="text-[11px] text-zinc-650 dark:text-zinc-400 font-medium">
                  UniRent verified listing. Created by student <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedItem.ownerName}</span>.
                </div>
              </div>

              {/* Interactive Request actions */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 space-y-4">
                {requestError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl font-medium">
                    {requestError}
                  </div>
                )}

                {/* Case 1: Active user is the Owner */}
                {user && (user.uid === selectedItem.ownerUid || user._id === selectedItem.ownerUid) ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-brand-yellow" />
                      Rent Requests Received ({selectedItemRequests.length})
                    </h4>

                    {loadingRequests ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-apple-blue" />
                      </div>
                    ) : selectedItemRequests.length > 0 ? (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {selectedItemRequests.map((req) => (
                          <div 
                            key={req._id}
                            className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/60 rounded-2xl"
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{req.requesterName}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-405 font-semibold flex items-center gap-1">
                                <Phone className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                                {req.requesterPhone}
                              </p>
                            </div>

                            <div>
                              {req.status === "pending" ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateRequestStatus(req._id, "approved")}
                                    className="p-2 bg-apple-blue hover:bg-green-700 text-white rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
                                    title="Approve request"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateRequestStatus(req._id, "declined")}
                                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all focus:outline-none cursor-pointer"
                                    title="Decline request"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : req.status === "approved" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase rounded-lg">
                                  <Check className="w-3 h-3" />
                                  Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold uppercase rounded-lg">
                                  <X className="w-3 h-3" />
                                  Declined
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-450 dark:text-zinc-500 font-semibold py-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
                        No active rent requests received yet for this listing.
                      </p>
                    )}
                  </div>
                ) : (
                  /* Case 2: Active user is the Tenant */
                  <div className="space-y-3">
                    {loadingRequests ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-apple-blue" />
                      </div>
                    ) : userSentRequest ? (
                      <div className="space-y-3 animate-fade-in">
                        {userSentRequest.status === "pending" && (
                          <div className="p-4 bg-brand-yellow-light border border-yellow-200 text-brand-yellow text-sm font-semibold rounded-2xl text-center flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4 animate-spin" />
                            Request Pending Approval
                          </div>
                        )}
                        {userSentRequest.status === "approved" && (
                          <div className="space-y-3">
                            <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                              <Check className="w-5 h-5" />
                              Rent Request Approved!
                            </div>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2 text-xs text-zinc-650 dark:text-zinc-400 font-semibold leading-relaxed">
                              <p className="text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-wider text-[10px] text-brand-yellow">Coordination Details</p>
                              <p className="flex items-center gap-2">
                                <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                Owner Name: {selectedItem.ownerName}
                              </p>
                              <p className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                Owner Phone: <a href={`tel:${selectedItem.ownerPhone}`} className="text-apple-blue dark:text-green-405 underline font-bold">{selectedItem.ownerPhone}</a>
                              </p>
                            </div>
                          </div>
                        )}
                        {userSentRequest.status === "declined" && (
                          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-semibold rounded-2xl text-center flex items-center justify-center gap-2">
                            <X className="w-4 h-4" />
                            Rent Request Declined
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={handleRequestToRent}
                        disabled={requestSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-apple-blue hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-sm transition-all cursor-pointer select-none active:scale-98"
                      >
                        {requestSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Request to Rent This Item
                            <Plus className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions footer */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-850 flex justify-end shrink-0 rounded-b-3xl">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-6 py-2.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-300 font-semibold rounded-xl text-sm transition-all focus:outline-none cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
