import { createClient } from "@supabase/supabase-js";
import {
  createBrowserClient,
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client for client-side operations
export const createClientBrowser = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Server client for server-side operations (only use in server components)
export const createServerClient = () => {
  const { cookies } = require("next/headers");
  const cookieStore = cookies();

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};

// Simple client for basic operations (works everywhere)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth-specific client for browser use
export const supabaseBrowser = createClientBrowser();

// Database types for the operator dashboard
export interface JobSheet {
  id: number;
  description: string;
  party_name: string;
  machine_id?: number;
  job_status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  operator_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Machine {
  id: number;
  name: string;
  type: string;
  operator_name?: string;
  operator_email?: string;
  operator_phone?: string;
  status: "active" | "maintenance" | "offline";
  is_available: boolean;
}

export interface OperatorNotification {
  id: number;
  type: string;
  job_sheet_id?: number;
  machine_id: number;
  operator_name?: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Party {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  balance: number;
}

export interface StockItem {
  id: number;
  paper_type_name: string;
  gsm: number;
  current_quantity: number;
  available_quantity: number;
}

// Real-time subscription helper
export function subscribeToJobUpdates(
  machineId: number,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel(`machine:${machineId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "job_sheets",
        filter: `machine_id=eq.${machineId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Real-time subscription for notifications
export function subscribeToNotifications(
  machineId: number,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel(`notifications:${machineId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "operator_notifications",
        filter: `machine_id=eq.${machineId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
