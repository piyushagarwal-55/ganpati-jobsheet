import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../../supabase/server";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } },
) {
    try {
        const { deletion_reason, deleted_by } = await request.json();
        const transactionId = parseInt(params.id);

        if (!deletion_reason || !deletion_reason.trim()) {
            return NextResponse.json(
                { error: "Deletion reason is required" },
                { status: 400 },
            );
        }

        const supabase = await createClient();

        // Check if transaction exists
        const { data: transaction, error: fetchError } = await supabase
            .from("party_transactions")
            .select("*")
            .eq("id", transactionId)
            .single();

        if (fetchError || !transaction) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 },
            );
        }

        if (transaction.is_deleted) {
            return NextResponse.json(
                { error: "Transaction is already deleted" },
                { status: 400 },
            );
        }

        // Update transaction to mark as deleted
        const { error: updateError } = await supabase
            .from("party_transactions")
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deletion_reason: deletion_reason.trim(),
                deleted_by: deleted_by || "Admin",
            })
            .eq("id", transactionId);

        if (updateError) {
            console.error("Error updating transaction:", updateError);
            return NextResponse.json(
                { error: updateError.message },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Transaction marked as deleted successfully",
        });
    } catch (error) {
        console.error("Error soft deleting transaction:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
