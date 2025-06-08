"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Building2,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  DollarSign,
  Target,
  Home,
  AlertCircle,
} from "lucide-react";
import Loading from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";

interface Party {
  id: number;
  name: string;
  balance: number;
  created_at: string;
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
  is_deleted?: boolean;
}

interface DashboardStats {
  totalParties: number;
  totalBalance: number;
  totalPayments: number;
  totalOrders: number;
  activeParties: number;
  avgBalance: number;
  monthlyGrowth: number;
  transactionVolume: number;
}

export default function PartiesPage() {
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
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(
    null
  );
  const [transactionPassword, setTransactionPassword] = useState("");
  const [deletionType, setDeletionType] = useState<"soft" | "hard">("soft");
  const [newPartyName, setNewPartyName] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"payment" | "order">(
    "payment"
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "online" | "offline" | "slow"
  >("online");
  const [loading, setLoading] = useState(false);

  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats>({
    totalParties: 0,
    totalBalance: 0,
    totalPayments: 0,
    totalOrders: 0,
    activeParties: 0,
    avgBalance: 0,
    monthlyGrowth: 0,
    transactionVolume: 0,
  });

  const SECURE_PASSWORD =
    process.env.NEXT_PUBLIC_PARTIES_PASSWORD || "admin@123";

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const authTime = localStorage.getItem("partiesAuthTime");
      const isAuth = localStorage.getItem("partiesAuth");

      if (isAuth === "true" && authTime) {
        const authTimestamp = parseInt(authTime);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (now - authTimestamp < twentyFourHours) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("partiesAuth");
          localStorage.removeItem("partiesAuthTime");
        }
      }
    }
  }, []);

  const loadPartiesData = useCallback(async (forceRefresh = false) => {
    try {
      setConnectionStatus("online");
      setLoading(true);

      const [partiesResponse, transactionsResponse] = await Promise.all([
        fetch("/api/parties", { cache: forceRefresh ? "no-cache" : "default" }),
        fetch("/api/parties/transactions", {
          cache: forceRefresh ? "no-cache" : "default",
        }),
      ]);

      if (partiesResponse.ok && transactionsResponse.ok) {
        const [partiesData, transactionsData] = await Promise.all([
          partiesResponse.json(),
          transactionsResponse.json(),
        ]);

        setParties(partiesData);
        setTransactions(transactionsData);

        // Calculate stats
        calculateDashboardStats(partiesData, transactionsData);

        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error("Failed to fetch data");
      }
    } catch (err) {
      setConnectionStatus("offline");
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPartiesData();

      // Auto-refresh every 3 minutes (reduced frequency)
      const interval = setInterval(() => {
        loadPartiesData(true);
      }, 180000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadPartiesData]);

  const calculateDashboardStats = useCallback(
    (partiesData: Party[], transactionsData: Transaction[]) => {
      // Filter out soft-deleted transactions (those with [DELETED] in description)
      const activeTransactions = transactionsData.filter(
        (t) => !t.description?.includes("[DELETED]")
      );

      const totalBalance = partiesData.reduce(
        (sum, party) => sum + (party.balance || 0),
        0
      );
      const totalPayments = activeTransactions
        .filter((t) => t.type === "payment")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalOrders = activeTransactions
        .filter((t) => t.type === "order")
        .reduce((sum, t) => sum + t.amount, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTransactions = activeTransactions.filter(
        (t) => new Date(t.created_at) >= thirtyDaysAgo
      );
      const activePartyIds = new Set(recentTransactions.map((t) => t.party_id));
      const activeParties = activePartyIds.size;

      // Calculate current month and last month properly
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(currentMonthStart.getTime() - 1);

      const thisMonthTransactions = activeTransactions.filter(
        (t) => new Date(t.created_at) >= currentMonthStart
      );

      const lastMonthTransactions = activeTransactions.filter((t) => {
        const transDate = new Date(t.created_at);
        return transDate >= lastMonthStart && transDate <= lastMonthEnd;
      });

      const thisMonthRevenue = thisMonthTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      const lastMonthRevenue = lastMonthTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );

      const monthlyGrowth =
        lastMonthRevenue > 0
          ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

      setStats({
        totalParties: partiesData.length,
        totalBalance,
        totalPayments,
        totalOrders,
        activeParties,
        avgBalance:
          partiesData.length > 0 ? totalBalance / partiesData.length : 0,
        monthlyGrowth,
        transactionVolume: activeTransactions.length,
      });
    },
    []
  );

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const handleRefresh = useCallback(() => {
    loadPartiesData(true);
  }, [loadPartiesData]);

  const filteredParties = useMemo(() => {
    return parties.filter((party) =>
      party.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parties, searchTerm]);

  const recentTransactions = useMemo(() => {
    return transactions
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10);
  }, [transactions]);

  const allTransactions = useMemo(() => {
    const currentPartyIds = new Set(parties.map((p) => p.id));
    return transactions
      .map((t) => ({
        ...t,
        party_deleted: !currentPartyIds.has(t.party_id),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 20);
  }, [transactions, parties]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SECURE_PASSWORD) {
      setIsAuthenticated(true);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("partiesAuth", "true");
        localStorage.setItem("partiesAuthTime", Date.now().toString());
      }
      setPassword("");
      setError(null);
    } else {
      setError("Invalid password");
    }
  };

  const handleAddParty = async () => {
    if (!newPartyName.trim()) {
      setError("Party name is required");
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleUpdateParty = async () => {
    if (!editingParty || !editingParty.name.trim()) {
      setError("Party name cannot be empty");
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleDeleteParty = async (id: number) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    // Validate password first
    if (!transactionPassword.trim()) {
      setError("Please enter the secure password");
      return;
    }

    if (transactionPassword !== SECURE_PASSWORD) {
      setError("Invalid password. Please try again.");
      return;
    }

    if (!deleteTransactionId) {
      setError("No transaction selected for deletion");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;

      if (deletionType === "hard") {
        // Hard delete - permanently remove
        response = await fetch(`/api/transactions/${deleteTransactionId}`, {
          method: "DELETE",
        });
      } else {
        // Soft delete - mark as deleted with description
        const currentTransaction = transactions.find(
          (t) => t.id === deleteTransactionId
        );
        const originalDescription =
          currentTransaction?.description || "Transaction";

        // Check if already soft deleted
        if (originalDescription.includes("[DELETED]")) {
          setError(
            "This transaction is already soft deleted. Use hard delete to permanently remove it."
          );
          setLoading(false);
          return;
        }

        response = await fetch(`/api/transactions/${deleteTransactionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: `[DELETED] ${new Date().toLocaleDateString()} - ${originalDescription}`,
            soft_delete: true,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete transaction");
      }

      // Success - reset form and refresh data
      setDeleteTransactionId(null);
      setTransactionPassword("");
      setDeletionType("soft");
      setError(null);

      // Add a small delay to ensure database changes are committed
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadPartiesData(true); // Force refresh
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete transaction"
      );
    } finally {
      setLoading(false);
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

    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("partiesAuth");
      localStorage.removeItem("partiesAuthTime");
    }
  };

  const getBalanceVariant = (balance: number) => {
    if (balance > 0) return "default";
    if (balance < 0) return "destructive";
    return "secondary";
  };

  if (!isAuthenticated) {
    return (
      <div className="mt-16 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
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
        </div>
      </div>
    );
  }

  // Show loading screen when initially loading data
  if (isAuthenticated && parties.length === 0 && !error && loading) {
    return (
      <Loading message="Loading Party Management..." size="lg" fullScreen />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-2 max-w-7xl">
        {/* Header Section */}
        <PageHeader
          title="Party Management"
          description="Comprehensive customer account and transaction management"
          icon={Users}
          iconColor="text-purple-600"
          lastUpdated={lastUpdated || undefined}
        >
          {/* Connection Status & Actions */}
          <div className="flex items-center gap-2">
            {connectionStatus === "online" ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : connectionStatus === "slow" ? (
              <Activity className="w-4 h-4 text-yellow-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span
              className={`text-sm font-medium ${
                connectionStatus === "online"
                  ? "text-green-600"
                  : connectionStatus === "slow"
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {connectionStatus === "online"
                ? "Online"
                : connectionStatus === "slow"
                  ? "Slow Connection"
                  : "Offline"}
            </span>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Party
            </Button>
            <Link href="/">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Lock className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </PageHeader>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Parties
              </CardTitle>
              <Users className="h-4 w-4 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParties}</div>
              <p className="text-xs text-blue-100">
                {stats.activeParties} active this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">
                Total Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalBalance)}
              </div>
              <p className="text-xs text-green-100">
                Avg: {formatCurrency(stats.avgBalance)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">
                Total Payments
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalPayments)}
              </div>
              <p className="text-xs text-purple-100">
                {stats.transactionVolume} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">
                Monthly Growth
              </CardTitle>
              <Target className="h-4 w-4 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.monthlyGrowth > 0 ? "+" : ""}
                {stats.monthlyGrowth.toFixed(1)}%
              </div>
              <p className="text-xs text-orange-100">vs last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search parties by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg border-gray-200 focus:border-blue-500"
                />
              </div>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Party
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 h-10"
            >
              <Users className="w-4 h-4" />
              Parties ({filteredParties.length})
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2 h-10"
            >
              <Receipt className="w-4 h-4" />
              Transaction History ({recentTransactions.length})
            </TabsTrigger>
          </TabsList>

          {/* Parties Tab */}
          <TabsContent value="overview">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Party Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredParties.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">
                            Party Name
                          </TableHead>
                          <TableHead className="font-semibold">
                            Balance
                          </TableHead>
                          <TableHead className="font-semibold">
                            Status
                          </TableHead>
                          <TableHead className="font-semibold">
                            Created
                          </TableHead>
                          <TableHead className="font-semibold text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredParties.map((party) => (
                          <TableRow key={party.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {party.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {party.id}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-lg">
                                {formatCurrency(party.balance)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getBalanceVariant(party.balance)}
                                className="font-medium"
                              >
                                {party.balance > 0
                                  ? "Credit"
                                  : party.balance < 0
                                    ? "Debit"
                                    : "Balanced"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {new Date(
                                  party.created_at
                                ).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedParty(party);
                                    setShowTransactionDialog(true);
                                  }}
                                >
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  Transaction
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
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No parties found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm
                        ? "Try adjusting your search"
                        : "Get started by adding your first party"}
                    </p>
                    <Button
                      onClick={() => setShowAddDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Party
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {allTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              transaction.type === "payment"
                                ? "bg-green-100"
                                : transaction.type === "order"
                                  ? "bg-blue-100"
                                  : "bg-yellow-100"
                            }`}
                          >
                            {transaction.type === "payment" ? (
                              <TrendingUp className="w-6 h-6 text-green-600" />
                            ) : transaction.type === "order" ? (
                              <TrendingDown className="w-6 h-6 text-blue-600" />
                            ) : (
                              <Receipt className="w-6 h-6 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-semibold ${transaction.party_deleted ? "text-gray-500 line-through" : "text-gray-900"}`}
                              >
                                {transaction.party_name}
                                {transaction.party_deleted && " (Deleted)"}
                              </span>
                              <Badge
                                variant={
                                  transaction.type === "payment"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {transaction.type.toUpperCase()}
                              </Badge>
                            </div>
                            <div
                              className={`text-sm ${
                                transaction.description?.includes("[DELETED]")
                                  ? "text-red-500 line-through"
                                  : "text-gray-600"
                              }`}
                            >
                              {transaction.description
                                ?.replace("[DELETED]", "")
                                .trim() || "No description"}
                              {transaction.description?.includes(
                                "[DELETED]"
                              ) && (
                                <span className="text-red-600 font-medium ml-2">
                                  [DELETED]
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(
                                transaction.created_at
                              ).toLocaleDateString()}{" "}
                              •
                              {new Date(
                                transaction.created_at
                              ).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <div
                              className={`text-lg font-bold ${
                                transaction.description?.includes("[DELETED]")
                                  ? "text-red-500 line-through"
                                  : transaction.type === "payment"
                                    ? "text-green-600"
                                    : transaction.type === "order"
                                      ? "text-blue-600"
                                      : "text-yellow-600"
                              }`}
                            >
                              {transaction.type === "payment" ? "+" : "-"}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </div>
                            <div className="text-sm text-gray-500">
                              Balance:{" "}
                              {formatCurrency(transaction.balance_after)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeleteTransactionId(transaction.id);
                              // If transaction is soft deleted, default to hard delete
                              if (
                                transaction.description?.includes("[DELETED]")
                              ) {
                                setDeletionType("hard");
                              } else {
                                setDeletionType("soft");
                              }
                            }}
                            className={`${
                              transaction.description?.includes("[DELETED]")
                                ? "text-orange-600 border-orange-200 hover:bg-orange-50"
                                : "text-red-600 border-red-200 hover:bg-red-50"
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No transactions found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Transaction history will appear here when parties make
                      payments or orders
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error Recovery */}
        {(error || connectionStatus === "offline") && (
          <Card className="border-red-200 bg-red-50 mt-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">
                    Connection Issue
                  </h3>
                  <p className="text-red-700 text-sm">
                    {error ||
                      "Unable to connect to server. Please try refreshing."}
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
            <Button onClick={handleAddParty} disabled={loading}>
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
            <Button onClick={handleUpdateParty} disabled={loading}>
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
            <Button onClick={handleAddTransaction} disabled={loading}>
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

      {/* Delete Transaction Dialog */}
      <Dialog
        open={deleteTransactionId !== null}
        onOpenChange={() => {
          setDeleteTransactionId(null);
          setTransactionPassword("");
          setDeletionType("soft");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              {deleteTransactionId &&
              transactions
                .find((t) => t.id === deleteTransactionId)
                ?.description?.includes("[DELETED]")
                ? "This transaction is already soft deleted. You can permanently remove it with hard delete."
                : "Choose deletion type and enter the secure password to proceed."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Deletion Type</Label>
              <div className="grid grid-cols-1 gap-3 mt-2">
                {!(
                  deleteTransactionId &&
                  transactions
                    .find((t) => t.id === deleteTransactionId)
                    ?.description?.includes("[DELETED]")
                ) && (
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      deletionType === "soft"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => setDeletionType("soft")}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        checked={deletionType === "soft"}
                        onChange={() => setDeletionType("soft")}
                        className="text-blue-600 mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-sm">
                          Soft Delete (Recommended)
                        </div>
                        <div className="text-xs text-gray-600">
                          Mark as deleted but keep record. Shows as crossed out.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    deletionType === "hard"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => setDeletionType("hard")}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      checked={deletionType === "hard"}
                      onChange={() => setDeletionType("hard")}
                      className="text-red-600 mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-sm text-red-700">
                        Hard Delete (Permanent)
                      </div>
                      <div className="text-xs text-red-600">
                        Permanently remove from database. Cannot be undone.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="transaction-password">Secure Password</Label>
              <Input
                id="transaction-password"
                type="password"
                value={transactionPassword}
                onChange={(e) => setTransactionPassword(e.target.value)}
                placeholder="Enter secure password"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTransactionId(null);
                setTransactionPassword("");
                setDeletionType("soft");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTransaction}
              disabled={loading}
              className={`${
                deletionType === "hard"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-600 hover:bg-orange-700"
              } text-white disabled:opacity-50`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Deleting...
                </div>
              ) : deletionType === "hard" ? (
                "Permanently Delete"
              ) : (
                "Soft Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
