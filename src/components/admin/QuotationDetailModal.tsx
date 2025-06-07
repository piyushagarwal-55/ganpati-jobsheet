"use client";

import { useState, SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCircle,
  Mail,
  Phone,
  Building2,
  IndianRupee,
  Receipt,
  Calendar,
  Star,
  Target,
  Activity,
  ArrowUpDown,
  Zap,
  Printer,
  PieChart,
  MessageSquare,
  Send,
  FileDown,
  Download,
  X,
} from "lucide-react";

import { QuotationRequest, QuotationNote } from "@/types/database";

interface QuotationDetailModalProps {
  quotation: QuotationRequest;
  notes: QuotationNote[];
  onClose: () => void;
  updateQuotationPrice: (id: string, price: number) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  generateInvoice: (id: string) => Promise<string>;
}

export default function QuotationDetailModal({
    quotation,
    notes,
    onClose,
    updateQuotationPrice,
    addNote,
    generateInvoice,
}: QuotationDetailModalProps) {
    const [newNote, setNewNote] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

    const formatDate = (dateString: string | null, options?: Intl.DateTimeFormatOptions) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", options || {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
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
            pending: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
            "in-progress": { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Activity },
            completed: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
            cancelled: { color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
        };
        const config = statusConfig[(status || "pending") as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;
        return (
            <Badge className={`${config.color} border font-medium`}>
                <Icon className="w-3 h-3 mr-1" />
                {(status || "pending").charAt(0).toUpperCase() + (status || "pending").slice(1)}
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
        const config = priorityConfig[(priority || "normal") as keyof typeof priorityConfig] || priorityConfig.normal;
        const Icon = config.icon;
        return (
            <Badge className={`${config.color} border font-medium`}>
                <Icon className="w-3 h-3 mr-1" />
                {(priority || "normal").charAt(0).toUpperCase() + (priority || "normal").slice(1)}
            </Badge>
        );
    };

    const getQuotationNotes = (quotationId: string) => {
        return notes.filter((note) => note.quotation_id === quotationId);
    };

    const handlePriceUpdate = async (quotationId: string, price: string) => {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) {
            alert("Please enter a valid price");
            return;
        }

        try {
            await updateQuotationPrice(quotationId, numPrice);
            setNewPrice("");
        } catch (error) {
            alert("Failed to update price. Please try again.");
        }
    };

    const handleAddNote = async (quotationId: string) => {
        if (!newNote.trim()) return;

        try {
            await addNote(quotationId, newNote);
            setNewNote("");
        } catch (error) {
            alert("Failed to add note. Please try again.");
        }
    };

    const handleGenerateInvoice = async (quotationId: string) => {
        try {
            const invoiceNumber = await generateInvoice(quotationId);
            alert(`Invoice #${invoiceNumber} generated successfully!`);
        } catch (error) {
            alert("Failed to generate invoice. Please try again.");
        }
    };

    const handleDownloadInvoice = async (
        quotationId: SetStateAction<string | null>,
        invoiceNumber: string | null
    ) => {
        setDownloadingInvoice(quotationId);

        try {
            // Create invoice data
            const invoiceData = {
                invoiceNumber,
                date: new Date().toLocaleDateString("en-IN"),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN"),
                clientName: quotation.client_name,
                clientEmail: quotation.client_email,
                clientPhone: quotation.client_phone || "N/A",
                companyName: quotation.company_name || "N/A",
                projectTitle: quotation.project_title,
                projectDescription: quotation.project_description || "N/A",
                printType: quotation.print_type,
                paperType: quotation.paper_type,
                paperSize: quotation.paper_size,
                colorType: quotation.color_type,
                quantity: quotation.quantity,
                pages: quotation.pages || 1,
                bindingType: quotation.binding_type || "None",
                lamination: quotation.lamination || "None",
                finalPrice: quotation.final_price || 0,
                estimatedPrice: quotation.estimated_price || 0,
                createdAt: quotation.created_at
                    ? new Date(quotation.created_at).toLocaleDateString("en-IN")
                    : new Date().toLocaleDateString("en-IN"),
                priority: quotation.priority || "Normal",
            };

            // Calculate breakdown
            const unitPrice = invoiceData.finalPrice / invoiceData.quantity;
            const subtotal = invoiceData.finalPrice;
            const taxRate = 18; // 18% GST
            const taxAmount = (subtotal * taxRate) / 100;
            const totalAmount = subtotal + taxAmount;

            // Create simple invoice content for download
            const invoiceContent = `
INVOICE #${invoiceData.invoiceNumber}

Date: ${invoiceData.date}
Due Date: ${invoiceData.dueDate}

BILL TO:
${invoiceData.clientName}
${invoiceData.clientEmail}
${invoiceData.clientPhone}
${invoiceData.companyName !== "N/A" ? invoiceData.companyName : ""}

PROJECT DETAILS:
Project: ${invoiceData.projectTitle}
Description: ${invoiceData.projectDescription}
Print Type: ${invoiceData.printType}
Paper: ${invoiceData.paperType} - ${invoiceData.paperSize}
Color: ${invoiceData.colorType}
Quantity: ${invoiceData.quantity} units
Pages: ${invoiceData.pages}
Binding: ${invoiceData.bindingType}
Lamination: ${invoiceData.lamination}

PRICING:
Subtotal: ₹${subtotal.toLocaleString("en-IN")}
GST (${taxRate}%): ₹${taxAmount.toLocaleString("en-IN")}
Total Amount: ₹${totalAmount.toLocaleString("en-IN")}

Thank you for choosing GanpathiOverseas!`
            const blob = new Blob([invoiceContent], { type: "text/plain" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `GanpathiOverseas-Invoice-${invoiceNumber}-${new Date().toISOString().split("T")[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setTimeout(() => {
                setDownloadingInvoice(null);
                alert(`Invoice #${invoiceNumber} downloaded successfully!`);
            }, 800);
        } catch (error) {
            console.error("Download error:", error);
            setDownloadingInvoice(null);
            alert("Failed to generate invoice. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
                <div className="sticky top-0 bg-gray-900 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Quotation Details</h2>
                                <p className="text-gray-300">ID: {quotation.id.substring(0, 8)}</p>
                            </div>
                            <div className="flex gap-2">
                                {getStatusBadge(quotation.status)}
                                {getPriorityBadge(quotation.priority)}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-full p-2"
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Client Information */}
                        <Card className="border-gray-200">
                            <CardHeader className="bg-gray-50 rounded-t-lg">
                                <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                                    <UserCircle className="w-5 h-5" />
                                    Client Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            {quotation.client_name}
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Mail className="w-4 h-4" />
                                                <span>{quotation.client_email}</span>
                                            </div>
                                            {quotation.client_phone && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Phone className="w-4 h-4" />
                                                    <span>{quotation.client_phone}</span>
                                                </div>
                                            )}
                                            {quotation.company_name && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Building2 className="w-4 h-4" />
                                                    <span>{quotation.company_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Project Details */}
                        <Card className="border-gray-200">
                            <CardHeader className="bg-gray-50 rounded-t-lg">
                                <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                                    <FileText className="w-5 h-5" />
                                    Project Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            {quotation.project_title}
                                        </h3>
                                        {quotation.project_description && (
                                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                                                {quotation.project_description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <div className="flex items-center gap-2 text-gray-600 mb-1">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-sm font-medium">Created</span>
                                            </div>
                                            <p className="font-semibold text-gray-900">
                                                {formatDate(quotation.created_at)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatTime(quotation.created_at)}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <div className="flex items-center gap-2 text-gray-600 mb-1">
                                                <Star className="w-4 h-4" />
                                                <span className="text-sm font-medium">Priority</span>
                                            </div>
                                            {getPriorityBadge(quotation.priority)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Print Specifications */}
                    <Card className="mt-6 border-gray-200">
                        <CardHeader className="bg-gray-50 rounded-t-lg">
                            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                                <Printer className="w-5 h-5" />
                                Print Specifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "Print Type", value: quotation.print_type, icon: Printer },
                                    { label: "Paper Type", value: quotation.paper_type, icon: FileText },
                                    { label: "Paper Size", value: quotation.paper_size, icon: ArrowUpDown },
                                    { label: "Color Type", value: quotation.color_type, icon: PieChart },
                                    { label: "Quantity", value: `${quotation.quantity} units`, icon: Target },
                                    { label: "Pages", value: quotation.pages || 1, icon: FileText },
                                    { label: "Binding", value: quotation.binding_type || "None", icon: FileText },
                                    { label: "Lamination", value: quotation.lamination || "None", icon: FileText },
                                ].map((spec, index) => (
                                    <div
                                        key={index}
                                        className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                                            <spec.icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{spec.label}</span>
                                        </div>
                                        <p className="font-semibold text-gray-900 capitalize">
                                            {spec.value.toString().replace("-", " ")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing and Notes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        {/* Pricing */}
                        <Card className="border-gray-200">
                            <CardHeader className="bg-gray-50 rounded-t-lg">
                                <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                                    <IndianRupee className="w-5 h-5" />
                                    Pricing
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <span className="text-sm text-gray-600">Estimated Price</span>
                                        <p className="text-lg font-semibold flex items-center text-gray-900">
                                            <IndianRupee className="w-4 h-4 mr-1" />
                                            {quotation.estimated_price?.toLocaleString("en-IN") || "TBD"}
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <span className="text-sm text-gray-600 font-medium">Final Price</span>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xl font-bold flex items-center text-gray-900">
                                                <IndianRupee className="w-5 h-5 mr-1" />
                                                {quotation.final_price?.toLocaleString("en-IN") || "Not set"}
                                            </p>
                                            {!quotation.final_price && (
                                                <Badge variant="outline" className="border-gray-300 text-gray-600">
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <span className="text-sm text-gray-600 font-medium">Invoice Status</span>
                                        <div className="mt-1">
                                            {quotation.invoice_number ? (
                                                <Badge className="bg-gray-900 text-white">
                                                    #{quotation.invoice_number}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-gray-300 text-gray-600">
                                                    Not generated
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Price Update Section */}
                                {!quotation.final_price && (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                                className="pl-8 border-gray-300"
                                                placeholder="Enter final price"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => handlePriceUpdate(quotation.id, newPrice)}
                                            disabled={!newPrice.trim()}
                                            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Set Final Price
                                        </Button>
                                    </div>
                                )}

                                {/* Invoice Actions */}
                                {quotation.invoice_number ? (
                                    <div className="space-y-3 mt-4">
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <span className="text-sm font-medium text-green-800">
                                                    Invoice Generated
                                                </span>
                                            </div>
                                            <p className="text-sm text-green-700">
                                                Invoice #{quotation.invoice_number} is ready for download
                                            </p>
                                        </div>

                                        <Button
                                            onClick={() => handleDownloadInvoice(quotation.id, quotation.invoice_number)}
                                            disabled={downloadingInvoice === quotation.id}
                                            className="w-full bg-gray-900 hover:bg-gray-800 text-white transition-colors"
                                        >
                                            {downloadingInvoice === quotation.id ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Generating Download...
                                                </>
                                            ) : (
                                                <>
                                                    <FileDown className="w-4 h-4 mr-2" />
                                                    Download Invoice
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    quotation.final_price &&
                                    quotation.status === "completed" && (
                                        <Button
                                            onClick={() => handleGenerateInvoice(quotation.id)}
                                            className="w-full bg-gray-900 hover:bg-gray-800 text-white mt-4"
                                        >
                                            <Receipt className="w-4 h-4 mr-2" />
                                            Generate Invoice
                                        </Button>
                                    )
                                )}
                            </CardContent>
                        </Card>

                        {/* Notes Section */}
                        <Card className="border-gray-200">
                            <CardHeader className="bg-gray-50 rounded-t-lg">
                                <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                                    <MessageSquare className="w-5 h-5" />
                                    Notes & Communication
                                    <Badge className="ml-2 bg-gray-100 text-gray-700">
                                        {getQuotationNotes(quotation.id).length} Notes
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6">
                                    {getQuotationNotes(quotation.id).length > 0 ? (
                                        getQuotationNotes(quotation.id).map((note) => (
                                            <div
                                                key={note.id}
                                                className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400 hover:shadow-sm transition-all duration-200"
                                            >
                                                <p className="text-gray-900 mb-2">{note.note}</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                                                        <UserCircle className="w-4 h-4 text-white" />
                                                    </div>
                                                    <span className="text-xs text-gray-600 font-medium">
                                                        {note.created_by}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        • {note.created_at ? new Date(note.created_at).toLocaleString() : "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                            <p>No notes yet</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 mt-4 border-t pt-4">
                                    <Textarea
                                        placeholder="Add a note about this quotation..."
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        className="min-h-[80px] border-gray-300 resize-none"
                                        rows={3}
                                    />
                                    <Button
                                        onClick={() => handleAddNote(quotation.id)}
                                        disabled={!newNote.trim()}
                                        className="self-start bg-gray-900 hover:bg-gray-800 text-white"
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Add Note
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
                        <Button
                            onClick={() => alert(`Sending email to ${quotation.client_email}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                        </Button>
                        <Button
                            onClick={() => window.open(`tel:${quotation.client_phone}`)}
                            variant="outline"
                            className="border-gray-300"
                            disabled={!quotation.client_phone}
                        >
                            <Phone className="w-4 h-4 mr-2" />
                            Call Client
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="border-gray-300 ml-auto"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}