"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, User } from "lucide-react";

const initialForm = {
  job_date: "",
  party_name: "",
  party_id: null,
  description: "",
  sheet: "",
  plate: "",
  size: "",
  sq_inch: "",
  paper_sheet: "",
  imp: "",
  rate: "",
  printing: "",
  uv: "",
  baking: "",
  file: null,
};

interface Party {
  id: number;
  name: string;
  balance: number;
  phone?: string;
  email?: string;
}

interface JobSheetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  editingSheet: any;
}

export default function JobSheetFormModal({
  open,
  onClose,
  onSubmit,
  editingSheet,
}: JobSheetFormModalProps) {
  const [form, setForm] = useState<any>(initialForm);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [showNewPartyDialog, setShowNewPartyDialog] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyBalance, setNewPartyBalance] = useState("");

  // Fetch parties on mount
  useEffect(() => {
    fetchParties();
  }, []);

  // Update form when editing sheet changes
  useEffect(() => {
    if (editingSheet) {
      setForm({
        ...editingSheet,
        job_date: editingSheet.job_date
          ? editingSheet.job_date.slice(0, 10)
          : "",
        file: null,
      });

      // Set selected party if party_id exists
      if (editingSheet.party_id && parties.length > 0) {
        const party = parties.find((p) => p.id === editingSheet.party_id);
        if (party) {
          setSelectedParty(party);
        }
      }
    } else {
      setForm(initialForm);
      setSelectedParty(null);
    }
  }, [editingSheet, open, parties]);

  const fetchParties = async () => {
    try {
      const response = await fetch("/api/parties");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setParties(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching parties:", error);
    }
  };

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
        const result = await response.json();
        if (result.success) {
          await fetchParties();
          const newParty = result.data;
          setSelectedParty(newParty);
          setForm({
            ...form,
            party_name: newParty.name,
            party_id: newParty.id,
          });
          setNewPartyName("");
          setNewPartyBalance("");
          setShowNewPartyDialog(false);
        }
      }
    } catch (error) {
      console.error("Error adding new party:", error);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      setForm({ ...form, file: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handlePartyChange = (value: string) => {
    if (value === "new") {
      setShowNewPartyDialog(true);
    } else {
      const party = parties.find((p) => p.id.toString() === value);
      if (party) {
        setSelectedParty(party);
        setForm({ ...form, party_name: party.name, party_id: party.id });
      }
    }
  };

  const calculateTotal = () => {
    const printing = parseFloat(form.printing) || 0;
    const uv = parseFloat(form.uv) || 0;
    const baking = parseFloat(form.baking) || 0;
    return printing + uv + baking;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Prepare the form data with proper structure
    const updatedFormData = {
      ...form,
      // Add missing fields that might be needed
      party_id: form.party_id || null,
      paper_type_id: form.paper_type_id || null,
      job_type: form.job_type || null,
      gsm: form.gsm ? parseInt(form.gsm) : null,
      paper_provided_by_party: form.paper_provided_by_party || false,
      paper_type: form.paper_type || null,
      paper_size: form.paper_size || null,
      paper_gsm: form.paper_gsm ? parseInt(form.paper_gsm) : null,
    };

    console.log("JobSheetFormModal - Submitting form data:", updatedFormData); // Debug log

    let res;
    if (form.file) {
      const formData = new FormData();
      Object.entries(updatedFormData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          if (key === "file" && value instanceof File) {
            formData.append("file", value);
          } else if (key !== "file") {
            formData.append(key, value.toString());
          }
        }
      });
      if (editingSheet && editingSheet.id)
        formData.append("id", editingSheet.id.toString());
      res = await fetch("/api/job-sheet", {
        method: editingSheet ? "PUT" : "POST",
        body: formData,
      });
    } else {
      const body = editingSheet
        ? { ...updatedFormData, id: editingSheet.id }
        : updatedFormData;
      res = await fetch("/api/job-sheet", {
        method: editingSheet ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Error");
    } else {
      onSubmit();
    }
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSheet ? "Edit Job Sheet" : "Add Job Sheet"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job_date">Job Date *</Label>
                <Input
                  id="job_date"
                  name="job_date"
                  type="date"
                  value={form.job_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="party_name">Party Name *</Label>
                <Select
                  value={selectedParty?.id.toString() || ""}
                  onValueChange={handlePartyChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a party or create new" />
                  </SelectTrigger>
                  <SelectContent>
                    {parties.map((party) => (
                      <SelectItem key={party.id} value={party.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{party.name}</span>
                          <span className="text-xs text-gray-500">
                            Balance: ₹{party.balance.toFixed(2)}
                            {party.phone && ` • ${party.phone}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>Add New Party</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {selectedParty && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-700">
                          {selectedParty.name}
                        </p>
                        <p className="text-sm text-blue-600">
                          Current Balance: ₹{selectedParty.balance.toFixed(2)}
                        </p>
                        {selectedParty.phone && (
                          <p className="text-xs text-blue-500">
                            Phone: {selectedParty.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                name="description"
                placeholder="Job description"
                value={form.description}
                onChange={handleChange}
                required
              />
            </div>

            {/* Production Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="sheet">Sheet</Label>
                <Input
                  id="sheet"
                  name="sheet"
                  type="number"
                  placeholder="Sheet count"
                  value={form.sheet}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="plate">Plate *</Label>
                <Input
                  id="plate"
                  name="plate"
                  type="number"
                  placeholder="Plate count"
                  value={form.plate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="size">Size *</Label>
                <Input
                  id="size"
                  name="size"
                  placeholder="Size"
                  value={form.size}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sq_inch">Sq Inch *</Label>
                <Input
                  id="sq_inch"
                  name="sq_inch"
                  type="number"
                  step="0.01"
                  placeholder="Square inches"
                  value={form.sq_inch}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="paper_sheet">Paper Sheet *</Label>
                <Input
                  id="paper_sheet"
                  name="paper_sheet"
                  type="number"
                  placeholder="Paper sheet count"
                  value={form.paper_sheet}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="imp">Impressions *</Label>
                <Input
                  id="imp"
                  name="imp"
                  type="number"
                  placeholder="Impressions"
                  value={form.imp}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rate">Rate *</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  step="0.01"
                  placeholder="Rate"
                  value={form.rate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Cost Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="printing">Printing Cost *</Label>
                <Input
                  id="printing"
                  name="printing"
                  type="number"
                  step="0.01"
                  placeholder="Printing cost"
                  value={form.printing}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="uv">UV Cost</Label>
                <Input
                  id="uv"
                  name="uv"
                  type="number"
                  step="0.01"
                  placeholder="UV cost"
                  value={form.uv}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="baking">Baking Cost</Label>
                <Input
                  id="baking"
                  name="baking"
                  type="number"
                  step="0.01"
                  placeholder="Baking cost"
                  value={form.baking}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label>Total Cost</Label>
                <div className="p-2 bg-gray-100 rounded border font-semibold">
                  ₹{calculateTotal().toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="file">File Upload</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleChange}
              />
            </div>

            {/* Balance Impact Preview */}
            {selectedParty && calculateTotal() > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">
                  Balance Impact Preview
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className="font-medium">
                      ₹{selectedParty.balance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Job Cost:</span>
                    <span className="font-medium text-red-600">
                      -₹{calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  <hr className="my-1" />
                  <div className="flex justify-between font-semibold">
                    <span>New Balance:</span>
                    <span
                      className={`${selectedParty.balance - calculateTotal() >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      ₹{(selectedParty.balance - calculateTotal()).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <DialogFooter className="flex gap-2">
              <Button
                type="submit"
                className="bg-blue-600 text-white"
                disabled={loading}
              >
                {loading ? "Processing..." : editingSheet ? "Update" : "Create"}{" "}
                Job Sheet
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Party Dialog */}
      <Dialog open={showNewPartyDialog} onOpenChange={setShowNewPartyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Party</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-party-name">Party Name *</Label>
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
              onClick={() => {
                setShowNewPartyDialog(false);
                setNewPartyName("");
                setNewPartyBalance("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddNewParty} disabled={!newPartyName.trim()}>
              Add Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
