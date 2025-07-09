import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

// Helper to upload file to Supabase Storage
async function uploadFileToStorage(file: File, supabase: any) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from("job-sheets")
    .upload(fileName, file, { contentType: file.type });
  if (error) throw error;
  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("job-sheets")
    .getPublicUrl(fileName);
  return publicUrlData.publicUrl;
}

// CREATE a new job sheet (POST)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const contentType = req.headers.get("content-type") || "";

  let data: any;
  let fileUrl = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      fileUrl = await uploadFileToStorage(file, supabase);
    }
    // Collect other fields
    const fields: any = {};
    for (const [key, value] of formData.entries()) {
      if (key !== "file") {
        // Convert numeric fields appropriately
        if (
          [
            "party_id",
            "plate",
            "paper_sheet",
            "imp",
            "gsm",
            "paper_gsm",
            "inventory_item_id",
          ].includes(key)
        ) {
          fields[key] = value ? parseInt(value as string) : null;
        } else if (
          ["sq_inch", "rate", "printing", "uv", "baking"].includes(key)
        ) {
          fields[key] = value ? parseFloat(value as string) : null;
        } else if (
          ["paper_provided_by_party", "used_from_inventory"].includes(key)
        ) {
          fields[key] = value === "true";
        } else {
          fields[key] = value || null;
        }
      }
    }
    fields.file_url = fileUrl;
    data = fields;
  } else {
    // fallback to JSON body (no file)
    data = await req.json();
  }

  try {
    // Insert the job sheet
    const { error, data: inserted } = await supabase
      .from("job_sheets")
      .insert([data])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const insertedJobSheet = inserted[0];

    // Handle inventory deduction if paper is used from inventory
    if (
      data.used_from_inventory &&
      data.inventory_item_id &&
      data.paper_sheet
    ) {
      const usedQuantity = parseInt(data.paper_sheet) || 0;

      if (usedQuantity > 0) {
        try {
          console.log(
            `Deducting ${usedQuantity} sheets from inventory item ${data.inventory_item_id}`
          );

          // Get current inventory item
          const { data: inventoryItem, error: inventoryError } = await supabase
            .from("inventory_items")
            .select("*")
            .eq("id", data.inventory_item_id)
            .single();

          if (!inventoryError && inventoryItem) {
            const newCurrentQuantity =
              inventoryItem.current_quantity - usedQuantity;
            const newAvailableQuantity =
              inventoryItem.available_quantity - usedQuantity;

            // Update inventory item quantities
            const { error: inventoryUpdateError } = await supabase
              .from("inventory_items")
              .update({
                current_quantity: newCurrentQuantity,
                available_quantity: newAvailableQuantity,
                last_updated: new Date().toISOString(),
              })
              .eq("id", data.inventory_item_id);

            if (inventoryUpdateError) {
              console.error("Error updating inventory:", inventoryUpdateError);
            } else {
              console.log(
                `Inventory updated successfully. Used: ${usedQuantity}, Remaining: ${newCurrentQuantity}`
              );
            }

            // Create inventory transaction record
            try {
              const inventoryTransactionData = {
                inventory_item_id: data.inventory_item_id,
                party_id: inventoryItem.party_id,
                paper_type_id: inventoryItem.paper_type_id,
                transaction_type: "out",
                quantity: usedQuantity,
                unit_type: "sheets",
                unit_size: 1,
                total_sheets: -usedQuantity, // Negative for outbound transactions
                description: `Used for Job Sheet #${insertedJobSheet.id}: ${data.description || "Job order"}`,
                reference_id: insertedJobSheet.id,
                balance_after: newCurrentQuantity,
                created_by: "Job Sheet",
                gsm: inventoryItem.gsm,
              };

              await supabase
                .from("inventory_transactions")
                .insert([inventoryTransactionData]);
              console.log("Inventory transaction created successfully");
            } catch (inventoryTransactionError) {
              console.warn(
                "Could not create inventory transaction:",
                inventoryTransactionError
              );
              // Don't fail the job creation if transaction logging fails
            }
          } else {
            console.error("Could not fetch inventory item:", inventoryError);
          }
        } catch (inventoryErr) {
          console.error("Error in inventory update:", inventoryErr);
          // Don't fail the job sheet creation if inventory update fails
        }
      }
    }

    // Update party balance if party_id exists and there's a cost
    if (data.party_id) {
      const totalJobCost =
        (parseFloat(data.printing) || 0) +
                          (parseFloat(data.uv) || 0) + 
                          (parseFloat(data.baking) || 0);

      if (totalJobCost > 0) {
        try {
          console.log(
            `Updating party balance for party ${data.party_id}, deducting amount: ${totalJobCost}`
          );
          
          // Get current party balance
          const { data: partyData, error: partyError } = await supabase
            .from("parties")
            .select("balance")
            .eq("id", data.party_id)
            .single();

          if (!partyError && partyData) {
            const currentBalance = partyData.balance || 0;
            const newBalance = currentBalance - totalJobCost; // Subtract cost from balance

            // Update party balance directly
            const { error: balanceUpdateError } = await supabase
              .from("parties")
              .update({ 
                balance: newBalance,
                updated_at: new Date().toISOString(),
              })
              .eq("id", data.party_id);

            if (balanceUpdateError) {
              console.error(
                "Error updating party balance:",
                balanceUpdateError
              );
            } else {
              console.log(
                `Party balance updated successfully. Old: ${currentBalance}, New: ${newBalance}`
              );
            }

            // Try to create transaction record if the table exists
            try {
              const transactionData = {
                party_id: data.party_id,
                type: "order",
                amount: totalJobCost,
                description: `Job Sheet #${insertedJobSheet.id}: ${data.description || "Job order"}`,
                balance_after: newBalance,
              };

              await supabase
                .from("party_transactions")
                .insert([transactionData]);
              console.log("Party transaction created successfully");
            } catch (transactionError) {
              console.warn(
                "Could not create party transaction:",
                transactionError
              );
              // Don't fail the job creation if transaction logging fails
            }
          } else {
            console.error("Could not fetch party data:", partyError);
          }
        } catch (balanceUpdateErr) {
          console.error("Error in party balance update:", balanceUpdateErr);
          // Don't fail the job sheet creation if balance update fails
        }
      }
    }

    return NextResponse.json(insertedJobSheet, { status: 201 });
  } catch (error: any) {
    console.error("Error creating job sheet:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// READ all job sheets (GET)
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_sheets")
    .select("*")
    .order("id", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 200 });
}

// UPDATE a job sheet (PUT)
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const data = await req.json();
  const { id, ...updateFields } = data;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error, data: updated } = await supabase
    .from("job_sheets")
    .update(updateFields)
    .eq("id", id)
    .select();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(updated[0], { status: 200 });
}

// DELETE a job sheet (DELETE)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("job_sheets").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 200 });
} 
