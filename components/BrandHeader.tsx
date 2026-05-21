"use client";

import React from "react";
import { KeyRound, Sparkles } from "lucide-react";

export default function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center select-none animate-fade-in">
      <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300">
        <KeyRound className="w-7 h-7" />
        <div className="absolute -top-1 -right-1 bg-apple-blue rounded-full p-1 text-white shadow-sm animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>
      
      <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600 dark:from-zinc-50 dark:to-zinc-300">
        UniRent
      </h1>
      
      <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium text-sm max-w-xs">
        {subtitle || "The campus rental marketplace for students"}
      </p>
    </div>
  );
}
