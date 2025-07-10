"use client";

import React from "react";
import { UserSetup } from "@/components/auth/user-setup";

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Operator Dashboard Setup
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Configure your operator dashboard users and authentication
          </p>
        </div>

        <UserSetup />
      </div>
    </div>
  );
}
