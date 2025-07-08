import { useState, useEffect, useCallback } from "react";
import {
  InventoryItem,
  InventoryTransaction,
  InventoryFormData,
  InventoryDashboardData,
} from "@/types/inventory";

interface UseInventoryReturn {
  // Data
  inventoryItems: InventoryItem[];
  transactions: InventoryTransaction[];
  dashboardData: InventoryDashboardData | null;

  // Loading states
  loading: boolean;
  submitLoading: boolean;

  // Error states
  error: string | null;

  // Operations
  addInventoryTransaction: (
    data: InventoryFormData
  ) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  getStockByPartyAndPaper: (
    partyId: number,
    paperTypeId: number
  ) => InventoryItem | null;

  // Stats
  getTotalValue: () => number;
  getLowStockCount: () => number;
  getPartyInventoryValue: (partyId: number) => number;
}

export function useInventory(): UseInventoryReturn {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [dashboardData, setDashboardData] =
    useState<InventoryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all inventory data
  const fetchInventoryData = useCallback(async () => {
    try {
      const [inventoryRes, transactionsRes, dashboardRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory/transactions"),
        fetch("/api/inventory/dashboard"),
      ]);

      const [inventoryData, transactionsData, dashboardData] =
        await Promise.all([
          inventoryRes.json(),
          transactionsRes.json(),
          dashboardRes.json(),
        ]);

      if (inventoryData.success) {
        setInventoryItems(inventoryData.data);
      }

      if (transactionsData.success) {
        setTransactions(transactionsData.data);
      }

      if (dashboardData.success) {
        setDashboardData(dashboardData.data);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching inventory data:", err);
      setError("Failed to fetch inventory data");
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchInventoryData();
      setLoading(false);
    };

    loadData();
  }, [fetchInventoryData]);

  // Add inventory transaction
  const addInventoryTransaction = useCallback(
    async (data: InventoryFormData) => {
      setSubmitLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          // Refresh data after successful transaction
          await fetchInventoryData();
          return { success: true };
        } else {
          setError(result.error || "Failed to add inventory transaction");
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMessage =
          "An error occurred while adding inventory transaction";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setSubmitLoading(false);
      }
    },
    [fetchInventoryData]
  );

  // Refresh data
  const refreshData = useCallback(async () => {
    await fetchInventoryData();
  }, [fetchInventoryData]);

  // Get stock for specific party and paper type
  const getStockByPartyAndPaper = useCallback(
    (partyId: number, paperTypeId: number) => {
      return (
        inventoryItems.find(
          (item) =>
            item.party_id === partyId && item.paper_type_id === paperTypeId
        ) || null
      );
    },
    [inventoryItems]
  );

  // Calculate total inventory value
  const getTotalValue = useCallback(() => {
    return inventoryItems.reduce((total, item) => {
      return total + item.current_quantity * item.unit_cost;
    }, 0);
  }, [inventoryItems]);

  // Get count of low stock items
  const getLowStockCount = useCallback(() => {
    return inventoryItems.filter((item) => item.current_quantity < 1000).length;
  }, [inventoryItems]);

  // Get total inventory value for a specific party
  const getPartyInventoryValue = useCallback(
    (partyId: number) => {
      return inventoryItems
        .filter((item) => item.party_id === partyId)
        .reduce((total, item) => {
          return total + item.current_quantity * item.unit_cost;
        }, 0);
    },
    [inventoryItems]
  );

  return {
    // Data
    inventoryItems,
    transactions,
    dashboardData,

    // Loading states
    loading,
    submitLoading,

    // Error states
    error,

    // Operations
    addInventoryTransaction,
    refreshData,
    getStockByPartyAndPaper,

    // Stats
    getTotalValue,
    getLowStockCount,
    getPartyInventoryValue,
  };
}
