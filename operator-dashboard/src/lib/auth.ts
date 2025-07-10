"use client";

import { supabaseBrowser } from "./supabase";
import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  name?: string;
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

// Sign out
export async function signOut() {
  const { error } = await supabaseBrowser.auth.signOut();
  return { error };
}

// Get current user
export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
    error,
  } = await supabaseBrowser.auth.getUser();

  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email || "",
    role: user.user_metadata?.role || "operator",
    name: user.user_metadata?.name || user.email?.split("@")[0] || "",
  };
}

// Get session
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabaseBrowser.auth.getSession();
  return { session, error };
}

// Listen to auth changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabaseBrowser.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const { session } = await getSession();
  return !!session;
}

// User roles and permissions
export const USER_ROLES = {
  admin: "admin",
  supervisor: "supervisor",
  operator: "operator",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Check if user has specific role
export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  if (!user) return false;
  return user.role === role || user.role === USER_ROLES.admin; // Admin has all permissions
}

// Get user role display name
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case USER_ROLES.admin:
      return "Administrator";
    case USER_ROLES.supervisor:
      return "Supervisor";
    case USER_ROLES.operator:
      return "Operator";
    default:
      return "Operator";
  }
}

// User configurations
export const USERS_CONFIG = [
  {
    email: "admin@ganpathioverseas.com",
    password: "12345",
    role: USER_ROLES.admin,
    name: "Administrator",
  },
  {
    email: "supervisor@ganpathioverseas.com",
    password: "12345",
    role: USER_ROLES.supervisor,
    name: "Supervisor",
  },
  {
    email: "guddu@ganpathioverseas.com",
    password: "12345",
    role: USER_ROLES.operator,
    name: "Guddu",
  },
  {
    email: "dwarika@ganpathioverseas.com",
    password: "12345",
    role: USER_ROLES.operator,
    name: "Dwarika",
  },
] as const;
