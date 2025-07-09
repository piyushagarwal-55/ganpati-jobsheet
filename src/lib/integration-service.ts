import { createClient } from "../../supabase/server";

// Integration Service Types
export interface JobSheetSubmission {
  // Basic job sheet data
  job_date: string;
  party_id?: number | null;
  party_name: string;
  description: string;
  plate: string;
  size: string;
  sq_inch: string;
  paper_sheet: string;
  imp: string;
  rate: string;
  printing: string;
  uv: string;
  baking: string;
  job_type?: string | null;
  plate_code?: string;

  // Paper specifications
  paper_type_id?: number | null;
  gsm?: number | null;
  paper_provided_by_party?: boolean;
  paper_type?: string | null;
  paper_size?: string | null;
  paper_gsm?: number | null;

  // Machine assignment
  machine_id?: number | null;
  assign_to_machine?: boolean;

  // Inventory consumption
  paper_source?: "inventory" | "self-provided";
  inventory_item_id?: number | null;
  used_from_inventory?: boolean;
}

export interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
  rollback?: () => Promise<void>;
}

export interface WorkflowStatus {
  job_sheet_id: number;
  status: "created" | "assigned" | "in_progress" | "completed" | "cancelled";
  machine_id?: number | null;
  machine_name?: string;
  inventory_consumed: boolean;
  party_balance_updated: boolean;
  created_at: string;
  updated_at: string;
}

class IntegrationService {
  private static instance: IntegrationService;

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Main method to handle complete job sheet submission with all integrations
   */
  async submitJobSheetWithIntegrations(
    submissionData: JobSheetSubmission
  ): Promise<IntegrationResult> {
    const supabase = await createClient();
    let rollbackActions: (() => Promise<void>)[] = [];

    try {
      // Step 1: Validate all requirements
      const validationResult = await this.validateSubmission(submissionData);
      if (!validationResult.success) {
        return validationResult;
      }

      // Step 2: Reserve inventory if needed
      let inventoryReservation = null;
      if (
        submissionData.used_from_inventory &&
        submissionData.inventory_item_id
      ) {
        inventoryReservation = await this.reserveInventory(
          submissionData.inventory_item_id,
          parseInt(submissionData.paper_sheet),
          submissionData.description
        );

        if (!inventoryReservation.success) {
          return inventoryReservation;
        }

        rollbackActions.push(async () => {
          await this.releaseInventoryReservation(
            inventoryReservation.data.reservation_id
          );
        });
      }

      // Step 3: Reserve machine if needed
      let machineReservation = null;
      if (submissionData.assign_to_machine && submissionData.machine_id) {
        machineReservation = await this.reserveMachine(
          submissionData.machine_id,
          submissionData.description
        );

        if (!machineReservation.success) {
          // Rollback inventory reservation
          await this.executeRollbacks(rollbackActions);
          return machineReservation;
        }

        rollbackActions.push(async () => {
          await this.releaseMachineReservation(submissionData.machine_id!);
        });
      }

      // Step 4: Create job sheet
      const jobSheetData = await this.prepareJobSheetData(submissionData);
      const { data: jobSheet, error: jobError } = await supabase
        .from("job_sheets")
        .insert([jobSheetData])
        .select()
        .single();

      if (jobError || !jobSheet) {
        await this.executeRollbacks(rollbackActions);
        return {
          success: false,
          error: `Failed to create job sheet: ${jobError?.message || "Unknown error"}`,
        };
      }

      rollbackActions.push(async () => {
        await supabase.from("job_sheets").delete().eq("id", jobSheet.id);
      });

      // Step 5: Consume inventory
      if (inventoryReservation) {
        const consumptionResult = await this.consumeInventory(
          inventoryReservation.data.reservation_id,
          jobSheet.id,
          submissionData.description
        );

        if (!consumptionResult.success) {
          await this.executeRollbacks(rollbackActions);
          return consumptionResult;
        }
      }

      // Step 6: Assign to machine
      if (machineReservation) {
        const assignmentResult = await this.assignJobToMachine(
          jobSheet.id,
          submissionData.machine_id!
        );

        if (!assignmentResult.success) {
          await this.executeRollbacks(rollbackActions);
          return assignmentResult;
        }
      }

      // Step 7: Update party balance
      const totalCost = this.calculateTotalCost(submissionData);
      if (submissionData.party_id && totalCost > 0) {
        const balanceResult = await this.updatePartyBalance(
          submissionData.party_id,
          totalCost,
          jobSheet.id,
          submissionData.description
        );

        if (!balanceResult.success) {
          console.warn("Failed to update party balance:", balanceResult.error);
          // Don't fail the entire operation for balance update failure
        }
      }

      // Step 8: Create workflow status
      await this.createWorkflowStatus(jobSheet.id, submissionData);

      return {
        success: true,
        data: jobSheet,
        rollback: async () =>
          await this.executeRollbacks(rollbackActions.reverse()),
      };
    } catch (error: any) {
      await this.executeRollbacks(rollbackActions);
      return {
        success: false,
        error: `Integration error: ${error.message || "Unknown error"}`,
      };
    }
  }

  /**
   * Validate submission data and check availability
   */
  private async validateSubmission(
    submissionData: JobSheetSubmission
  ): Promise<IntegrationResult> {
    const supabase = await createClient();

    // Check party exists
    if (submissionData.party_id) {
      const { data: party } = await supabase
        .from("parties")
        .select("id, name, balance")
        .eq("id", submissionData.party_id)
        .single();

      if (!party) {
        return { success: false, error: "Selected party not found" };
      }
    }

    // Check inventory availability (now allowing negative quantities)
    if (
      submissionData.used_from_inventory &&
      submissionData.inventory_item_id
    ) {
      const { data: inventoryItem } = await supabase
        .from("inventory_items")
        .select("available_quantity, paper_type_name")
        .eq("id", submissionData.inventory_item_id)
        .single();

      if (!inventoryItem) {
        return { success: false, error: "Selected inventory item not found" };
      }

      // Note: We no longer prevent negative inventory
      // This allows creating "debt" when party doesn't have enough paper
    }

    // Check machine availability
    if (submissionData.assign_to_machine && submissionData.machine_id) {
      const { data: machine } = await supabase
        .from("machines")
        .select("id, name, status, is_available")
        .eq("id", submissionData.machine_id)
        .single();

      if (!machine) {
        return { success: false, error: "Selected machine not found" };
      }

      if (machine.status !== "active" || !machine.is_available) {
        return {
          success: false,
          error: `Machine ${machine.name} is not available for assignment`,
        };
      }
    }

    return { success: true };
  }

  /**
   * Reserve inventory for job
   */
  private async reserveInventory(
    inventoryItemId: number,
    quantity: number,
    description: string
  ): Promise<IntegrationResult> {
    const supabase = await createClient();

    try {
      // Get current inventory
      const { data: inventoryItem, error: fetchError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", inventoryItemId)
        .single();

      if (fetchError || !inventoryItem) {
        return { success: false, error: "Inventory item not found" };
      }

      // Allow negative inventory - update available quantity (reserve)
      // This creates "debt" when there's insufficient stock
      const newAvailableQuantity = inventoryItem.available_quantity - quantity;
      const newReservedQuantity = inventoryItem.reserved_quantity + quantity;

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          available_quantity: newAvailableQuantity,
          reserved_quantity: newReservedQuantity,
          last_updated: new Date().toISOString(),
        })
        .eq("id", inventoryItemId);

      if (updateError) {
        return {
          success: false,
          error: `Failed to reserve inventory: ${updateError.message}`,
        };
      }

      // Create reservation transaction
      const { data: reservation, error: reservationError } = await supabase
        .from("inventory_transactions")
        .insert([
          {
            inventory_item_id: inventoryItemId,
            party_id: inventoryItem.party_id,
            paper_type_id: inventoryItem.paper_type_id,
            transaction_type: "reserved",
            quantity: quantity,
            unit_type: "sheets",
            unit_size: 1,
            total_sheets: -quantity,
            description: `Reserved for: ${description}`,
            balance_after: inventoryItem.current_quantity,
            created_by: "Integration Service",
            gsm: inventoryItem.gsm,
          },
        ])
        .select()
        .single();

      if (reservationError) {
        // Rollback the inventory update
        await supabase
          .from("inventory_items")
          .update({
            available_quantity: inventoryItem.available_quantity,
            reserved_quantity: inventoryItem.reserved_quantity,
          })
          .eq("id", inventoryItemId);

        return {
          success: false,
          error: `Failed to create reservation: ${reservationError.message}`,
        };
      }

      return {
        success: true,
        data: {
          reservation_id: reservation.id,
          inventory_item_id: inventoryItemId,
          reserved_quantity: quantity,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Inventory reservation error: ${error.message}`,
      };
    }
  }

  /**
   * Reserve machine for job
   */
  private async reserveMachine(
    machineId: number,
    description: string
  ): Promise<IntegrationResult> {
    const supabase = await createClient();

    try {
      // Check machine availability
      const { data: machine, error: fetchError } = await supabase
        .from("machines")
        .select("*")
        .eq("id", machineId)
        .single();

      if (fetchError || !machine) {
        return { success: false, error: "Machine not found" };
      }

      if (machine.status !== "active" || !machine.is_available) {
        return { success: false, error: "Machine is not available" };
      }

      // Reserve machine
      const { error: updateError } = await supabase
        .from("machines")
        .update({
          is_available: false,
          last_assigned: new Date().toISOString(),
        })
        .eq("id", machineId);

      if (updateError) {
        return {
          success: false,
          error: `Failed to reserve machine: ${updateError.message}`,
        };
      }

      return { success: true, data: { machine_id: machineId } };
    } catch (error: any) {
      return {
        success: false,
        error: `Machine reservation error: ${error.message}`,
      };
    }
  }

  /**
   * Consume reserved inventory
   */
  private async consumeInventory(
    reservationId: number,
    jobSheetId: number,
    description: string
  ): Promise<IntegrationResult> {
    const supabase = await createClient();

    try {
      // Get reservation details
      const { data: reservation, error: reservationError } = await supabase
        .from("inventory_transactions")
        .select("*")
        .eq("id", reservationId)
        .single();

      if (reservationError || !reservation) {
        return { success: false, error: "Reservation not found" };
      }

      // Get inventory item
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", reservation.inventory_item_id)
        .single();

      if (inventoryError || !inventoryItem) {
        return { success: false, error: "Inventory item not found" };
      }

      const consumedQuantity = Math.abs(reservation.total_sheets);
      const newCurrentQuantity =
        inventoryItem.current_quantity - consumedQuantity;
      const newReservedQuantity =
        inventoryItem.reserved_quantity - consumedQuantity;

      // Update inventory - consume from current and reserved
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          current_quantity: newCurrentQuantity,
          reserved_quantity: newReservedQuantity,
          last_updated: new Date().toISOString(),
        })
        .eq("id", reservation.inventory_item_id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to consume inventory: ${updateError.message}`,
        };
      }

      // Create consumption transaction
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert([
          {
            inventory_item_id: reservation.inventory_item_id,
            party_id: inventoryItem.party_id,
            paper_type_id: inventoryItem.paper_type_id,
            transaction_type: "out",
            quantity: consumedQuantity,
            unit_type: "sheets",
            unit_size: 1,
            total_sheets: -consumedQuantity,
            description: `Consumed for Job Sheet #${jobSheetId}: ${description}`,
            reference_id: jobSheetId,
            balance_after: newCurrentQuantity,
            created_by: "Integration Service",
            gsm: inventoryItem.gsm,
          },
        ]);

      if (transactionError) {
        console.warn(
          "Failed to create consumption transaction:",
          transactionError
        );
        // Don't fail the operation for transaction logging
      }

      return { success: true, data: { consumed_quantity: consumedQuantity } };
    } catch (error: any) {
      return {
        success: false,
        error: `Inventory consumption error: ${error.message}`,
      };
    }
  }

  /**
   * Assign job to machine
   */
  private async assignJobToMachine(
    jobSheetId: number,
    machineId: number
  ): Promise<IntegrationResult> {
    const supabase = await createClient();

    try {
      const { data: updatedJob, error: updateError } = await supabase
        .from("job_sheets")
        .update({
          machine_id: machineId,
          job_status: "assigned",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", jobSheetId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: `Failed to assign job to machine: ${updateError.message}`,
        };
      }

      return { success: true, data: updatedJob };
    } catch (error: any) {
      return {
        success: false,
        error: `Job assignment error: ${error.message}`,
      };
    }
  }

  /**
   * Update party balance and create transaction
   */
  private async updatePartyBalance(
    partyId: number,
    totalCost: number,
    jobSheetId: number,
    description: string
  ): Promise<IntegrationResult> {
    const supabase = await createClient();

    try {
      // Get current balance
      const { data: party, error: partyError } = await supabase
        .from("parties")
        .select("balance")
        .eq("id", partyId)
        .single();

      if (partyError || !party) {
        return { success: false, error: "Party not found" };
      }

      const newBalance = party.balance - totalCost;

      // Update balance and create transaction in parallel
      const [balanceUpdate, transactionCreate] = await Promise.allSettled([
        supabase
          .from("parties")
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", partyId),
        supabase.from("party_transactions").insert([
          {
            party_id: partyId,
            type: "order",
            amount: totalCost,
            description: `Job Sheet #${jobSheetId} - ${description}`,
            balance_after: newBalance,
            created_by: "Integration Service",
          },
        ]),
      ]);

      if (balanceUpdate.status === "rejected") {
        return {
          success: false,
          error: `Failed to update party balance: ${balanceUpdate.reason}`,
        };
      }

      if (transactionCreate.status === "rejected") {
        console.warn(
          "Failed to create party transaction:",
          transactionCreate.reason
        );
        // Don't fail the operation for transaction logging
      }

      return { success: true, data: { new_balance: newBalance } };
    } catch (error: any) {
      return {
        success: false,
        error: `Party balance update error: ${error.message}`,
      };
    }
  }

  /**
   * Create workflow status entry
   */
  private async createWorkflowStatus(
    jobSheetId: number,
    submissionData: JobSheetSubmission
  ): Promise<void> {
    const supabase = await createClient();

    try {
      const workflowData = {
        job_sheet_id: jobSheetId,
        status: submissionData.assign_to_machine ? "assigned" : "created",
        machine_id: submissionData.machine_id || null,
        inventory_consumed: !!submissionData.used_from_inventory,
        party_balance_updated: !!submissionData.party_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await supabase.from("workflow_status").insert([workflowData]);
    } catch (error) {
      console.warn("Failed to create workflow status:", error);
      // Don't fail the operation for workflow tracking
    }
  }

  /**
   * Helper methods
   */
  private async prepareJobSheetData(submissionData: JobSheetSubmission) {
    const supabase = await createClient();

    // Get available columns from job_sheets table
    const availableColumns = await this.getJobSheetsColumns(supabase);

    // Prepare all possible data
    const allData = {
      job_date: submissionData.job_date,
      party_id: submissionData.party_id,
      party_name: submissionData.party_name,
      description: submissionData.description,
      plate: parseInt(submissionData.plate),
      size: submissionData.size,
      sq_inch: parseFloat(submissionData.sq_inch),
      paper_sheet: parseInt(submissionData.paper_sheet),
      imp: parseInt(submissionData.imp),
      rate: parseFloat(submissionData.rate),
      printing: parseFloat(submissionData.printing),
      uv: parseFloat(submissionData.uv || "0"),
      baking: parseFloat(submissionData.baking || "0"),
      job_type: submissionData.job_type,
      gsm: submissionData.gsm,
      paper_type_id: submissionData.paper_type_id,
      paper_provided_by_party: submissionData.paper_provided_by_party,
      paper_type: submissionData.paper_type,
      paper_size: submissionData.paper_size,
      paper_gsm: submissionData.paper_gsm,
      machine_id: submissionData.machine_id,
      paper_source: submissionData.paper_source,
      inventory_item_id: submissionData.inventory_item_id,
      used_from_inventory: submissionData.used_from_inventory,
      plate_code: submissionData.plate_code,
      job_status: submissionData.assign_to_machine ? "assigned" : "created",
      created_at: new Date().toISOString(),
    };

    // Filter data to only include columns that exist in the database
    const filteredData: any = {};
    for (const [key, value] of Object.entries(allData)) {
      if (availableColumns.includes(key)) {
        filteredData[key] = value;
      }
    }

    return filteredData;
  }

  private async getJobSheetsColumns(supabase: any): Promise<string[]> {
    try {
      // Query the information schema to get available columns
      const { data, error } = await supabase
        .from("information_schema.columns")
        .select("column_name")
        .eq("table_name", "job_sheets")
        .eq("table_schema", "public");

      if (error) throw error;

      return data.map((row: any) => row.column_name);
    } catch (error) {
      console.warn(
        "Failed to get job_sheets columns, using minimal set:",
        error
      );
      // Return minimal set of columns that should always exist
      return [
        "id",
        "job_date",
        "description",
        "plate",
        "size",
        "sq_inch",
        "paper_sheet",
        "imp",
        "rate",
        "printing",
        "uv",
        "baking",
      ];
    }
  }

  private calculateTotalCost(submissionData: JobSheetSubmission): number {
    return (
      parseFloat(submissionData.printing || "0") +
      parseFloat(submissionData.uv || "0") +
      parseFloat(submissionData.baking || "0")
    );
  }

  private async executeRollbacks(
    rollbackActions: (() => Promise<void>)[]
  ): Promise<void> {
    for (const rollback of rollbackActions) {
      try {
        await rollback();
      } catch (error) {
        console.error("Rollback error:", error);
      }
    }
  }

  private async releaseInventoryReservation(
    reservationId: number
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // Get reservation details
      const { data: reservation } = await supabase
        .from("inventory_transactions")
        .select("*")
        .eq("id", reservationId)
        .single();

      if (reservation) {
        const quantity = Math.abs(reservation.total_sheets);

        // Release reserved inventory
        const { data: currentItem } = await supabase
          .from("inventory_items")
          .select("available_quantity, reserved_quantity")
          .eq("id", reservation.inventory_item_id)
          .single();

        if (currentItem) {
          await supabase
            .from("inventory_items")
            .update({
              available_quantity: currentItem.available_quantity + quantity,
              reserved_quantity: Math.max(
                0,
                currentItem.reserved_quantity - quantity
              ),
            })
            .eq("id", reservation.inventory_item_id);
        }

        // Create release transaction
        await supabase.from("inventory_transactions").insert([
          {
            inventory_item_id: reservation.inventory_item_id,
            party_id: reservation.party_id,
            paper_type_id: reservation.paper_type_id,
            transaction_type: "released",
            quantity: quantity,
            unit_type: "sheets",
            unit_size: 1,
            total_sheets: quantity,
            description: "Released reservation due to rollback",
            created_by: "Integration Service",
            gsm: reservation.gsm,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to release inventory reservation:", error);
    }
  }

  private async releaseMachineReservation(machineId: number): Promise<void> {
    const supabase = await createClient();

    try {
      await supabase
        .from("machines")
        .update({ is_available: true })
        .eq("id", machineId);
    } catch (error) {
      console.error("Failed to release machine reservation:", error);
    }
  }

  /**
   * Get workflow status for a job
   */
  async getWorkflowStatus(jobSheetId: number): Promise<WorkflowStatus | null> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("workflow_status")
        .select(
          `
          *,
          machines (name)
        `
        )
        .eq("job_sheet_id", jobSheetId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        ...data,
        machine_name: data.machines?.name,
      };
    } catch (error) {
      console.error("Failed to get workflow status:", error);
      return null;
    }
  }

  /**
   * Update job status in workflow
   */
  async updateJobStatus(
    jobSheetId: number,
    status: WorkflowStatus["status"]
  ): Promise<IntegrationResult> {
    const supabase = await createClient();

    try {
      const { error } = await supabase
        .from("workflow_status")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("job_sheet_id", jobSheetId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const integrationService = IntegrationService.getInstance();
