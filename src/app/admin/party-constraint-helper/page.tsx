"use client";

import { useState } from "react";
import {
  checkPartyDependenciesAction,
  deletePartyWithDependenciesAction,
  removeJobSheetPartyReferenceAction,
} from "@/app/actions";

interface JobSheet {
  id: number;
  description: string;
  job_date: string;
  printing: number;
  uv: number;
  baking: number;
  party_name: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface Dependencies {
  jobSheets: JobSheet[];
  transactions: Transaction[];
  orders: any[];
}

export default function PartyConstraintHelper() {
  const [partyId, setPartyId] = useState<string>("");
  const [dependencies, setDependencies] = useState<Dependencies | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [deleteOptions, setDeleteOptions] = useState({
    deleteJobSheets: false,
    deleteTransactions: false,
    deleteOrders: false,
  });

  const checkDependencies = async () => {
    if (!partyId || isNaN(parseInt(partyId))) {
      setMessage({ type: "error", text: "Please enter a valid party ID" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await checkPartyDependenciesAction(parseInt(partyId));

      if (result.success) {
        setDependencies(result.data);
        setMessage({
          type: result.data.canDelete ? "success" : "info",
          text: result.message || "Dependencies checked",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to check dependencies",
        });
        setDependencies(null);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while checking dependencies",
      });
      setDependencies(null);
    } finally {
      setLoading(false);
    }
  };

  const deletePartyWithOptions = async () => {
    if (!partyId || !dependencies) return;

    if (!deleteOptions.deleteJobSheets && dependencies.jobSheets.length > 0) {
      setMessage({
        type: "error",
        text: "You must select to delete job sheets or handle them separately",
      });
      return;
    }

    if (
      !deleteOptions.deleteTransactions &&
      dependencies.transactions.length > 0
    ) {
      setMessage({
        type: "error",
        text: "You must select to delete transactions or handle them separately",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await deletePartyWithDependenciesAction(
        parseInt(partyId),
        deleteOptions
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Party deleted successfully",
        });
        setDependencies(null);
        setPartyId("");
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to delete party",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while deleting party",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeJobSheetReference = async (jobSheetId: number) => {
    setLoading(true);

    try {
      const result = await removeJobSheetPartyReferenceAction(jobSheetId);

      if (result.success) {
        setMessage({
          type: "success",
          text: "Party reference removed from job sheet",
        });
        // Refresh dependencies
        await checkDependencies();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to remove party reference",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while removing party reference",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Party Foreign Key Constraint Helper
        </h1>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            What is this error?
          </h2>
          <p className="text-blue-700">
            The error "update or delete on table 'parties' violates foreign key
            constraint" occurs because there are job sheets, transactions, or
            orders that reference the party you're trying to delete. The
            database protects data integrity by preventing deletion of
            referenced records.
          </p>
        </div>

        {/* Party ID Input */}
        <div className="mb-6">
          <label
            htmlFor="partyId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Enter Party ID to Check Dependencies:
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              id="partyId"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter party ID"
            />
            <button
              onClick={checkDependencies}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Checking..." : "Check Dependencies"}
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`p-4 rounded-md mb-6 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : message.type === "error"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Dependencies Display */}
        {dependencies && (
          <div className="space-y-6">
            {/* Job Sheets */}
            {dependencies.jobSheets.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Job Sheets ({dependencies.jobSheets.length})
                </h3>
                <div className="space-y-2">
                  {dependencies.jobSheets.map((jobSheet) => (
                    <div
                      key={jobSheet.id}
                      className="bg-white p-3 rounded border flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">Job Sheet #{jobSheet.id}</p>
                        <p className="text-sm text-gray-600">
                          {jobSheet.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          Date:{" "}
                          {new Date(jobSheet.job_date).toLocaleDateString()} |
                          Total: ₹
                          {(
                            (jobSheet.printing || 0) +
                            (jobSheet.uv || 0) +
                            (jobSheet.baking || 0)
                          ).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeJobSheetReference(jobSheet.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
                      >
                        Remove Party Reference
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions */}
            {dependencies.transactions.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Transactions ({dependencies.transactions.length})
                </h3>
                <div className="space-y-2">
                  {dependencies.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-white p-3 rounded border"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium capitalize">
                            {transaction.type}
                          </p>
                          <p className="text-sm text-gray-600">
                            {transaction.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ₹{transaction.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders */}
            {dependencies.orders.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Orders ({dependencies.orders.length})
                </h3>
                <div className="space-y-2">
                  {dependencies.orders.map((order) => (
                    <div key={order.id} className="bg-white p-3 rounded border">
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">
                        {order.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        Amount: ₹{order.order_amount} | Status: {order.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete Options */}
            {(dependencies.jobSheets.length > 0 ||
              dependencies.transactions.length > 0 ||
              dependencies.orders.length > 0) && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-3">
                  ⚠️ Cascade Delete Options
                </h3>
                <p className="text-red-700 mb-4">
                  <strong>Warning:</strong> This will permanently delete the
                  selected data. This action cannot be undone!
                </p>

                <div className="space-y-2 mb-4">
                  {dependencies.jobSheets.length > 0 && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={deleteOptions.deleteJobSheets}
                        onChange={(e) =>
                          setDeleteOptions((prev) => ({
                            ...prev,
                            deleteJobSheets: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      Delete {dependencies.jobSheets.length} Job Sheet(s)
                    </label>
                  )}

                  {dependencies.transactions.length > 0 && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={deleteOptions.deleteTransactions}
                        onChange={(e) =>
                          setDeleteOptions((prev) => ({
                            ...prev,
                            deleteTransactions: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      Delete {dependencies.transactions.length} Transaction(s)
                    </label>
                  )}

                  {dependencies.orders.length > 0 && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={deleteOptions.deleteOrders}
                        onChange={(e) =>
                          setDeleteOptions((prev) => ({
                            ...prev,
                            deleteOrders: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      Delete {dependencies.orders.length} Order(s)
                    </label>
                  )}
                </div>

                <button
                  onClick={deletePartyWithOptions}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Delete Party with Selected Data"}
                </button>
              </div>
            )}

            {/* Success Case */}
            {dependencies.jobSheets.length === 0 &&
              dependencies.transactions.length === 0 &&
              dependencies.orders.length === 0 && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    ✅ Safe to Delete
                  </h3>
                  <p className="text-green-700 mb-4">
                    This party has no associated records and can be safely
                    deleted through the normal party management interface.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
