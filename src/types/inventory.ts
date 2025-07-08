// src/types/inventory.ts
export interface InventoryItem {
  id: number;
  party_id: number;
  paper_type_id?: number | null;
  paper_type_name: string;
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit_cost: number;
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
  unit_cost: number;
  total_cost: number;
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
  unit_cost: number;
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
    description: "Individual sheets",
  },
  {
    value: "packets",
    label: "Packets",
    size: 100, // Default, user can customize between 100-200
    description: "Packets (100-200 sheets)",
  },
  {
    value: "gross",
    label: "Gross",
    size: 144,
    description: "Gross (144 sheets)",
  },
  {
    value: "ream",
    label: "Ream",
    size: 500,
    description: "Ream (500 sheets)",
  },
];

export interface InventoryStats {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
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
    total_value: number;
  }>;
}
