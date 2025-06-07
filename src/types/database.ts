import { Database } from "./supabase";

// Job Sheet related types
export type JobSheet = Database["public"]["Tables"]["job_sheets"]["Row"];
export type JobSheetNote =
  Database["public"]["Tables"]["job_sheet_notes"]["Row"];
export type Party = Database["public"]["Tables"]["parties"]["Row"];
export type PartyTransaction =
  Database["public"]["Tables"]["party_transactions"]["Row"];

export interface DashboardStats {
  totalJobSheets: number;
  totalParties: number;
  totalRevenue: number;
  avgOrderValue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
}

export interface ChartData {
  month: string;
  jobSheets: number;
  revenue: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  timestamp: string;
  read: boolean;
}
