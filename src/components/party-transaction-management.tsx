"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  CreditCard,
  ShoppingCart,
  Settings,
  Filter,
  Search,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Trash2,
} from "lucide-react";

interface Party {
  id: number;
  name: string;
  balance: number;
  phone?: string;
  email?: string;
}

interface Transaction {
  id: number;
  party_id: number;
  party_name: string;
  type: "payment" | "order" | "adjustment";
  amount: number;
  description: string;
  balance_after: number;
  created_at: string;
  created_by?: string;
  // Soft delete fields
  is_deleted?: boolean;
  deleted_at?: string | null;
  deletion_reason?: string | null;
  deleted_by?: string | null;
}

interface TransactionFormData {
  party_id: number;
  type: "payment" | "order" | "adjustment";
  amount: string;
  description: string;
}

export function PartyTransactionManagement() {
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  // Form states
  const [formData, setFormData] = useState<TransactionFormData>({
    party_id: 0,
    type: "payment",
    amount: "",
    description: "",
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterParty, setFilterParty] = useState<string>("all");

  // Soft delete dialog states
  const [softDeleteId, setSoftDeleteId] = useState<number | null>(null);
  const [deletionReason, setDeletionReason] = useState("");

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType && filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    if (filterParty && filterParty !== "all") {
      filtered = filtered.filter((t) => t.party_id.toString() === filterParty);
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filterType, filterParty]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [partiesRes, transactionsRes] = await Promise.all([
        fetch("/api/parties"),
        fetch("/api/parties/transactions"),
      ]);

      if (!partiesRes.ok || !transactionsRes.ok) {
        throw new Error("Failed to load data");
      }

      const partiesData = await partiesRes.json();
      const transactionsData = await transactionsRes.json();

      setParties(partiesData);
      setTransactions(transactionsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransaction = async () => {
    try {
      if (!formData.party_id || !formData.amount || !formData.type) {
        setError("Please fill all required fields");
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError("Please enter a valid positive amount");
        return;
      }

      const response = await fetch("/api/parties/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_id: formData.party_id,
          type: formData.type,
          amount: amount,
          description: formData.description || `${formData.type} - ₹${amount}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create transaction");
      }

      // Reset form and reload data
      setFormData({
        party_id: 0,
        type: "payment",
        amount: "",
        description: "",
      });
      setShowTransactionDialog(false);
      setSelectedParty(null);
      await loadData();
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create transaction"
      );
    }
  };

  const openTransactionDialog = (
    party?: Party,
    type: "payment" | "order" | "adjustment" = "payment"
  ) => {
    if (party) {
      setSelectedParty(party);
      setFormData({
        party_id: party.id,
        type,
        amount: "",
        description: "",
      });
    } else {
      setSelectedParty(null);
      setFormData({
        party_id: 0,
        type,
        amount: "",
        description: "",
      });
    }
    setShowTransactionDialog(true);
  };

  const handleSoftDeleteTransaction = async (id: number, reason: string) => {
    try {
      if (!reason.trim()) {
        setError("Deletion reason is required");
        return;
      }

      const response = await fetch(`/api/transactions/${id}/soft-delete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deletion_reason: reason.trim(),
          deleted_by: "Admin", // You can make this dynamic based on current user
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete transaction");
      }

      // Update local state to mark as deleted
      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction.id === id
            ? {
                ...transaction,
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deletion_reason: reason.trim(),
                deleted_by: "Admin",
              }
            : transaction
        )
      );

      // Reset dialog state
      setSoftDeleteId(null);
      setDeletionReason("");
      setError(null);

      // Reload data to ensure consistency
      setTimeout(() => {
        loadData();
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete transaction"
      );
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <CreditCard className="w-4 h-4 text-green-600" />;
      case "order":
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case "adjustment":
        return <Settings className="w-4 h-4 text-orange-600" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600";
    if (balance < 0) return "text-red-600";
    return "text-gray-600";
  };

  // Calculate summary stats - exclude deleted transactions
  const activeTransactions = transactions.filter((t) => !t.is_deleted);

  const totalPayments = activeTransactions
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOrders = activeTransactions
    .filter((t) => t.type === "order")
    .reduce((sum, t) => sum + t.amount, 0);

  const orderCount = activeTransactions.filter(
    (t) => t.type === "order"
  ).length;
  const paymentCount = activeTransactions.filter(
    (t) => t.type === "payment"
  ).length;

  const totalBalance = parties.reduce((sum, p) => sum + p.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p
                  className={`text-2xl font-bold ${getBalanceColor(totalBalance)}`}
                >
                  ₹{Math.abs(totalBalance).toFixed(2)}
                </p>
              </div>
              {totalBalance >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Payments Received
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{totalPayments.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {paymentCount} payments
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orders Created</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{totalOrders.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {orderCount} orders
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold">
                  {activeTransactions.length}
                </p>
                <p className="text-xs text-muted-foreground">All activity</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-700"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Transaction Management
            </CardTitle>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => openTransactionDialog(undefined, "payment")}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CreditCard className="w-4 h-4" />
                Add Payment
              </Button>

              <Button
                onClick={() => openTransactionDialog(undefined, "order")}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCart className="w-4 h-4" />
                Create Order
              </Button>

              <Button
                onClick={() => openTransactionDialog()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </Button>

              <Button variant="outline" onClick={loadData}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type-filter">Transaction Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="payment">
                    Payments ({paymentCount})
                  </SelectItem>
                  <SelectItem value="order">Orders ({orderCount})</SelectItem>
                  <SelectItem value="adjustment">Adjustments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="party-filter">Party</Label>
              <Select value={filterParty} onValueChange={setFilterParty}>
                <SelectTrigger>
                  <SelectValue placeholder="All parties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  {parties.map((party) => (
                    <SelectItem key={party.id} value={party.id.toString()}>
                      {party.name} (₹{party.balance.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterParty("all");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Quick Stats Row */}
          {(filterType !== "all" || filterParty !== "all" || searchTerm) && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Filtered Results
                </p>
                <p className="text-xl font-bold">
                  {filteredTransactions.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold text-blue-600">
                  ₹
                  {filteredTransactions
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Date Range</p>
                <p className="text-sm">
                  {filteredTransactions.length > 0
                    ? `${new Date(Math.min(...filteredTransactions.map((t) => new Date(t.created_at).getTime()))).toLocaleDateString()} - ${new Date(Math.max(...filteredTransactions.map((t) => new Date(t.created_at).getTime()))).toLocaleDateString()}`
                    : "No data"}
                </p>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className={`${
                        transaction.is_deleted
                          ? "bg-red-50 hover:bg-red-100 opacity-75"
                          : ""
                      }`}
                    >
                      <TableCell className="text-sm">
                        <div>
                          {new Date(
                            transaction.created_at
                          ).toLocaleDateString()}
                          {transaction.is_deleted && (
                            <Badge
                              variant="destructive"
                              className="ml-2 text-xs"
                            >
                              DELETED
                            </Badge>
                          )}
                        </div>
                        {transaction.is_deleted &&
                          transaction.deletion_reason && (
                            <div className="text-xs text-red-600 mt-1">
                              Reason: {transaction.deletion_reason}
                            </div>
                          )}
                      </TableCell>
                      <TableCell
                        className={`font-medium ${
                          transaction.is_deleted ? "text-red-600" : ""
                        }`}
                      >
                        {transaction.party_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <Badge
                            variant={
                              transaction.type === "payment"
                                ? "default"
                                : transaction.type === "order"
                                  ? "secondary"
                                  : "outline"
                            }
                            className={
                              transaction.is_deleted ? "opacity-60" : ""
                            }
                          >
                            {transaction.type.charAt(0).toUpperCase() +
                              transaction.type.slice(1)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell
                        className={transaction.is_deleted ? "text-red-600" : ""}
                      >
                        {transaction.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            transaction.is_deleted
                              ? "text-red-400 line-through"
                              : transaction.type === "payment"
                                ? "text-green-600"
                                : transaction.type === "order"
                                  ? "text-red-600"
                                  : "text-orange-600"
                          }
                        >
                          {transaction.type === "payment"
                            ? "+"
                            : transaction.type === "order"
                              ? "-"
                              : "±"}
                          ₹{transaction.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          transaction.is_deleted
                            ? "text-red-400"
                            : getBalanceColor(transaction.balance_after)
                        }`}
                      >
                        ₹{Math.abs(transaction.balance_after).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!transaction.is_deleted && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const party = parties.find(
                                    (p) => p.id === transaction.party_id
                                  );
                                  if (party)
                                    openTransactionDialog(party, "payment");
                                }}
                              >
                                <CreditCard className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const party = parties.find(
                                    (p) => p.id === transaction.party_id
                                  );
                                  if (party)
                                    openTransactionDialog(party, "order");
                                }}
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSoftDeleteId(transaction.id)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {transaction.is_deleted && (
                            <Badge variant="outline" className="text-red-600">
                              Deleted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Dialog - Enhanced for better UX */}
      <Dialog
        open={showTransactionDialog}
        onOpenChange={setShowTransactionDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formData.type === "payment" ? (
                <CreditCard className="w-5 h-5 text-green-600" />
              ) : formData.type === "order" ? (
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              ) : (
                <Settings className="w-5 h-5 text-orange-600" />
              )}
              Add New{" "}
              {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
            </DialogTitle>
            <DialogDescription>
              {selectedParty
                ? `Add a ${formData.type} for ${selectedParty.name}`
                : `Create a new ${formData.type} transaction`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedParty && (
              <div>
                <Label htmlFor="party">Select Party</Label>
                <Select
                  value={formData.party_id.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, party_id: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a party" />
                  </SelectTrigger>
                  <SelectContent>
                    {parties.map((party) => (
                      <SelectItem key={party.id} value={party.id.toString()}>
                        <div className="flex justify-between w-full">
                          <span>{party.name}</span>
                          <span
                            className={`ml-4 text-xs ${getBalanceColor(party.balance)}`}
                          >
                            ₹{Math.abs(party.balance).toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedParty && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{selectedParty.name}</p>
                <p
                  className={`text-sm ${getBalanceColor(selectedParty.balance)}`}
                >
                  Current Balance: ₹{Math.abs(selectedParty.balance).toFixed(2)}
                  {selectedParty.balance > 0
                    ? " (They owe you)"
                    : selectedParty.balance < 0
                      ? " (You owe them)"
                      : " (Settled)"}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="transaction-type">Transaction Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "payment" | "order" | "adjustment") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-green-600" />
                      Payment (Money Received)
                    </div>
                  </SelectItem>
                  <SelectItem value="order">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      Order (Money Owed)
                    </div>
                  </SelectItem>
                  <SelectItem value="adjustment">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-orange-600" />
                      Balance Adjustment
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="text-lg"
              />
              {formData.amount && selectedParty && (
                <p className="text-xs text-muted-foreground mt-1">
                  New balance will be: ₹
                  {(
                    selectedParty.balance +
                    (formData.type === "payment"
                      ? parseFloat(formData.amount)
                      : formData.type === "order"
                        ? -parseFloat(formData.amount)
                        : parseFloat(formData.amount))
                  ).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder={`Describe this ${formData.type}...`}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTransactionDialog(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTransaction}
              className={
                formData.type === "payment"
                  ? "bg-green-600 hover:bg-green-700"
                  : formData.type === "order"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-orange-600 hover:bg-orange-700"
              }
              disabled={!formData.party_id || !formData.amount}
            >
              Add{" "}
              {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft Delete Confirmation Dialog */}
      <Dialog
        open={softDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSoftDeleteId(null);
            setDeletionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-orange-600" />
              Delete Transaction
            </DialogTitle>
            <DialogDescription>
              This will mark transaction #{softDeleteId} as deleted while
              keeping it visible for audit purposes. Please provide a reason for
              this deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="deletion-reason" className="text-sm font-medium">
              Deletion Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="deletion-reason"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="Enter reason for deletion..."
              className="mt-2"
              autoFocus
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSoftDeleteId(null);
                setDeletionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (softDeleteId && deletionReason.trim()) {
                  handleSoftDeleteTransaction(
                    softDeleteId,
                    deletionReason.trim()
                  );
                } else {
                  setError("Please provide a reason for deletion");
                }
              }}
              disabled={!deletionReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Mark as Deleted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
