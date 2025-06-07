"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/alert-dialog";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Lock,
  Search,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Eye,
  EyeOff,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  BarChart,
  Bar,
  Pie,
} from "recharts";
import { PartyTransactionManagement } from "@/components/party-transaction-management";

interface Party {
  id: number;
  name: string;
  balance: number;
  created_at: string;
  total_orders?: number;
  total_amount_paid?: number;
  last_transaction_date?: string;
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
  // Soft delete fields
  is_deleted?: boolean;
  deleted_at?: string | null;
  deletion_reason?: string | null;
  deleted_by?: string | null;
}

export default function PartiesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [deletePartyId, setDeletePartyId] = useState<number | null>(null);
  const [newPartyName, setNewPartyName] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"payment" | "order">(
    "payment"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Soft delete dialog states
  const [softDeleteId, setSoftDeleteId] = useState<number | null>(null);
  const [deletionReason, setDeletionReason] = useState("");

  const SECURE_PASSWORD =
    process.env.NEXT_PUBLIC_PARTIES_PASSWORD || "admin@123";

  console.log(
    "Environment variable loaded:",
    process.env.NEXT_PUBLIC_PARTIES_PASSWORD
  );
  console.log("SECURE_PASSWORD set to:", SECURE_PASSWORD);

  useEffect(() => {
    // Check if authentication is still valid (24 hours)
    if (typeof localStorage !== "undefined") {
      const authTime = localStorage.getItem("partiesAuthTime");
      const isAuth = localStorage.getItem("partiesAuth");

      if (isAuth === "true" && authTime) {
        const authTimestamp = parseInt(authTime);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (now - authTimestamp < twentyFourHours) {
          setIsAuthenticated(true);
          console.log("Valid authentication found, logged in automatically");
        } else {
          // Authentication expired, clear it
          localStorage.removeItem("partiesAuth");
          localStorage.removeItem("partiesAuthTime");
          console.log("Authentication expired, cleared");
        }
      }
    }

    // Debug environment variables
    console.log(
      "UseEffect - Environment variable:",
      process.env.NEXT_PUBLIC_PARTIES_PASSWORD
    );
    console.log("UseEffect - SECURE_PASSWORD:", SECURE_PASSWORD);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPartiesData();
    }
  }, [isAuthenticated]);

  const loadPartiesData = async () => {
    setIsLoading(true);
    try {
      const [partiesResponse, transactionsResponse] = await Promise.all([
        fetch("/api/parties"),
        fetch("/api/parties/transactions"),
      ]);

      if (partiesResponse.ok) {
        const partiesData = await partiesResponse.json();
        setParties(partiesData);
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Entered password:", password);
    console.log("Expected password:", SECURE_PASSWORD);
    console.log("Password match:", password === SECURE_PASSWORD);

    if (password === SECURE_PASSWORD) {
      setIsAuthenticated(true);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("partiesAuth", "true");
        localStorage.setItem("partiesAuthTime", Date.now().toString());
      }
      setError(null);
      setPassword(""); // Clear password field
    } else {
      setError("Incorrect password!");
    }
  };

  const handleAddParty = async () => {
    if (!newPartyName.trim()) {
      setError("Party name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPartyName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add party");
      }

      setShowAddDialog(false);
      setNewPartyName("");
      setError(null);
      await loadPartiesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add party");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateParty = async () => {
    if (!editingParty || !editingParty.name.trim()) {
      setError("Party name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/parties/${editingParty.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingParty.name.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update party");
      }

      setShowEditDialog(false);
      setEditingParty(null);
      setError(null);
      await loadPartiesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update party");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteParty = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/parties/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete party");
      }

      setDeletePartyId(null);
      setError(null);
      await loadPartiesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete party");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (
      !selectedParty ||
      !transactionAmount ||
      parseFloat(transactionAmount) <= 0
    ) {
      setError("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/parties/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_id: selectedParty.id,
          type: transactionType,
          amount: parseFloat(transactionAmount),
          description:
            transactionDescription || `${transactionType} transaction`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add transaction");
      }

      setShowTransactionDialog(false);
      setSelectedParty(null);
      setTransactionAmount("");
      setTransactionDescription("");
      setError(null);
      await loadPartiesData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add transaction"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("partiesAuth");
      localStorage.removeItem("partiesAuthTime");
    }
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
          deleted_by: "Admin",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete transaction");
      }

      // Update local state
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
        loadPartiesData();
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete transaction"
      );
    }
  };

  const filteredParties = parties.filter((party) =>
    party.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-success";
    if (balance < 0) return "text-destructive";
    return "text-gray-600";
  };

  const getBalanceVariant = (balance: number) => {
    if (balance > 0) return "default";
    if (balance < 0) return "destructive";
    return "secondary";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function for transaction filtering
  const filteredTransactions = transactions
    .filter((transaction) => {
      if (searchTerm) {
        return (
          transaction.party_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          transaction.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          transaction.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  // Transaction analytics
  const activeTransactions = transactions.filter((t) => !t.is_deleted);

  const transactionStats = {
    totalTransactions: activeTransactions.length,
    totalPayments: activeTransactions
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + t.amount, 0),
    totalOrders: activeTransactions
      .filter((t) => t.type === "order")
      .reduce((sum, t) => sum + t.amount, 0),
    recentTransactions: activeTransactions.slice(0, 10),
    monthlyTransactions: activeTransactions.filter((t) => {
      const transactionDate = new Date(t.created_at);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    }).length,
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <Receipt className="w-4 h-4 text-success" />;
      case "order":
        return <CreditCard className="w-4 h-4 text-primary" />;
      case "adjustment":
        return <Edit className="w-4 h-4 text-warning" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "payment":
        return "text-success";
      case "order":
        return "text-primary";
      case "adjustment":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mt-16 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Party Management
            </h1>
            <p className="text-gray-600">
              Secure access to customer account management
            </p>
          </div>

          {/* Authentication Card */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4 mx-auto">
                <Lock className="w-5 h-5 text-gray-700" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Secure Access
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Enter your credentials to continue
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg transition-colors"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <Lock className="w-2 h-2 text-white" />
                      </div>
                      <span className="text-sm text-red-700 font-medium">
                        {error}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Access Management System
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Features Section */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">
                Customer Management
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">
                Transaction History
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <IndianRupee className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-xs text-gray-600 font-medium">
                Financial Analytics
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Secure Access
                </h4>
                <p className="text-xs text-gray-600">
                  Protected by enterprise-level security protocols
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col mt-6 gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Party Management
          </h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Logout
          </Button>
        </div>
        <p className="text-muted-foreground">
          Manage customer accounts, balances, and transaction history.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Lock className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Parties
                </p>
                <p className="text-2xl font-bold">{parties.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Balance
                </p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(
                    parties.reduce((sum, party) => sum + party.balance, 0)
                  )}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Positive Balances
                </p>
                <p className="text-2xl font-bold text-success">
                  {parties.filter((p) => p.balance > 0).length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Negative Balances
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {parties.filter((p) => p.balance < 0).length}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Parties
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        {/* Parties Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Parties</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search parties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Party
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredParties.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">
                    {parties.length === 0
                      ? "No parties found"
                      : "No parties match your search"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {parties.length === 0
                      ? "Add your first party to get started"
                      : "Try a different search term"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParties.map((party) => (
                      <TableRow key={party.id}>
                        <TableCell className="font-medium">
                          {party.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBalanceVariant(party.balance)}>
                            {formatCurrency(party.balance)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(party.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedParty(party);
                                setShowTransactionDialog(true);
                              }}
                            >
                              <CreditCard className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingParty(party);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletePartyId(party.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="transactions">
          <div className="space-y-6">
            {/* Transaction Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Transactions
                      </p>
                      <p className="text-2xl font-bold">
                        {transactionStats.totalTransactions}
                      </p>
                    </div>
                    <Receipt className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Payments
                      </p>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(transactionStats.totalPayments)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Orders
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(transactionStats.totalOrders)}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        This Month
                      </p>
                      <p className="text-2xl font-bold">
                        {transactionStats.monthlyTransactions}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-warning" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transaction History Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transaction History</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">
                      {transactions.length === 0
                        ? "No transactions found"
                        : "No transactions match your search"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transactions.length === 0
                        ? "Add transactions through party management"
                        : "Try a different search term"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Balance After</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          className={`${
                            transaction.is_deleted
                              ? "bg-red-50 hover:bg-red-100 opacity-75"
                              : ""
                          }`}
                        >
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
                                className={`${
                                  transaction.type === "payment"
                                    ? "bg-success/10 text-success border-success/20 hover:bg-success/20"
                                    : transaction.type === "order"
                                      ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                      : "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                                } ${transaction.is_deleted ? "opacity-60" : ""}`}
                              >
                                {transaction.type.charAt(0).toUpperCase() +
                                  transaction.type.slice(1)}
                              </Badge>
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
                            <span
                              className={
                                transaction.is_deleted
                                  ? "text-red-400 line-through"
                                  : transaction.type === "payment"
                                    ? "text-success font-semibold"
                                    : transaction.type === "order"
                                      ? "text-primary font-semibold"
                                      : "font-semibold"
                              }
                            >
                              {transaction.type === "payment" ? "+" : "-"}
                              {formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-muted-foreground ${
                              transaction.is_deleted ? "text-red-600" : ""
                            }`}
                          >
                            {transaction.description || "No description"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getBalanceVariant(
                                transaction.balance_after
                              )}
                              className={
                                transaction.is_deleted ? "opacity-60" : ""
                              }
                            >
                              {formatCurrency(transaction.balance_after)}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-muted-foreground ${
                              transaction.is_deleted ? "text-red-600" : ""
                            }`}
                          >
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {!transaction.is_deleted ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSoftDeleteId(transaction.id)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-red-600">
                                Deleted
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Party Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Party</DialogTitle>
            <DialogDescription>Create a new party account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="party-name">Party Name</Label>
              <Input
                id="party-name"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="Enter party name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddParty} disabled={isLoading}>
              Add Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Party Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Party</DialogTitle>
            <DialogDescription>Update party information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-party-name">Party Name</Label>
              <Input
                id="edit-party-name"
                value={editingParty?.name || ""}
                onChange={(e) =>
                  setEditingParty(
                    editingParty
                      ? { ...editingParty, name: e.target.value }
                      : null
                  )
                }
                placeholder="Enter party name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateParty} disabled={isLoading}>
              Update Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog
        open={showTransactionDialog}
        onOpenChange={setShowTransactionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a payment or order transaction for {selectedParty?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Transaction Type</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={
                    transactionType === "payment" ? "default" : "outline"
                  }
                  onClick={() => setTransactionType("payment")}
                  className="flex-1"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Payment
                </Button>
                <Button
                  variant={transactionType === "order" ? "default" : "outline"}
                  onClick={() => setTransactionType("order")}
                  className="flex-1"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Order
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTransactionDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTransaction} disabled={isLoading}>
              Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletePartyId !== null}
        onOpenChange={() => setDeletePartyId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              party and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePartyId && handleDeleteParty(deletePartyId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
