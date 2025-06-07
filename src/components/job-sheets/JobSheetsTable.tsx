/* eslint-disable */

"use client";
import { useState } from "react";
import PartyBalanceUpdateDialog from "./PartyBalanceUpdateDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Edit, Trash2, FileText, Badge } from "lucide-react";
import { JobSheet } from "@/types/jobsheet";

interface JobSheetsTableProps {
  jobSheets: JobSheet[];
  onEdit: (sheet: JobSheet) => void;
  onDelete: (id: number) => void;
  onView: (sheet: JobSheet) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onRefresh?: () => Promise<void> | void;
}

export default function JobSheetsTable({
  jobSheets,
  onEdit,
  onDelete,
  onView,
  searchTerm,
  setSearchTerm,
  onRefresh,
}: JobSheetsTableProps) {
  // Move state declarations inside the component
  const [showBalanceDialog, setShowBalanceDialog] = useState<boolean>(false);
  const [selectedJobSheet, setSelectedJobSheet] = useState<JobSheet | null>(
    null
  );

  const filteredSheets = jobSheets.filter((sheet: JobSheet) => {
    return (
      searchTerm === "" ||
      sheet.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.size?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Add this function:
  const handleUpdateBalance = async (
    amount: number,
    description: string
  ): Promise<void> => {
    if (!selectedJobSheet?.party_id) return;

    try {
      const response = await fetch(
        `/api/parties/${selectedJobSheet.party_id}/transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "payment",
            amount: amount,
            description: description,
          }),
        }
      );

      if (response.ok) {
        // Refresh data
        if (onRefresh) {
          await onRefresh();
        }
        setShowBalanceDialog(false);
        setSelectedJobSheet(null);
      } else {
        console.error("Failed to update balance");
      }
    } catch (error) {
      console.error("Failed to update balance:", error);
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Job Sheets
            <Input
              placeholder="Search by description or size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Sheet</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Sq inch</TableHead>
                <TableHead>Paper Sheet</TableHead>
                <TableHead>Imp.</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Printing</TableHead>
                <TableHead>UV</TableHead>
                <TableHead>Baking</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Paper Details</TableHead>
                <TableHead>Balance Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSheets.map((sheet: JobSheet) => (
                <TableRow key={sheet.id}>
                  <TableCell>{sheet.id}</TableCell>
                  <TableCell>
                    {sheet.job_date ? sheet.job_date.slice(0, 10) : ""}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {sheet.party_name || "N/A"}
                      </div>
                      {sheet.party_balance_after !== null &&
                        sheet.party_balance_after !== undefined && (
                          <div className="text-xs text-gray-500">
                            Balance: ₹{sheet.party_balance_after.toFixed(2)}
                          </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>{sheet.description}</TableCell>
                  <TableCell>{sheet.sheet}</TableCell>
                  <TableCell>{sheet.plate}</TableCell>
                  <TableCell>{sheet.size}</TableCell>
                  <TableCell>{sheet.sq_inch}</TableCell>
                  <TableCell>{sheet.paper_sheet}</TableCell>
                  <TableCell>{sheet.imp}</TableCell>
                  <TableCell>₹{sheet.rate || 0}</TableCell>
                  <TableCell>₹{sheet.printing || 0}</TableCell>
                  <TableCell>₹{sheet.uv || 0}</TableCell>
                  <TableCell>₹{sheet.baking || 0}</TableCell>
                  <TableCell className="font-semibold">
                    ₹
                    {(
                      (sheet.printing || 0) +
                      (sheet.uv || 0) +
                      (sheet.baking || 0)
                    ).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {sheet.file_url ? (
                      sheet.file_url.match(/\.(jpg|jpeg|png)$/i) ? (
                        <a
                          href={sheet.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={sheet.file_url}
                            alt="Job File"
                            className="w-12 h-12 object-cover rounded"
                          />
                        </a>
                      ) : (
                        <a
                          href={sheet.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          View File
                        </a>
                      )
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(sheet)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(sheet)}
                        title="Edit Job Sheet"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(sheet.id)}
                        title="Delete Job Sheet"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sheet.paper_provided_by_party ? (
                      <div className="text-sm">
                        <Badge variant="outline" className="mb-1">
                          Party Paper
                        </Badge>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>{sheet.paper_type}</div>
                          <div>
                            {sheet.paper_size} • {sheet.paper_gsm} GSM
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <Badge variant="secondary" className="mb-1">
                          Company Paper
                        </Badge>
                        {sheet.gsm && (
                          <div className="text-xs text-gray-600">
                            {sheet.gsm} GSM
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {sheet.party_id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJobSheet(sheet);
                          setShowBalanceDialog(true);
                        }}
                        title="Update Party Balance"
                      >
                        Update Balance
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">No Party</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredSheets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={19} className="text-center py-4">
                    No job sheets found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PartyBalanceUpdateDialog
        open={showBalanceDialog}
        onClose={() => {
          setShowBalanceDialog(false);
          setSelectedJobSheet(null);
        }}
        jobSheet={selectedJobSheet}
        onUpdate={handleUpdateBalance}
      />
    </>
  );
}
