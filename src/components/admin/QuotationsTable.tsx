"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Printer,
  Eye,
  Edit,
  Mail,
  Phone,
  Building2,
  IndianRupee,
  Receipt,
  Target,
  Activity,
  ArrowUpDown,
  Zap,
  Trash2,
  X,
} from "lucide-react";

import { QuotationRequest, QuotationNote } from "@/types/database";

interface QuotationsTableProps {
  quotations: QuotationRequest[];
  notes: QuotationNote[];
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchTerm: string;
  updateQuotationStatus: (id: string, status: string) => Promise<void>;
  updateQuotationPrice: (id: string, price: number) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  generateInvoice: (id: string) => Promise<string>;
  deleteQuotation: (id: string) => Promise<void>;
  setSelectedQuotation: (quotation: QuotationRequest) => void;
}

export default function QuotationsTable({
  quotations,
  notes,
  statusFilter,
  setStatusFilter,
  searchTerm,
  updateQuotationStatus,
  updateQuotationPrice,
  addNote,
  generateInvoice,
  deleteQuotation,
  setSelectedQuotation,
}: QuotationsTableProps) {
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(
    null
  );
  const [deletePasscode, setDeletePasscode] = useState("");

  const formatDate = (
    dateString: string | null,
    options?: Intl.DateTimeFormatOptions
  ) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString(
      "en-US",
      options || {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: Clock,
      },
      "in-progress": {
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Activity,
      },
      completed: {
        color: "bg-green-50 text-green-700 border-green-200",
        icon: CheckCircle,
      },
      cancelled: {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: AlertCircle,
      },
    };
    const config =
      statusConfig[(status || "pending") as keyof typeof statusConfig] ||
      statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {(status || "pending").charAt(0).toUpperCase() +
          (status || "pending").slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string | null) => {
    const priorityConfig = {
      low: { color: "bg-gray-50 text-gray-600", icon: ArrowUpDown },
      normal: { color: "bg-blue-50 text-blue-600", icon: Target },
      high: { color: "bg-orange-50 text-orange-600", icon: Zap },
      urgent: { color: "bg-red-50 text-red-600", icon: AlertCircle },
    };
    const config =
      priorityConfig[(priority || "normal") as keyof typeof priorityConfig] ||
      priorityConfig.normal;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {(priority || "normal").charAt(0).toUpperCase() +
          (priority || "normal").slice(1)}
      </Badge>
    );
  };

  const filteredQuotations = quotations.filter((q) => {
    const matchesStatus =
      statusFilter === "all" || (q.status || "pending") === statusFilter;
    const matchesSearch =
      searchTerm === "" ||
      q.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStatusUpdate = async (quotationId: string, newStatus: string) => {
    try {
      await updateQuotationStatus(quotationId, newStatus);
    } catch (error) {
      alert("Failed to update status. Please try again.");
    }
  };

  const handlePriceUpdate = async (quotationId: string, price: string) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) {
      alert("Please enter a valid price");
      return;
    }

    try {
      await updateQuotationPrice(quotationId, numPrice);
      setEditingPrice(null);
      setNewPrice("");
    } catch (error) {
      alert("Failed to update price. Please try again.");
    }
  };

  const handleDeleteQuotation = async () => {
    if (deletePasscode === "54321" && quotationToDelete) {
      try {
        await deleteQuotation(quotationToDelete);
        setShowDeleteModal(false);
        setDeletePasscode("");
        setQuotationToDelete(null);
        alert("Quotation deleted successfully!");
      } catch (error) {
        alert("Failed to delete quotation. Please try again.");
      }
    } else {
      alert("Invalid passcode!");
    }
  };

  return (
    <>
      <Card className="border border-gray-100 bg-white">
        <CardHeader className="border-b border-gray-100 bg-gray-25 px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900">
                  Quotation Requests
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Manage all printing quotations
                </p>
              </div>
              <Badge className="bg-gray-100 text-gray-700 border-0">
                {filteredQuotations.length}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 border-gray-200 bg-white">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-gray-200"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                  <TableHead className="font-bold text-gray-800 px-6 py-4 text-left">
                    Client Info
                  </TableHead>
                  <TableHead className="font-bold text-gray-800 px-6 py-4 text-left">
                    Project
                  </TableHead>
                  <TableHead className="font-bold text-gray-800 px-6 py-4 text-left">
                    Specifications
                  </TableHead>
                  <TableHead className="font-bold text-gray-800 px-6 py-4 text-left">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-gray-800 px-6 py-4 text-left">
                    Priority
                  </TableHead>
                  <TableHead className="font-bold text-gray-800 px-6 py-4 text-left">
                    Price
                  </TableHead>
                  <TableHead className="font-bold text-gray-800 px-6 py-4 text-left">
                    Date
                  </TableHead>
                  <TableHead className="font-bold text-gray-800 px-6 py-4 text-left">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.length > 0 ? (
                  filteredQuotations.map((quotation) => (
                    <TableRow
                      key={quotation.id}
                      className="hover:bg-gray-50 border-b border-gray-100 transition-colors"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900">
                            {quotation.client_name}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {quotation.client_email}
                          </div>
                          {quotation.client_phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {quotation.client_phone}
                            </div>
                          )}
                          {quotation.company_name && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {quotation.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-900 mb-1">
                            {quotation.project_title}
                          </div>
                          {quotation.project_description && (
                            <div className="text-xs text-gray-500 line-clamp-2">
                              {quotation.project_description.substring(0, 50)}
                              ...
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            <Printer className="w-3 h-3 mr-1" />
                            {quotation.print_type}
                          </Badge>
                          <div className="text-xs text-gray-600">
                            {quotation.paper_size} • {quotation.color_type}
                          </div>
                          <div className="text-xs font-semibold text-gray-900">
                            {quotation.quantity.toLocaleString()} units
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        {getStatusBadge(quotation.status)}
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        {getPriorityBadge(quotation.priority)}
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        {editingPrice === quotation.id ? (
                          <div className="flex gap-1">
                            <div className="relative">
                              <IndianRupee className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500" />
                              <Input
                                type="number"
                                step="0.01"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="w-24 pl-6 text-xs h-8"
                                placeholder="0.00"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() =>
                                handlePriceUpdate(quotation.id, newPrice)
                              }
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-2"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPrice(null)}
                              className="h-8 px-2"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div>
                              <div className="flex items-center gap-1 font-semibold text-gray-900">
                                <IndianRupee className="w-3 h-3" />
                                <span className="text-sm">
                                  {quotation.final_price
                                    ? quotation.final_price.toLocaleString(
                                        "en-IN"
                                      )
                                    : quotation.estimated_price
                                      ? `~${quotation.estimated_price.toLocaleString("en-IN")}`
                                      : "TBD"}
                                </span>
                              </div>
                              {!quotation.final_price &&
                                quotation.estimated_price && (
                                  <span className="text-xs text-gray-500">
                                    Est.
                                  </span>
                                )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingPrice(quotation.id);
                                setNewPrice(
                                  quotation.final_price?.toString() ||
                                    quotation.estimated_price?.toString() ||
                                    ""
                                );
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {formatDate(quotation.created_at)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTime(quotation.created_at)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedQuotation(quotation)}
                            className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setQuotationToDelete(quotation.id);
                              setShowDeleteModal(true);
                            }}
                            className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:bg-red-25 hover:text-red-600 hover:border-red-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>

                          <Select
                            value={quotation.status || "pending"}
                            onValueChange={(value) =>
                              handleStatusUpdate(quotation.id, value)
                            }
                          >
                            <SelectTrigger className="w-24 h-8 text-xs border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">
                                In Progress
                              </SelectItem>
                              <SelectItem value="completed">
                                Completed
                              </SelectItem>
                              <SelectItem value="cancelled">
                                Cancelled
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 px-6">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <FileText className="w-12 h-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          No quotations found
                        </h3>
                        <p className="text-gray-400 mb-4">
                          {searchTerm || statusFilter !== "all"
                            ? "Try adjusting your search or filter criteria"
                            : "Quotations will appear here once submitted"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Delete Quotation
                </h2>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-gray-600 mb-4">
              Please enter the admin passcode to confirm deletion:
            </p>

            <Input
              type="password"
              placeholder="Enter passcode"
              value={deletePasscode}
              onChange={(e) => setDeletePasscode(e.target.value)}
              className="mb-4"
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePasscode("");
                  setQuotationToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteQuotation}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
