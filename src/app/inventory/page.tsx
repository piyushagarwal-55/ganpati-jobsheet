"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  Users,
  FileText,
  BarChart3,
  Boxes,
  Calculator,
  RefreshCw,
  Home,
  Filter,
  Download,
  Upload,
  Search,
  X,
  Trash2,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  InventoryFormData,
  UNIT_OPTIONS,
  PACKET_SIZE_OPTIONS,
  InventoryItem,
  InventoryTransaction,
} from "@/types/inventory";
import { useInventory } from "@/hooks/useInventory";
import Loading from "@/components/ui/loading";

// GSM options from job sheet form
const paperGSMs = [
  70, 80, 90, 100, 110, 115, 120, 125, 130, 150, 170, 200, 210, 220, 230, 250,
  260, 270, 280, 300, 330,
];

interface Party {
  id: number;
  name: string;
  balance: number;
  phone?: string;
  email?: string;
}

interface PaperType {
  id: number;
  name: string;
  gsm?: number;
}

export default function InventoryPage() {
  // Use the inventory hook
  const {
    inventoryItems,
    transactions: recentTransactions,
    loading,
    submitLoading,
    error,
    addInventoryTransaction,
    deleteInventoryItem,
    deleteTransaction,
    softDeleteTransaction,
    refreshData,
    getStockByPartyAndPaper,
  } = useInventory();

  const [formData, setFormData] = useState<InventoryFormData>({
    party_id: 0,
    paper_type_id: 0,
    gsm: null,
    transaction_type: "in",
    quantity: 0,
    unit_type: "packets",
    unit_size: 100,
    description: "",
  });

  const [parties, setParties] = useState<Party[]>([]);
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([]);
  const [currentStock, setCurrentStock] = useState<InventoryItem | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Delete confirmation states
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "item" | "transaction";
    id: number;
    name: string;
  } | null>(null);

  // Soft delete dialog states
  const [softDeleteDialog, setSoftDeleteDialog] = useState<{
    transactionId: number;
    transactionName: string;
  } | null>(null);
  const [deletionReason, setDeletionReason] = useState("");

  // Custom packet size for packets unit type
  const [customPacketSize, setCustomPacketSize] = useState(100);

  // Filter states
  const [inventoryFilter, setInventoryFilter] = useState({
    search: "",
    party: "all",
    paperType: "all",
    stockLevel: "all", // all, low, normal, high
  });

  const [transactionFilter, setTransactionFilter] = useState({
    search: "",
    party: "all",
    paperType: "all",
    transactionType: "all", // all, in, out, adjustment
    dateRange: "all", // all, today, week, month
    showDeleted: "active", // all, active, deleted
  });

  // Dialog states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Party management states (from job sheet form)
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [showNewPartyDialog, setShowNewPartyDialog] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyBalance, setNewPartyBalance] = useState("");

  // Paper type management states
  const [showNewPaperTypeDialog, setShowNewPaperTypeDialog] = useState(false);
  const [newPaperType, setNewPaperType] = useState({ name: "", gsm: "" });

  // Fetch initial data (parties and paper types only, inventory data is handled by hook)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partiesRes, paperTypesRes] = await Promise.all([
          fetch("/api/parties"),
          fetch("/api/paper-types"),
        ]);

        const [partiesData, paperTypesData] = await Promise.all([
          partiesRes.json(),
          paperTypesRes.json(),
        ]);

        console.log("Parties data:", partiesData);
        setParties(Array.isArray(partiesData) ? partiesData : []);

        // Handle paper types data properly
        const processedPaperTypes = paperTypesData?.data || paperTypesData;
        console.log("Paper types response:", paperTypesData);
        console.log("Processed paper types:", processedPaperTypes);
        setPaperTypes(
          Array.isArray(processedPaperTypes) ? processedPaperTypes : []
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        setMessage({ type: "error", text: "Failed to load data" });
      }
    };

    fetchData();
  }, []);

  // Update current stock when party, paper type, and GSM change
  useEffect(() => {
    if (formData.party_id > 0 && formData.paper_type_id > 0 && formData.gsm) {
      // Find exact match including GSM
      const exactStock = inventoryItems.find(
        (item) =>
          item.party_id === formData.party_id &&
          item.paper_type_id === formData.paper_type_id &&
          item.gsm === formData.gsm
      );

      setCurrentStock(exactStock || null);
    } else {
      setCurrentStock(null);
    }
  }, [formData.party_id, formData.paper_type_id, formData.gsm, inventoryItems]);

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return;

    try {
      let result;
      if (deleteConfirmation.type === "item") {
        result = await deleteInventoryItem(deleteConfirmation.id);
      } else {
        result = await deleteTransaction(deleteConfirmation.id);
      }

      if (result.success) {
        setMessage({
          type: "success",
          text: `${deleteConfirmation.type === "item" ? "Inventory item" : "Transaction"} deleted successfully!`,
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to delete",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while deleting",
      });
    } finally {
      setDeleteConfirmation(null);
    }
  };

  // Handle soft delete confirmation
  const handleSoftDeleteConfirm = async () => {
    if (!softDeleteDialog || !deletionReason.trim()) return;

    try {
      const result = await softDeleteTransaction(
        softDeleteDialog.transactionId,
        deletionReason.trim(),
        "Admin"
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: "Transaction deleted successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to delete transaction",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while deleting transaction",
      });
    } finally {
      setSoftDeleteDialog(null);
      setDeletionReason("");
    }
  };

  // Show error from hook
  useEffect(() => {
    if (error) {
      setMessage({ type: "error", text: error });
    }
  }, [error]);

  // Update unit size based on unit type
  useEffect(() => {
    const unitOption = UNIT_OPTIONS.find(
      (option) => option.value === formData.unit_type
    );
    if (unitOption) {
      if (formData.unit_type === "packets") {
        setFormData((prev) => ({ ...prev, unit_size: customPacketSize }));
      } else {
        setFormData((prev) => ({ ...prev, unit_size: unitOption.size }));
      }
    }
  }, [formData.unit_type, customPacketSize]);

  // Party management functions (from job sheet form)
  const handleAddNewParty = async () => {
    if (!newPartyName.trim()) return;

    try {
      const response = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPartyName.trim(),
          balance: parseFloat(newPartyBalance) || 0,
        }),
      });

      if (response.ok) {
        const newParty = await response.json();
        // Refresh parties list
        const updatedPartiesRes = await fetch("/api/parties");
        const updatedPartiesData = await updatedPartiesRes.json();
        setParties(Array.isArray(updatedPartiesData) ? updatedPartiesData : []);

        // Select the newly created party
        const createdParty = newParty.data || newParty;
        setSelectedParty(createdParty);
        setFormData((prev) => ({
          ...prev,
          party_id: createdParty.id,
        }));

        setShowNewPartyDialog(false);
        setNewPartyName("");
        setNewPartyBalance("");
        setMessage({ type: "success", text: "Party added successfully!" });
      }
    } catch (error) {
      console.error("Error adding party:", error);
      setMessage({ type: "error", text: "Failed to add party" });
    }
  };

  const handleAddNewPaperType = async () => {
    if (!newPaperType.name.trim()) return;

    try {
      const requestBody = {
        name: newPaperType.name.trim(),
        ...(newPaperType.gsm && { gsm: parseInt(newPaperType.gsm) }),
      };

      const response = await fetch("/api/paper-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const createdType = await response.json();
        // Refresh paper types
        const updatedTypesRes = await fetch("/api/paper-types");
        const updatedTypesData = await updatedTypesRes.json();
        const processedPaperTypes = updatedTypesData?.data || updatedTypesData;
        setPaperTypes(
          Array.isArray(processedPaperTypes) ? processedPaperTypes : []
        );

        // Select the newly created paper type
        const createdPaperType = createdType.data || createdType;
        setFormData((prev) => ({
          ...prev,
          paper_type_id: createdPaperType.id,
        }));

        setShowNewPaperTypeDialog(false);
        setNewPaperType({ name: "", gsm: "" });
        setMessage({ type: "success", text: "Paper type added successfully!" });
      }
    } catch (error) {
      console.error("Error adding paper type:", error);
      setMessage({ type: "error", text: "Failed to add paper type" });
    }
  };

  // Filtered inventory items
  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch =
        !inventoryFilter.search ||
        item.parties?.name
          ?.toLowerCase()
          .includes(inventoryFilter.search.toLowerCase()) ||
        item.paper_type_name
          .toLowerCase()
          .includes(inventoryFilter.search.toLowerCase());

      const matchesParty =
        inventoryFilter.party === "all" ||
        item.party_id.toString() === inventoryFilter.party;

      const matchesPaperType =
        inventoryFilter.paperType === "all" ||
        item.paper_type_id?.toString() === inventoryFilter.paperType;

      const matchesStockLevel =
        inventoryFilter.stockLevel === "all" ||
        (inventoryFilter.stockLevel === "debt" && item.current_quantity < 0) ||
        (inventoryFilter.stockLevel === "low" &&
          item.current_quantity >= 0 &&
          item.current_quantity < 1000) ||
        (inventoryFilter.stockLevel === "normal" &&
          item.current_quantity >= 1000 &&
          item.current_quantity < 5000) ||
        (inventoryFilter.stockLevel === "high" &&
          item.current_quantity >= 5000);

      return (
        matchesSearch && matchesParty && matchesPaperType && matchesStockLevel
      );
    });
  }, [inventoryItems, inventoryFilter]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return recentTransactions.filter((transaction) => {
      const matchesSearch =
        !transactionFilter.search ||
        transaction.parties?.name
          ?.toLowerCase()
          .includes(transactionFilter.search.toLowerCase()) ||
        transaction.inventory_items?.paper_type_name
          ?.toLowerCase()
          .includes(transactionFilter.search.toLowerCase());

      const matchesParty =
        transactionFilter.party === "all" ||
        transaction.party_id.toString() === transactionFilter.party;

      const matchesPaperType =
        transactionFilter.paperType === "all" ||
        transaction.paper_type_id?.toString() === transactionFilter.paperType;

      const matchesTransactionType =
        transactionFilter.transactionType === "all" ||
        transaction.transaction_type === transactionFilter.transactionType;

      const matchesDateRange = (() => {
        if (transactionFilter.dateRange === "all") return true;
        const transactionDate = new Date(transaction.created_at);
        const now = new Date();

        switch (transactionFilter.dateRange) {
          case "today":
            return transactionDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return transactionDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return transactionDate >= monthAgo;
          default:
            return true;
        }
      })();

      const matchesDeletedFilter = (() => {
        const isDeleted = transaction.is_deleted === true;
        switch (transactionFilter.showDeleted) {
          case "active":
            return !isDeleted;
          case "deleted":
            return isDeleted;
          case "all":
            return true;
          default:
            return !isDeleted;
        }
      })();

      return (
        matchesSearch &&
        matchesParty &&
        matchesPaperType &&
        matchesTransactionType &&
        matchesDateRange &&
        matchesDeletedFilter
      );
    });
  }, [recentTransactions, transactionFilter]);

  const calculateTotalSheets = () => {
    return formData.quantity * formData.unit_size;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      formData.party_id === 0 ||
      formData.paper_type_id === 0 ||
      !formData.quantity
    ) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    setMessage(null);

    try {
      const result = await addInventoryTransaction(formData);

      if (result.success) {
        setMessage({
          type: "success",
          text: "Inventory updated successfully!",
        });

        // Reset form
        setFormData({
          party_id: 0,
          paper_type_id: 0,
          gsm: null,
          transaction_type: "in",
          quantity: 0,
          unit_type: "packets",
          unit_size: 100,
          description: "",
        });

        // Reset selected party and current stock
        setSelectedParty(null);
        setCurrentStock(null);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to update inventory",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setMessage({
        type: "error",
        text: "An error occurred while updating inventory",
      });
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            title="Inventory Management"
            description="Manage paper stock and track inventory movements"
            icon={Package}
          />
          <div className="flex gap-3">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="bg-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              className="bg-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert
            className={
              message.type === "success"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }
          >
            <AlertDescription
              className={
                message.type === "success" ? "text-green-800" : "text-red-800"
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Warning for empty data */}
        {!loading && (parties.length === 0 || paperTypes.length === 0) && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {parties.length === 0 && paperTypes.length === 0
                ? "No parties or paper types found. Please add some parties and paper types before managing inventory."
                : parties.length === 0
                  ? "No parties found. Please add some parties first."
                  : "No paper types found. Please add some paper types first."}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/parties")}
                  className="mr-2"
                >
                  Manage Parties
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // For now, just show a message that paper types management is coming soon
                    setMessage({
                      type: "success",
                      text: "Paper types can be added via the database or API. Management UI coming soon!",
                    });
                  }}
                >
                  Add Paper Types
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100">
            <TabsTrigger
              value="form"
              className="flex items-center gap-2 data-[state=active]:bg-white"
            >
              <Package className="w-4 h-4" />
              Add Stock
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="flex items-center gap-2 data-[state=active]:bg-white"
            >
              <Boxes className="w-4 h-4" />
              Current Inventory
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2 data-[state=active]:bg-white"
            >
              <FileText className="w-4 h-4" />
              Recent Transactions
            </TabsTrigger>
          </TabsList>

          {/* Add Stock Form */}
          <TabsContent value="form">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Inventory Transaction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Party Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="party">Party Name *</Label>
                          <Select
                            value={selectedParty?.id.toString() || ""}
                            onValueChange={(value) => {
                              if (value === "new") {
                                setShowNewPartyDialog(true);
                              } else {
                                const party = parties.find(
                                  (p) => p.id.toString() === value
                                );
                                if (party) {
                                  setSelectedParty(party);
                                  setFormData((prev) => ({
                                    ...prev,
                                    party_id: party.id,
                                  }));
                                }
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a party" />
                            </SelectTrigger>
                            <SelectContent>
                              {parties.length === 0 ? (
                                <SelectItem value="no-parties" disabled>
                                  {loading
                                    ? "Loading parties..."
                                    : "No parties available"}
                                </SelectItem>
                              ) : (
                                parties.map((party) => (
                                  <SelectItem
                                    key={party.id}
                                    value={party.id.toString()}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{party.name}</span>
                                      <Badge
                                        variant={
                                          party.balance >= 0
                                            ? "default"
                                            : "destructive"
                                        }
                                        className="ml-2"
                                      >
                                        ₹{party.balance.toLocaleString()}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                              <SelectItem value="new">
                                <div className="flex items-center gap-2">
                                  <Plus className="w-4 h-4" />
                                  <span>Add New Party</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {selectedParty && (
                            <div className="text-sm text-gray-600">
                              Current Balance:{" "}
                              <Badge
                                variant={
                                  selectedParty.balance >= 0
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                ₹{selectedParty.balance.toLocaleString()}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Paper Type Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="paperType">Paper Type *</Label>
                          <Select
                            value={
                              formData.paper_type_id === 0
                                ? ""
                                : formData.paper_type_id.toString()
                            }
                            onValueChange={(value) => {
                              if (value === "new") {
                                setShowNewPaperTypeDialog(true);
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  paper_type_id: parseInt(value),
                                }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select paper type" />
                            </SelectTrigger>
                            <SelectContent>
                              {paperTypes.length === 0 ? (
                                <SelectItem value="no-paper-types" disabled>
                                  {loading
                                    ? "Loading paper types..."
                                    : "No paper types available"}
                                </SelectItem>
                              ) : (
                                paperTypes.map((type) => (
                                  <SelectItem
                                    key={type.id}
                                    value={type.id.toString()}
                                  >
                                    {type.name}
                                  </SelectItem>
                                ))
                              )}
                              <SelectItem value="new">
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Plus className="w-4 h-4" />
                                  Add New Paper Type
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* GSM Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="gsm">GSM *</Label>
                          <Select
                            value={formData.gsm?.toString() || ""}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                gsm: parseInt(value),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select GSM" />
                            </SelectTrigger>
                            <SelectContent>
                              {paperGSMs.map((gsm) => (
                                <SelectItem key={gsm} value={gsm.toString()}>
                                  {gsm} GSM
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Transaction Type */}
                        <div className="space-y-2">
                          <Label htmlFor="transactionType">
                            Transaction Type *
                          </Label>
                          <Select
                            value={formData.transaction_type}
                            onValueChange={(
                              value: "in" | "out" | "adjustment"
                            ) =>
                              setFormData((prev) => ({
                                ...prev,
                                transaction_type: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in">
                                <div className="flex items-center gap-2">
                                  <Plus className="w-4 h-4 text-green-600" />
                                  Stock In
                                </div>
                              </SelectItem>
                              <SelectItem value="out">
                                <div className="flex items-center gap-2">
                                  <Minus className="w-4 h-4 text-red-600" />
                                  Stock Out
                                </div>
                              </SelectItem>
                              <SelectItem value="adjustment">
                                <div className="flex items-center gap-2">
                                  <Calculator className="w-4 h-4 text-blue-600" />
                                  Adjustment
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Unit Type */}
                        <div className="space-y-2">
                          <Label htmlFor="unitType">Unit Type *</Label>
                          <Select
                            value={formData.unit_type}
                            onValueChange={(
                              value: "sheets" | "packets" | "gross" | "ream"
                            ) =>
                              setFormData((prev) => ({
                                ...prev,
                                unit_type: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {option.icon}
                                    </span>
                                    <span>{option.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Unit Type Information */}
                          {formData.unit_type && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
                              {(() => {
                                const selectedUnit = UNIT_OPTIONS.find(
                                  (opt) => opt.value === formData.unit_type
                                );
                                if (!selectedUnit) return null;

                                return (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">
                                        {selectedUnit.icon}
                                      </span>
                                      <div>
                                        <span className="font-medium text-gray-900">
                                          {selectedUnit.label}
                                        </span>
                                        <p className="text-sm text-gray-600">
                                          {selectedUnit.description}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                                      <strong>How it works:</strong>{" "}
                                      {selectedUnit.details}
                                      {formData.unit_type === "packets" && (
                                        <span className="block mt-1">
                                          <strong>Current setting:</strong>{" "}
                                          {customPacketSize} sheets per packet
                                        </span>
                                      )}
                                      {formData.quantity > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <strong>Example:</strong>{" "}
                                          {formData.quantity}{" "}
                                          {formData.unit_type} ={" "}
                                          {calculateTotalSheets().toLocaleString()}{" "}
                                          total sheets
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Custom Packet Size (only for packets) */}
                        {formData.unit_type === "packets" && (
                          <div className="space-y-2">
                            <Label htmlFor="packetSize">
                              Packet Size * ({customPacketSize} sheets/packet)
                            </Label>
                            <Select
                              value={customPacketSize.toString()}
                              onValueChange={(value) =>
                                setCustomPacketSize(parseInt(value))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select packet size" />
                              </SelectTrigger>
                              <SelectContent>
                                {PACKET_SIZE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value.toString()}
                                  >
                                    {option.value} sheets per packet
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Quantity */}
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Packet Quantity *</Label>
                          <Input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                quantity: parseInt(e.target.value) || 0,
                              }))
                            }
                            min="1"
                            placeholder="Enter quantity"
                            required
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Add any additional notes..."
                          rows={3}
                        />
                      </div>

                      {/* Calculation Summary */}
                      {formData.quantity > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            Transaction Summary
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Quantity:</span>
                              <span className="font-semibold ml-2">
                                {formData.quantity.toLocaleString()}{" "}
                                {formData.unit_type}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">
                                Total Sheets:
                              </span>
                              <span className="font-semibold text-blue-700 ml-2">
                                {calculateTotalSheets().toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={submitLoading}
                        className="w-full"
                      >
                        {submitLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Update Inventory
                          </div>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Current Stock Info */}
              <div className="space-y-6">
                {/* Current Stock Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Current Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentStock ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div
                            className={`text-3xl font-bold ${
                              currentStock.current_quantity < 0
                                ? "text-red-600"
                                : "text-primary"
                            }`}
                          >
                            {currentStock.current_quantity < 0 ? "-" : ""}
                            {Math.abs(
                              currentStock.current_quantity
                            ).toLocaleString()}
                            {currentStock.current_quantity < 0 && (
                              <span className="text-sm ml-2 bg-red-100 text-red-700 px-2 py-1 rounded">
                                DEBT
                              </span>
                            )}
                          </div>
                          <div
                            className={`${
                              currentStock.current_quantity < 0
                                ? "text-red-600 font-semibold"
                                : "text-gray-600"
                            }`}
                          >
                            {currentStock.current_quantity < 0
                              ? "sheets in debt"
                              : "sheets available"}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {currentStock.parties?.name} -{" "}
                            {currentStock.paper_type_name}
                            {currentStock.gsm && ` (${currentStock.gsm} GSM)`}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reserved:</span>
                            <span className="font-semibold">
                              {currentStock.reserved_quantity.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Available:</span>
                            <span
                              className={`font-semibold ${
                                currentStock.available_quantity < 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {currentStock.available_quantity < 0 ? "-" : ""}
                              {Math.abs(
                                currentStock.available_quantity
                              ).toLocaleString()}
                              {currentStock.available_quantity < 0 && (
                                <span className="text-xs ml-1 bg-red-100 text-red-700 px-1 rounded">
                                  DEBT
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {currentStock.current_quantity < 0 ? (
                          <Alert className="bg-red-50 border-red-200">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              <strong>DEBT ALERT!</strong> This party owes{" "}
                              {Math.abs(
                                currentStock.current_quantity
                              ).toLocaleString()}{" "}
                              sheets. Consider restocking or collecting debt.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          currentStock.current_quantity < 1000 && (
                            <Alert className="bg-orange-50 border-orange-200">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-orange-800">
                                Low stock warning! Consider restocking soon.
                              </AlertDescription>
                            </Alert>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>
                          Select party, paper type, and GSM to view current
                          stock
                        </p>
                        {formData.party_id > 0 &&
                          formData.paper_type_id > 0 &&
                          !formData.gsm && (
                            <p className="text-sm text-orange-600 mt-2">
                              GSM selection required
                            </p>
                          )}
                        {formData.party_id > 0 &&
                          formData.paper_type_id > 0 &&
                          formData.gsm && (
                            <p className="text-sm text-blue-600 mt-2">
                              No existing stock found for this combination. Add
                              some stock to see it here.
                            </p>
                          )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Items:</span>
                        <Badge variant="secondary">
                          {inventoryItems.length}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Low Stock:</span>
                        <Badge variant="destructive">
                          {
                            inventoryItems.filter(
                              (item) =>
                                item.current_quantity < 1000 &&
                                item.current_quantity >= 0
                            ).length
                          }
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600 font-medium">
                          In Debt:
                        </span>
                        <Badge className="bg-red-600 hover:bg-red-700 text-white">
                          {
                            inventoryItems.filter(
                              (item) => item.current_quantity < 0
                            ).length
                          }
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600 font-medium">
                          Total Debt:
                        </span>
                        <Badge className="bg-red-600 hover:bg-red-700 text-white">
                          {inventoryItems
                            .reduce((sum, item) => {
                              return item.current_quantity < 0
                                ? sum + Math.abs(item.current_quantity)
                                : sum;
                            }, 0)
                            .toLocaleString()}{" "}
                          sheets
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Parties:</span>
                        <Badge variant="secondary">{parties.length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paper Types:</span>
                        <Badge variant="secondary">{paperTypes.length}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Current Inventory Tab */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-5 h-5" />
                    Current Inventory ({filteredInventoryItems.length} of{" "}
                    {inventoryItems.length} items)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImportDialog(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const csvData = filteredInventoryItems.map((item) => ({
                          "Party Name":
                            item.parties?.name || `Party ${item.party_id}`,
                          "Paper Type": item.paper_type_name,
                          GSM: item.paper_types?.gsm || "",
                          "Current Stock": item.current_quantity,
                          Available: item.available_quantity,
                          Reserved: item.reserved_quantity,
                        }));
                        const csvContent =
                          Object.keys(csvData[0] || {}).join(",") +
                          "\n" +
                          csvData
                            .map((row) => Object.values(row).join(","))
                            .join("\n");
                        const blob = new Blob([csvContent], {
                          type: "text/csv",
                        });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "inventory-report.csv";
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Inventory Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="inventorySearch">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="inventorySearch"
                        placeholder="Search party or paper type..."
                        value={inventoryFilter.search}
                        onChange={(e) =>
                          setInventoryFilter((prev) => ({
                            ...prev,
                            search: e.target.value,
                          }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inventoryParty">Party</Label>
                    <Select
                      value={inventoryFilter.party}
                      onValueChange={(value) =>
                        setInventoryFilter((prev) => ({
                          ...prev,
                          party: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All parties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All parties</SelectItem>
                        {parties.map((party) => (
                          <SelectItem
                            key={party.id}
                            value={party.id.toString()}
                          >
                            {party.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inventoryPaperType">Paper Type</Label>
                    <Select
                      value={inventoryFilter.paperType}
                      onValueChange={(value) =>
                        setInventoryFilter((prev) => ({
                          ...prev,
                          paperType: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All paper types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All paper types</SelectItem>
                        {paperTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} {type.gsm && `(${type.gsm} GSM)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inventoryStockLevel">Stock Level</Label>
                    <Select
                      value={inventoryFilter.stockLevel}
                      onValueChange={(value) =>
                        setInventoryFilter((prev) => ({
                          ...prev,
                          stockLevel: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All levels</SelectItem>
                        <SelectItem value="debt">
                          <span className="text-red-600 font-medium">
                            In Debt (Negative)
                          </span>
                        </SelectItem>
                        <SelectItem value="low">
                          Low stock (&lt; 1,000)
                        </SelectItem>
                        <SelectItem value="normal">
                          Normal (1,000 - 5,000)
                        </SelectItem>
                        <SelectItem value="high">
                          High stock (&gt; 5,000)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters Button */}
                  {(inventoryFilter.search ||
                    inventoryFilter.party !== "all" ||
                    inventoryFilter.paperType !== "all" ||
                    inventoryFilter.stockLevel !== "all") && (
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setInventoryFilter({
                            search: "",
                            party: "all",
                            paperType: "all",
                            stockLevel: "all",
                          })
                        }
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Party</TableHead>
                        <TableHead>Paper Type</TableHead>
                        <TableHead className="text-right">
                          Current Stock
                        </TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventoryItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">
                              {item.parties?.name || `Party ${item.party_id}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {item.paper_type_name}
                            </div>
                            {item.gsm && (
                              <div className="text-sm text-gray-500">
                                {item.gsm} GSM
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span
                              className={
                                item.current_quantity < 0
                                  ? "text-red-600 font-bold"
                                  : ""
                              }
                            >
                              {item.current_quantity < 0 ? "-" : ""}
                              {Math.abs(item.current_quantity).toLocaleString()}
                              {item.current_quantity < 0 && (
                                <span className="text-xs ml-1 bg-red-100 text-red-700 px-1 rounded">
                                  DEBT
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span
                              className={
                                item.available_quantity < 0
                                  ? "text-red-600 font-bold"
                                  : "text-green-600"
                              }
                            >
                              {item.available_quantity < 0 ? "-" : ""}
                              {Math.abs(
                                item.available_quantity
                              ).toLocaleString()}
                              {item.available_quantity < 0 && (
                                <span className="text-xs ml-1 bg-red-100 text-red-700 px-1 rounded">
                                  DEBT
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.current_quantity < 0 ? (
                              <Badge
                                variant="destructive"
                                className="text-xs bg-red-600 text-white animate-pulse"
                              >
                                IN DEBT
                              </Badge>
                            ) : item.current_quantity < 1000 ? (
                              <Badge variant="destructive" className="text-xs">
                                Low Stock
                              </Badge>
                            ) : item.current_quantity < 5000 ? (
                              <Badge variant="secondary" className="text-xs">
                                Normal
                              </Badge>
                            ) : (
                              <Badge className="text-xs bg-green-600 hover:bg-green-700">
                                Good Stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDeleteConfirmation({
                                      type: "item",
                                      id: item.id,
                                      name: `${item.parties?.name || `Party ${item.party_id}`} - ${item.paper_type_name}${item.gsm ? ` (${item.gsm} GSM)` : ""}`,
                                    })
                                  }
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Item
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Transactions ({filteredTransactions.length} of{" "}
                  {recentTransactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Transaction Filters */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="transactionSearch">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="transactionSearch"
                        placeholder="Search party or paper type..."
                        value={transactionFilter.search}
                        onChange={(e) =>
                          setTransactionFilter((prev) => ({
                            ...prev,
                            search: e.target.value,
                          }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transactionParty">Party</Label>
                    <Select
                      value={transactionFilter.party}
                      onValueChange={(value) =>
                        setTransactionFilter((prev) => ({
                          ...prev,
                          party: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All parties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All parties</SelectItem>
                        {parties.map((party) => (
                          <SelectItem
                            key={party.id}
                            value={party.id.toString()}
                          >
                            {party.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transactionPaperType">Paper Type</Label>
                    <Select
                      value={transactionFilter.paperType}
                      onValueChange={(value) =>
                        setTransactionFilter((prev) => ({
                          ...prev,
                          paperType: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All paper types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All paper types</SelectItem>
                        {paperTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} {type.gsm && `(${type.gsm} GSM)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transactionType">Transaction Type</Label>
                    <Select
                      value={transactionFilter.transactionType}
                      onValueChange={(value) =>
                        setTransactionFilter((prev) => ({
                          ...prev,
                          transactionType: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="in">Stock In</SelectItem>
                        <SelectItem value="out">Stock Out</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transactionDateRange">Date Range</Label>
                    <Select
                      value={transactionFilter.dateRange}
                      onValueChange={(value) =>
                        setTransactionFilter((prev) => ({
                          ...prev,
                          dateRange: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transactionShowDeleted">Status</Label>
                    <Select
                      value={transactionFilter.showDeleted}
                      onValueChange={(value) =>
                        setTransactionFilter((prev) => ({
                          ...prev,
                          showDeleted: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="deleted">Deleted Only</SelectItem>
                        <SelectItem value="all">All Transactions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters Button */}
                  {(transactionFilter.search ||
                    transactionFilter.party !== "all" ||
                    transactionFilter.paperType !== "all" ||
                    transactionFilter.transactionType !== "all" ||
                    transactionFilter.dateRange !== "all" ||
                    transactionFilter.showDeleted !== "active") && (
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setTransactionFilter({
                            search: "",
                            party: "all",
                            paperType: "all",
                            transactionType: "all",
                            dateRange: "all",
                            showDeleted: "active",
                          })
                        }
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Paper Type</TableHead>
                        <TableHead className="text-center">Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">
                          Total Sheets
                        </TableHead>
                        <TableHead className="text-right">
                          Balance After
                        </TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          className={
                            transaction.is_deleted
                              ? "opacity-60 bg-gray-50"
                              : ""
                          }
                        >
                          <TableCell>
                            <div className="text-sm">
                              {new Date(
                                transaction.created_at
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(
                                transaction.created_at
                              ).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {transaction.parties?.name ||
                                `Party ${transaction.party_id}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {transaction.inventory_items?.paper_type_name}
                              {transaction.gsm && (
                                <div className="text-sm text-gray-500">
                                  {transaction.gsm} GSM
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col gap-1">
                              {transaction.transaction_type === "in" ? (
                                <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                                  <Plus className="w-3 h-3 mr-1" />
                                  IN
                                </Badge>
                              ) : transaction.transaction_type === "out" ? (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  <Minus className="w-3 h-3 mr-1" />
                                  OUT
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <Calculator className="w-3 h-3 mr-1" />
                                  ADJ
                                </Badge>
                              )}
                              {transaction.is_deleted && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-red-600 border-red-200"
                                >
                                  DELETED
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {transaction.quantity} {transaction.unit_type}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span
                              className={
                                transaction.transaction_type === "out"
                                  ? "text-red-600"
                                  : "text-green-600"
                              }
                            >
                              {transaction.transaction_type === "out"
                                ? "-"
                                : "+"}
                              {Math.abs(
                                transaction.total_sheets
                              ).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {transaction.balance_after.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!transaction.is_deleted ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setSoftDeleteDialog({
                                        transactionId: transaction.id,
                                        transactionName: `${transaction.parties?.name || `Party ${transaction.party_id}`} - ${transaction.transaction_type.toUpperCase()} ${transaction.quantity} ${transaction.unit_type}`,
                                      })
                                    }
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Transaction
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Already Deleted
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Inventory Data</DialogTitle>
              <DialogDescription>
                Upload a CSV file to import inventory data. The file should have
                columns: Party Name, Paper Type, GSM, Quantity, Unit Type, Unit
                Size.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvFile">Select CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>
              {importFile && (
                <Alert>
                  <AlertDescription>
                    Selected file: {importFile.name} (
                    {(importFile.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // TODO: Implement CSV import functionality
                  setMessage({
                    type: "success",
                    text: "Import functionality coming soon!",
                  });
                  setShowImportDialog(false);
                  setImportFile(null);
                }}
                disabled={!importFile}
              >
                Import Data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Party Dialog */}
        <Dialog open={showNewPartyDialog} onOpenChange={setShowNewPartyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Party</DialogTitle>
              <DialogDescription>
                Create a new party account for inventory management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-party-name">Party Name</Label>
                <Input
                  id="new-party-name"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Enter party name"
                />
              </div>
              <div>
                <Label htmlFor="new-party-balance">Initial Balance</Label>
                <Input
                  id="new-party-balance"
                  type="number"
                  step="0.01"
                  value={newPartyBalance}
                  onChange={(e) => setNewPartyBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNewPartyDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddNewParty}>Add Party</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Paper Type Dialog */}
        <Dialog
          open={showNewPaperTypeDialog}
          onOpenChange={setShowNewPaperTypeDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Paper Type</DialogTitle>
              <DialogDescription>
                Create a new paper type for inventory management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-paper-type-name">Paper Type Name</Label>
                <Input
                  id="new-paper-type-name"
                  value={newPaperType.name}
                  onChange={(e) =>
                    setNewPaperType({ ...newPaperType, name: e.target.value })
                  }
                  placeholder="Enter paper type name (e.g., PREMIUM ART, MATTE FINISH)"
                />
              </div>
              <div>
                <Label htmlFor="new-paper-type-gsm">
                  Default GSM (Optional)
                </Label>
                <Input
                  id="new-paper-type-gsm"
                  type="number"
                  value={newPaperType.gsm}
                  onChange={(e) =>
                    setNewPaperType({ ...newPaperType, gsm: e.target.value })
                  }
                  placeholder="Enter default GSM (e.g., 250)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is just a default reference. You can still specify
                  different GSM values when using this paper type.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNewPaperTypeDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddNewPaperType}>Add Paper Type</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmation !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmation(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete{" "}
                {deleteConfirmation?.type === "item"
                  ? "Inventory Item"
                  : "Transaction"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this {deleteConfirmation?.type}?
                <br />
                <strong>{deleteConfirmation?.name}</strong>
                <br />
                {deleteConfirmation?.type === "item"
                  ? "This will permanently delete the inventory item and all its transaction history. This action cannot be undone."
                  : "This will permanently delete this transaction from the history. This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Soft Delete Dialog */}
        <Dialog
          open={softDeleteDialog !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSoftDeleteDialog(null);
              setDeletionReason("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Transaction</DialogTitle>
              <DialogDescription>
                You are about to delete this transaction:
                <br />
                <strong>{softDeleteDialog?.transactionName}</strong>
                <br />
                <br />
                This transaction will be marked as deleted but preserved for
                audit purposes. Inventory balances will be recalculated
                automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deletionReason">Reason for deletion *</Label>
                <Textarea
                  id="deletionReason"
                  placeholder="Please provide a reason for deleting this transaction..."
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSoftDeleteDialog(null);
                  setDeletionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSoftDeleteConfirm}
                disabled={!deletionReason.trim() || submitLoading}
              >
                {submitLoading ? "Deleting..." : "Delete Transaction"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
