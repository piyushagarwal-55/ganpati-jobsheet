"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, Calendar, User, AlertCircle } from "lucide-react";
import { JobSheet } from "@/types/jobsheet";

interface PartyBalanceUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  jobSheet: JobSheet | null;
  onUpdate: (amount: number, description: string) => Promise<void>;
}

export default function PartyBalanceUpdateDialog({
  open,
  onClose,
  jobSheet,
  onUpdate,
}: PartyBalanceUpdateDialogProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) === 0 || !jobSheet) return;

    setIsSubmitting(true);
    try {
      await onUpdate(
        parseFloat(amount),
        description || `Payment for Job #${jobSheet.id}`
      );
      setAmount("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Error updating balance:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Party Balance</DialogTitle>
          <DialogDescription>
            {jobSheet
              ? `Record payment from ${jobSheet.party_name || "Unknown Party"} for Job #${jobSheet.id}`
              : "No job sheet selected"}
          </DialogDescription>
        </DialogHeader>

        {!jobSheet ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">No Job Sheet Selected</span>
              </div>
              <p className="text-blue-700 text-sm mt-2">
                Please select a job sheet to update the party balance.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Current Balance:</span>
                <span className="font-semibold text-lg">
                  ₹{jobSheet.party_balance_after?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Job Amount:</span>
                <span className="font-medium">
                  ₹
                  {(
                    (jobSheet.printing || 0) +
                    (jobSheet.uv || 0) +
                    (jobSheet.baking || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <div className="relative mt-1">
                <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  placeholder="Enter payment amount"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="payment-description">
                Description (Optional)
              </Label>
              <Textarea
                id="payment-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this payment..."
                rows={3}
              />
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  New Balance: ₹
                  {(
                    (jobSheet.party_balance_after || 0) - parseFloat(amount)
                  ).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !jobSheet || !amount || parseFloat(amount) <= 0 || isSubmitting
            }
          >
            {isSubmitting ? "Updating..." : "Update Balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
