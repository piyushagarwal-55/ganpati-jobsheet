// Database types - defining directly since Supabase types are incomplete

// Job Sheet related types
export interface JobSheet {
  id: number;
  job_date: string;
  party_id: number | null;
  party_name: string;
  description: string;
  plate: string;
  size: string;
  sq_inch: string;
  paper_sheet: string;
  imp: string;
  rate: string;
  printing: string;
  uv: string;
  baking: string;
  paper_type_id?: number | null;
  job_type?: string | null;
  gsm?: number | null;
  paper_provided_by_party?: boolean;
  paper_type?: string | null;
  paper_size?: string | null;
  paper_gsm?: number | null;
  plate_code?: string;
  machine_id?: number | null;
  assign_to_machine?: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface JobSheetNote {
  id: number;
  job_sheet_id: number;
  note: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface Party {
  id: number;
  name: string;
  balance: number;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  total_orders: number;
  total_amount_paid: number;
  last_transaction_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PartyTransaction {
  id: number;
  party_id: number;
  type: "payment" | "order" | "adjustment";
  amount: number;
  description?: string;
  balance_after: number;
  created_by: string;
  created_at: string;
  parties?: { name: string };
}

// Paper Type interface (for paper types API)
export interface PaperType {
  id: number;
  name: string;
  gsm?: number | null;
  created_at: string;
  updated_at?: string;
}

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
