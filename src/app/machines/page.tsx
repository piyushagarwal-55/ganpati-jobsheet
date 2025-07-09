"use client";

import { useState } from "react";
import { useMachines } from "@/hooks/useMachines";
import {
  Machine,
  MachineFormData,
  MACHINE_TYPES,
  MACHINE_STATUSES,
  SHEET_SIZES,
  JOB_STATUSES,
} from "@/types/machine";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "@/components/ui/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Cog,
  Activity,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
} from "lucide-react";

const statusColorMap = {
  active: "bg-green-100 text-green-800 border-green-200",
  maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
  offline: "bg-red-100 text-red-800 border-red-200",
};

const MachineFormDialog = ({
  open,
  onOpenChange,
  machine,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine?: Machine | null;
  onSubmit: (data: MachineFormData) => Promise<void>;
}) => {
  const [formData, setFormData] = useState<MachineFormData>({
    name: machine?.name || "",
    type: machine?.type || "",
    description: machine?.description || "",
    color_capacity: machine?.color_capacity || 1,
    max_sheet_size: machine?.max_sheet_size || "",
    status: machine?.status || "active",
    operator_name: machine?.operator_name || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      // Reset form if creating new machine
      if (!machine) {
        setFormData({
          name: "",
          type: "",
          description: "",
          color_capacity: 1,
          max_sheet_size: "",
          status: "active",
          operator_name: "",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {machine ? "Edit Machine" : "Add New Machine"}
          </DialogTitle>
          <DialogDescription>
            {machine
              ? "Update machine details"
              : "Create a new printing machine"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine-name">Machine Name</Label>
              <Input
                id="machine-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., 4 Color Offset"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-type">Machine Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="machine-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color-capacity">Color Capacity</Label>
              <Input
                id="color-capacity"
                type="number"
                min="1"
                max="12"
                value={formData.color_capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    color_capacity: parseInt(e.target.value) || 1,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-sheet-size">Max Sheet Size</Label>
              <Select
                value={formData.max_sheet_size}
                onValueChange={(value) =>
                  setFormData({ ...formData, max_sheet_size: value })
                }
              >
                <SelectTrigger id="max-sheet-size">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {SHEET_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "maintenance" | "offline") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="machine-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator-name">Operator Name</Label>
              <Input
                id="operator-name"
                value={formData.operator_name}
                onChange={(e) =>
                  setFormData({ ...formData, operator_name: e.target.value })
                }
                placeholder="e.g., John Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="machine-description">Description</Label>
            <Textarea
              id="machine-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of the machine..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {machine ? "Update Machine" : "Create Machine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function MachinesPage() {
  const {
    machinesWithStats,
    loading,
    error,
    createMachine,
    updateMachine,
    deleteMachine,
    refreshMachines,
  } = useMachines();

  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateMachine = async (data: MachineFormData) => {
    const result = await createMachine(data);
    if (result) {
      toast({
        title: "Success",
        description: "Machine created successfully",
      });
    }
  };

  const handleUpdateMachine = async (data: MachineFormData) => {
    if (!editingMachine) return;

    const result = await updateMachine(editingMachine.id, data);
    if (result) {
      toast({
        title: "Success",
        description: "Machine updated successfully",
      });
      setEditingMachine(null);
    }
  };

  const handleDeleteMachine = async (machine: Machine) => {
    const result = await deleteMachine(machine.id);
    if (result) {
      toast({
        title: "Success",
        description: "Machine deleted successfully",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "maintenance":
        return <Clock className="h-4 w-4" />;
      case "offline":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Machines</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Error Loading Machines
              </h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refreshMachines}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Machine Management</h1>
            <p className="text-gray-600">
              Manage printing machines and monitor their status
            </p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingMachine(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Machine
              </Button>
            </DialogTrigger>
            <MachineFormDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              machine={editingMachine}
              onSubmit={
                editingMachine ? handleUpdateMachine : handleCreateMachine
              }
            />
          </Dialog>
        </div>

        {/* Machine Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machinesWithStats.map((machine) => (
            <Card
              key={machine.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{machine.name}</CardTitle>
                  <Badge className={statusColorMap[machine.status]}>
                    {getStatusIcon(machine.status)}
                    <span className="ml-1 capitalize">{machine.status}</span>
                  </Badge>
                </div>
                <CardDescription>
                  {machine.type} • {machine.color_capacity} Colors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Operator:</span>
                    <span className="font-medium">
                      {machine.operator_name || "Not assigned"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Size:</span>
                    <span className="font-medium">
                      {machine.max_sheet_size || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available:</span>
                    <Badge
                      variant={machine.is_available ? "default" : "secondary"}
                    >
                      {machine.is_available ? "Yes" : "Busy"}
                    </Badge>
                  </div>
                </div>

                {machine.stats && (
                  <div className="border-t pt-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">
                          {machine.stats.assigned_jobs}
                        </div>
                        <div className="text-gray-600">Assigned</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">
                          {machine.stats.completed_jobs}
                        </div>
                        <div className="text-gray-600">Completed</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingMachine(machine);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a href={`/machines/${machine.id}/operator`}>
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Dashboard
                    </a>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Machine</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{machine.name}"? This
                          action cannot be undone and will remove all associated
                          data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteMachine(machine)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Machine
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {machinesWithStats.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Cog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  No Machines Found
                </h3>
                <p className="text-gray-600 mb-4">
                  Get started by adding your first printing machine.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Machine
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
