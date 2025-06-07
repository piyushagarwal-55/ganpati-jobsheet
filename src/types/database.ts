import { Database } from './supabase';

export type QuotationRequest = Database['public']['Tables']['quotation_requests']['Row'];
export type QuotationNote = Database['public']['Tables']['quotation_notes']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];

export interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  completedQuotations: number;
  inProgressQuotations: number;
  cancelledQuotations: number;
  totalRevenue: number;
  avgOrderValue: number;
  thisMonthQuotations: number;
  lastMonthQuotations: number;
  revenueGrowth: number;
  conversionRate: number;
}

export interface ChartData {
  month: string;
  quotations: number;
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