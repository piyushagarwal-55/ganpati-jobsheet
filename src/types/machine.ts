// src/types/machine.ts
export interface Machine {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  color_capacity: number;
  max_sheet_size?: string | null;
  status: "active" | "maintenance" | "offline";
  operator_name?: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface MachineFormData {
  name: string;
  type: string;
  description?: string;
  color_capacity: number;
  max_sheet_size?: string;
  status: "active" | "maintenance" | "offline";
  operator_name?: string;
}

export interface MachineStats {
  total_jobs: number;
  pending_jobs: number;
  assigned_jobs: number;
  in_progress_jobs: number;
  completed_jobs: number;
  cancelled_jobs: number;
}

export interface MachineWithStats extends Machine {
  stats?: MachineStats;
}

export interface JobStatus {
  id: number;
  machine_id?: number | null;
  assigned_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  job_status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";
  operator_notes?: string | null;
}

export interface JobSheetWithMachine {
  id: number;
  job_date: string;
  party_name: string;
  description: string;
  plate: string;
  size: string;
  sq_inch: string;
  paper_sheet: string;
  imp: string;
  rate?: string;
  printing?: number;
  uv?: number;
  baking?: number;
  created_at: string;

  // Machine assignment fields
  machine_id?: number | null;
  assigned_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  job_status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";
  operator_notes?: string | null;

  // Related data
  machine?: Machine | null;

  // Computed fields
  total_cost?: number;
  duration?: number; // in minutes
}

export interface MachineAssignmentData {
  job_sheet_id: number;
  machine_id: number;
  operator_notes?: string;
}

export interface OperatorDashboardData {
  machine: Machine;
  assigned_jobs: JobSheetWithMachine[];
  in_progress_jobs: JobSheetWithMachine[];
  completed_today: JobSheetWithMachine[];
  stats: MachineStats;
}

export const MACHINE_TYPES = [
  { value: "offset", label: "Offset Printing" },
  { value: "digital", label: "Digital Printing" },
  { value: "flexo", label: "Flexographic" },
  { value: "screen", label: "Screen Printing" },
  { value: "letterpress", label: "Letterpress" },
] as const;

export const MACHINE_STATUSES = [
  { value: "active", label: "Active", color: "green" },
  { value: "maintenance", label: "Maintenance", color: "yellow" },
  { value: "offline", label: "Offline", color: "red" },
] as const;

export const JOB_STATUSES = [
  { value: "pending", label: "Pending", color: "gray" },
  { value: "assigned", label: "Assigned", color: "blue" },
  { value: "in_progress", label: "In Progress", color: "yellow" },
  { value: "completed", label: "Completed", color: "green" },
  { value: "cancelled", label: "Cancelled", color: "red" },
] as const;

export const SHEET_SIZES = [
  { value: "A4", label: "A4 (210 × 297 mm)" },
  { value: "A3", label: "A3 (297 × 420 mm)" },
  { value: "A2", label: "A2 (420 × 594 mm)" },
  { value: "A1", label: "A1 (594 × 841 mm)" },
  { value: "A0", label: "A0 (841 × 1189 mm)" },
  { value: "Letter", label: "Letter (8.5 × 11 inch)" },
  { value: "Legal", label: "Legal (8.5 × 14 inch)" },
  { value: "Tabloid", label: "Tabloid (11 × 17 inch)" },
  { value: "Custom", label: "Custom Size" },
] as const;
