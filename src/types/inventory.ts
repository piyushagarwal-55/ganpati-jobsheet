// src/types/inventory.ts
export interface InventoryItem {
  id: number;
  party_id: number;
  paper_type_id?: number | null;
  paper_type_name: string;
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
  description: string;
}

export const UNIT_OPTIONS: UnitOption[] = [
  {
    value: "sheets",
    label: "Sheets",
    size: 1,
    description: "Individual sheets (1 sheet = 1 unit)",
  },
  {
    value: "packets",
    label: "Packets",
    size: 100, // Default, user can customize between 100-200
    description: "Packets (100-200 sheets per packet - customizable)",
  },
  {
    value: "gross",
    label: "Gross",
    size: 144,
    description: "Gross (144 sheets per gross - standard)",
  },
  {
    value: "ream",
    label: "Ream",
    size: 500,
    description: "Ream (500 sheets per ream - standard)",
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
