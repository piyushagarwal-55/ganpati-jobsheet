// src/types/inventory.ts
export interface InventoryItem {
  id: number;
  party_id: number;
  paper_type_id?: number | null;
  paper_type_name: string;
  gsm?: number | null; // Separate GSM field
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  last_updated: string;
  created_at: string;

  // Join data from related tables
  parties?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  } | null;
  paper_types?: {
    id: number;
    name: string;
    gsm?: number;
  } | null;
}

export interface InventoryTransaction {
  id: number;
  inventory_item_id: number;
  party_id: number;
  paper_type_id?: number | null;
  gsm?: number | null; // Separate GSM field
  transaction_type: "in" | "out" | "adjustment" | "reserved" | "released";
  quantity: number;
  unit_type: "sheets" | "packets" | "gross" | "ream";
  unit_size: number;
  total_sheets: number;
  description?: string | null;
  reference_id?: number | null;
  balance_after: number;
  created_at: string;
  created_by: string;

  // Soft delete fields
  is_deleted?: boolean;
  deleted_at?: string | null;
  deletion_reason?: string | null;
  deleted_by?: string | null;

  // Join data from related tables
  inventory_items?: InventoryItem | null;
  parties?: {
    id: number;
    name: string;
  } | null;
  paper_types?: {
    id: number;
    name: string;
    gsm?: number;
  } | null;
}

export interface InventoryFormData {
  party_id: number;
  paper_type_id: number;
  gsm?: number | null; // Separate GSM field like in job sheet form
  transaction_type: "in" | "out" | "adjustment";
  quantity: number;
  unit_type: "sheets" | "packets" | "gross" | "ream";
  unit_size: number; // For packets: 100-200, for gross: 144, for ream: 500
  description?: string;
}

export interface UnitOption {
  value: string;
  label: string;
  size: number;
  icon: string;
  description: string;
  details: string;
}

export const UNIT_OPTIONS: UnitOption[] = [
  {
    value: "sheets",
    label: "Sheets",
    size: 1,
    icon: "📄",
    description: "Individual paper sheets",
    details: "Count each sheet individually (1 sheet = 1 unit)",
  },
  {
    value: "packets",
    label: "Packets",
    size: 100, // Default, user can customize between 100-200
    icon: "📦",
    description: "Bundled paper packets",
    details: "Customizable packet size (100-200 sheets per packet)",
  },
  {
    value: "gross",
    label: "Gross",
    size: 144,
    icon: "📚",
    description: "Standard gross units",
    details: "Fixed size: 144 sheets per gross (12 dozen)",
  },
  {
    value: "ream",
    label: "Ream",
    size: 500,
    icon: "📋",
    description: "Standard ream units",
    details: "Fixed size: 500 sheets per ream (industry standard)",
  },
];

export interface PacketSizeOption {
  value: number;
  label: string;
}

export const PACKET_SIZE_OPTIONS: PacketSizeOption[] = [
  { value: 100, label: "100 sheets per packet" },
  { value: 125, label: "125 sheets per packet" },
  { value: 150, label: "150 sheets per packet" },
  { value: 175, label: "175 sheets per packet" },
  { value: 200, label: "200 sheets per packet" },
];

export interface InventoryStats {
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  parties: number;
  paperTypes: number;
}

export interface InventoryDashboardData {
  stats: InventoryStats;
  recentTransactions: InventoryTransaction[];
  lowStockItems: InventoryItem[];
  topParties: Array<{
    party_id: number;
    party_name: string;
    total_quantity: number;
  }>;
}
