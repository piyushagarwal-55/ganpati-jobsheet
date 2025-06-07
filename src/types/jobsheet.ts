// src/types/jobsheet.ts
export interface JobSheet {
  id: number;
  job_date: string | null;
  party_name: string | null;
  party_id?: number | null;
  party_balance?: number | null;
  description: string | null;
  sheet?: number | null;
  plate: number | null;
  size: string | null;
  sq_inch: number | null;
  paper_sheet: number | null;
  imp: number | null;
  rate: number | null;
  plate_code?: number | null;
  printing: number | null;
  uv: number | null;
  baking: number | null;
  gsm?: number | null;
  paper_type_id?: number | null;
  paper_type_name?: string | null;
  paper_type_gsm?: number | null;
  job_type?: string | null;
  party_balance_before?: number | null; // Make it optional with null
  party_balance_after?: number | null; // Make it optional with null
  file_url?: string | null;
  paper_provided_by_party?: boolean;
  paper_type?: string | null;
  paper_size?: string | null;
  paper_gsm?: number | null;
  created_at: string;
  updated_at?: string;

  // Soft delete fields
  is_deleted?: boolean;
  deleted_at?: string | null;
  deletion_reason?: string | null;
  deleted_by?: string | null;

  // Join data from related tables
  parties?: {
    id: number;
    name: string;
    balance: number;
  } | null;
  paper_types?: {
    id: number;
    name: string;
    gsm: number;
  } | null;
}

export interface JobSheetNote {
  id: string;
  job_sheet_id: number;
  note: string;
  created_at: string;
  author: string;
}

export interface JobSheetStats {
  totalJobSheets: number;
  totalRevenue: number;
  avgJobValue: number;
  thisMonthJobs: number;
  lastMonthJobs: number;
  revenueGrowth: number;
  totalSheets: number;
  totalImpressions: number;
}

export interface JobSheetChartData {
  month: string;
  jobs: number;
  revenue: number;
  sheets: number;
}

export interface JobSheetNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
}
