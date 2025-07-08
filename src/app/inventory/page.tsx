"use client";

import { useState, useEffect } from "react";
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
  Package,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
  Boxes,
  Calculator,
} from "lucide-react";
import {
  InventoryFormData,
  UNIT_OPTIONS,
  InventoryItem,
  InventoryTransaction,
} from "@/types/inventory";

interface Party {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface PaperType {
  id: number;
  name: string;
  gsm?: number;
}

export default function InventoryPage() {
  const [formData, setFormData] = useState<InventoryFormData>({
    party_id: 0,
    paper_type_id: 0,
    transaction_type: "in",
    quantity: 0,
    unit_type: "packets",
    unit_size: 100,
    unit_cost: 0,
    description: "",
  });

  const [parties, setParties] = useState<Party[]>([]);
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<
    InventoryTransaction[]
  >([]);
  const [currentStock, setCurrentStock] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Custom packet size for packets unit type
  const [customPacketSize, setCustomPacketSize] = useState(100);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [partiesRes, paperTypesRes, inventoryRes, transactionsRes] =
          await Promise.all([
            fetch("/api/parties"),
            fetch("/api/paper-types"),
            fetch("/api/inventory"),
            fetch("/api/inventory/transactions"),
          ]);

        const [partiesData, paperTypesData, inventoryData, transactionsData] =
          await Promise.all([
            partiesRes.json(),
            paperTypesRes.json(),
            inventoryRes.json(),
            transactionsRes.json(),
          ]);

        setParties(Array.isArray(partiesData) ? partiesData : []);
        setPaperTypes(Array.isArray(paperTypesData) ? paperTypesData : []);
        setInventoryItems(inventoryData.success ? inventoryData.data : []);
        setRecentTransactions(
          transactionsData.success ? transactionsData.data : []
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        setMessage({ type: "error", text: "Failed to load data" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update current stock when party and paper type change
  useEffect(() => {
    if (formData.party_id && formData.paper_type_id) {
      const stock = inventoryItems.find(
        (item) =>
          item.party_id === formData.party_id &&
          item.paper_type_id === formData.paper_type_id
      );
      setCurrentStock(stock || null);
    } else {
      setCurrentStock(null);
    }
  }, [formData.party_id, formData.paper_type_id, inventoryItems]);

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

  const calculateTotalSheets = () => {
    return formData.quantity * formData.unit_size;
  };

  const calculateTotalCost = () => {
    return calculateTotalSheets() * formData.unit_cost;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.party_id || !formData.paper_type_id || !formData.quantity) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    setSubmitLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: "Inventory updated successfully!",
        });

        // Reset form
        setFormData({
          party_id: 0,
          paper_type_id: 0,
          transaction_type: "in",
          quantity: 0,
          unit_type: "packets",
          unit_size: 100,
          unit_cost: 0,
          description: "",
        });

        // Refresh data
        const [inventoryRes, transactionsRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/inventory/transactions"),
        ]);

        const [inventoryData, transactionsData] = await Promise.all([
          inventoryRes.json(),
          transactionsRes.json(),
        ]);

        setInventoryItems(inventoryData.success ? inventoryData.data : []);
        setRecentTransactions(
          transactionsData.success ? transactionsData.data : []
        );
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
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Inventory Management
          </h1>
          <p className="text-lg text-gray-600">
            Manage paper stock and track inventory movements
          </p>
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

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="form" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Add Stock
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Boxes className="w-4 h-4" />
              Current Inventory
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2"
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
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Inventory Transaction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Party Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="party">Party Name *</Label>
                          <Select
                            value={formData.party_id.toString()}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                party_id: parseInt(value),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a party" />
                            </SelectTrigger>
                            <SelectContent>
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

                        {/* Paper Type Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="paperType">Paper Type *</Label>
                          <Select
                            value={formData.paper_type_id.toString()}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                paper_type_id: parseInt(value),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select paper type" />
                            </SelectTrigger>
                            <SelectContent>
                              {paperTypes.map((type) => (
                                <SelectItem
                                  key={type.id}
                                  value={type.id.toString()}
                                >
                                  {type.name} {type.gsm && `(${type.gsm} GSM)`}
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
                                  <div className="flex flex-col">
                                    <span>{option.label}</span>
                                    <span className="text-xs text-gray-500">
                                      {option.description}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Custom Packet Size (only for packets) */}
                        {formData.unit_type === "packets" && (
                          <div className="space-y-2">
                            <Label htmlFor="packetSize">
                              Packet Size (sheets) *
                            </Label>
                            <Input
                              type="number"
                              value={customPacketSize}
                              onChange={(e) =>
                                setCustomPacketSize(
                                  parseInt(e.target.value) || 100
                                )
                              }
                              min="50"
                              max="200"
                              placeholder="100-200 sheets per packet"
                            />
                          </div>
                        )}

                        {/* Quantity */}
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantity *</Label>
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

                        {/* Unit Cost */}
                        <div className="space-y-2">
                          <Label htmlFor="unitCost">
                            Unit Cost (per sheet)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.unit_cost}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                unit_cost: parseFloat(e.target.value) || 0,
                              }))
                            }
                            min="0"
                            placeholder="0.00"
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
                          <h3 className="font-semibold text-blue-900 mb-2">
                            Transaction Summary
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">
                                Total Sheets:
                              </span>
                              <span className="font-semibold ml-2">
                                {calculateTotalSheets().toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Total Cost:</span>
                              <span className="font-semibold ml-2">
                                {formatCurrency(calculateTotalCost())}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={submitLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
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
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Current Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {currentStock ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {currentStock.current_quantity.toLocaleString()}
                          </div>
                          <div className="text-gray-600">sheets available</div>
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
                            <span className="font-semibold text-green-600">
                              {currentStock.available_quantity.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Unit Cost:</span>
                            <span className="font-semibold">
                              {formatCurrency(currentStock.unit_cost)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Value:</span>
                            <span className="font-semibold">
                              {formatCurrency(
                                currentStock.current_quantity *
                                  currentStock.unit_cost
                              )}
                            </span>
                          </div>
                        </div>

                        {currentStock.current_quantity < 1000 && (
                          <Alert className="bg-orange-50 border-orange-200">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800">
                              Low stock warning! Consider restocking soon.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Select party and paper type to view current stock</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="shadow-lg">
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
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="w-5 h-5" />
                  Current Inventory ({inventoryItems.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Party</th>
                        <th className="text-left p-2">Paper Type</th>
                        <th className="text-right p-2">Current Stock</th>
                        <th className="text-right p-2">Available</th>
                        <th className="text-right p-2">Unit Cost</th>
                        <th className="text-right p-2">Total Value</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div className="font-medium">
                              {item.parties?.name || `Party ${item.party_id}`}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium">
                              {item.paper_type_name}
                            </div>
                            {item.paper_types?.gsm && (
                              <div className="text-sm text-gray-500">
                                {item.paper_types.gsm} GSM
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {item.current_quantity.toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-mono text-green-600">
                            {item.available_quantity.toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {formatCurrency(item.unit_cost)}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
                            {formatCurrency(
                              item.current_quantity * item.unit_cost
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {item.current_quantity < 1000 ? (
                              <Badge variant="destructive" className="text-xs">
                                Low Stock
                              </Badge>
                            ) : item.current_quantity < 5000 ? (
                              <Badge variant="secondary" className="text-xs">
                                Normal
                              </Badge>
                            ) : (
                              <Badge
                                variant="default"
                                className="text-xs bg-green-600"
                              >
                                Good Stock
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Transactions ({recentTransactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Party</th>
                        <th className="text-left p-2">Paper Type</th>
                        <th className="text-center p-2">Type</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Total Sheets</th>
                        <th className="text-right p-2">Cost</th>
                        <th className="text-right p-2">Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-2">
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
                          </td>
                          <td className="p-2">
                            <div className="font-medium">
                              {transaction.parties?.name ||
                                `Party ${transaction.party_id}`}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium">
                              {transaction.inventory_items?.paper_type_name}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {transaction.transaction_type === "in" ? (
                              <Badge className="bg-green-600 text-xs">
                                <Plus className="w-3 h-3 mr-1" />
                                IN
                              </Badge>
                            ) : transaction.transaction_type === "out" ? (
                              <Badge variant="destructive" className="text-xs">
                                <Minus className="w-3 h-3 mr-1" />
                                OUT
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <Calculator className="w-3 h-3 mr-1" />
                                ADJ
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {transaction.quantity} {transaction.unit_type}
                          </td>
                          <td className="p-2 text-right font-mono">
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
                          </td>
                          <td className="p-2 text-right font-mono">
                            {formatCurrency(transaction.total_cost)}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
                            {transaction.balance_after.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
