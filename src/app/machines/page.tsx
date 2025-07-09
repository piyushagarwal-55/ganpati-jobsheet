"use client";

import React, { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
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
  Settings,
  Zap,
  PlayCircle,
  PauseCircle,
  Monitor,
  Home,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Factory,
} from "lucide-react";

const statusConfig = {
  active: {
    color:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
    icon: CheckCircle,
    dotColor: "bg-emerald-500",
  },
  maintenance: {
    color:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
    icon: Clock,
    dotColor: "bg-amber-500",
  },
  offline: {
    color:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
    icon: AlertCircle,
    dotColor: "bg-red-500",
  },
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            {machine ? "Edit Machine" : "Add New Machine"}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {machine
              ? "Update machine details and configuration"
              : "Configure a new printing machine for your workshop"}
          </DialogDescription>
          <Separator />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="machine-name" className="text-sm font-medium">
                  Machine Name *
                </Label>
                <Input
                  id="machine-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., 4 Color Offset Press"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machine-type" className="text-sm font-medium">
                  Machine Type *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="machine-type" className="h-11">
                    <SelectValue placeholder="Select machine type" />
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

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the machine capabilities..."
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* Technical Specifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Technical Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color-capacity" className="text-sm font-medium">
                  Color Capacity
                </Label>
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
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-sheet-size" className="text-sm font-medium">
                  Max Sheet Size
                </Label>
                <Select
                  value={formData.max_sheet_size}
                  onValueChange={(value) =>
                    setFormData({ ...formData, max_sheet_size: value })
                  }
                >
                  <SelectTrigger id="max-sheet-size" className="h-11">
                    <SelectValue placeholder="Select maximum sheet size" />
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
          </div>

          <Separator />

          {/* Operation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Operation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="operator-name" className="text-sm font-medium">
                  Operator Name
                </Label>
                <Input
                  id="operator-name"
                  value={formData.operator_name}
                  onChange={(e) =>
                    setFormData({ ...formData, operator_name: e.target.value })
                  }
                  placeholder="Machine operator name"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MACHINE_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          {React.createElement(
                            statusConfig[
                              status.value as keyof typeof statusConfig
                            ]?.icon,
                            {
                              className: "h-4 w-4",
                            }
                          )}
                          {status.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[100px]">
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : machine ? (
                "Update Machine"
              ) : (
                "Create Machine"
              )}
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
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? (
      React.createElement(config.icon, { className: "h-4 w-4" })
    ) : (
      <Activity className="h-4 w-4" />
    );
  };

  const getAvailabilityStats = () => {
    const total = machinesWithStats.length;
    const active = machinesWithStats.filter(
      (m) => m.status === "active"
    ).length;
    const available = machinesWithStats.filter((m) => m.is_available).length;
    const busy = active - available;

    return { total, active, available, busy };
  };

  const stats = getAvailabilityStats();

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center space-x-2 text-sm">
          <div className="h-4 w-12 bg-muted animate-pulse rounded" />
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>

        {/* Header Skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-5 w-96 bg-muted animate-pulse rounded" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-5 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Machine Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-6 w-32 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-16 bg-muted rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex justify-between">
                      <div className="h-4 w-16 bg-muted rounded" />
                      <div className="h-4 w-20 bg-muted rounded" />
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[...Array(2)].map((_, j) => (
                      <div key={j} className="text-center space-y-1">
                        <div className="h-6 w-8 bg-muted rounded mx-auto" />
                        <div className="h-4 w-12 bg-muted rounded mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-9 flex-1 bg-muted rounded" />
                  <div className="h-9 flex-1 bg-muted rounded" />
                  <div className="h-9 w-9 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Machines</span>
        </nav>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-destructive mb-2">
                Failed to Load Machines
              </h3>
              <p className="text-destructive/80 mb-4 max-w-md mx-auto">
                {error}
              </p>
              <Button onClick={refreshMachines} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Machines</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Machine Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Monitor and manage your printing machines
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMachines}
            className="hidden sm:flex"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
              <Button size="default" className="gap-2">
                <Plus className="h-4 w-4" />
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Machines
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Machines
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available
            </CardTitle>
            <PlayCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.available}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Busy
            </CardTitle>
            <PauseCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.busy}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machine Cards */}
      {machinesWithStats.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Factory className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No Machines Found
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get started by adding your first printing machine to begin
              managing your production workflow.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Your First Machine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machinesWithStats.map((machine) => {
            const statusConf =
              statusConfig[machine.status as keyof typeof statusConfig];
            return (
              <Card
                key={machine.id}
                className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-muted"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                        {machine.name}
                      </CardTitle>
                      <CardDescription className="text-sm flex items-center gap-2">
                        <span>{machine.type}</span>
                        <span>•</span>
                        <span>{machine.color_capacity} Colors</span>
                      </CardDescription>
                    </div>
                    <Badge
                      className={statusConf?.color + " gap-1.5 font-medium"}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${statusConf?.dotColor} animate-pulse`}
                      />
                      <span className="capitalize">{machine.status}</span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Machine Details */}
                  <div className="text-sm space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        Operator:
                      </span>
                      <span className="font-medium">
                        {machine.operator_name || "Not assigned"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5" />
                        Max Size:
                      </span>
                      <span className="font-medium">
                        {machine.max_sheet_size || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5" />
                        Status:
                      </span>
                      <Badge
                        variant={machine.is_available ? "default" : "secondary"}
                        className={`${
                          machine.is_available
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {machine.is_available ? "Available" : "Busy"}
                      </Badge>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  {machine.stats && (
                    <div className="border-t pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {machine.stats.assigned_jobs}
                          </div>
                          <div className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium">
                            Assigned
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {machine.stats.completed_jobs}
                          </div>
                          <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                            Completed
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        setEditingMachine(machine);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 hover:bg-blue-600 hover:text-white transition-colors"
                      asChild
                    >
                      <a href={`/machines/${machine.id}/operator`}>
                        <BarChart3 className="h-3.5 w-3.5" />
                        Dashboard
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete Machine
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-base">
                            Are you sure you want to delete "{machine.name}"?
                            This action cannot be undone and will remove all
                            associated data including job assignments and
                            statistics.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteMachine(machine)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete Machine
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
