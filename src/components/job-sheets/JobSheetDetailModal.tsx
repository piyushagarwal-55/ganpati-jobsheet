"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default function JobSheetDetailModal({ open, onClose, sheet }) {
  if (!sheet) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Job Sheet Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <b>Date:</b> {sheet.job_date ? sheet.job_date.slice(0, 10) : ""}
          </div>
          <div>
            <b>Description:</b> {sheet.description}
          </div>
          <div>
            <b>Sheet:</b> {sheet.sheet}
          </div>
          <div>
            <b>Plate:</b> {sheet.plate}
          </div>
          <div>
            <b>Size:</b> {sheet.size}
          </div>
          <div>
            <b>Sq inch:</b> {sheet.sq_inch}
          </div>
          <div>
            <b>Paper Sheet:</b> {sheet.paper_sheet}
          </div>
          <div>
            <b>Imp.:</b> {sheet.imp}
          </div>
          <div>
            <b>Rate:</b> {sheet.rate}
          </div>
          <div>
            <b>Printing:</b> {sheet.printing}
          </div>
          <div>
            <b>UV:</b> {sheet.uv}
          </div>
          <div>
            <b>Baking:</b> {sheet.baking}
          </div>
          {sheet.paper_provided_by_party && (
            <>
              <div>
                <b>Paper By Party:</b> Yes
              </div>
              <div>
                <b>Paper Type:</b> {sheet.paper_type}
              </div>
              <div>
                <b>Paper Size:</b> {sheet.paper_size}
              </div>
              <div>
                <b>Paper GSM:</b> {sheet.paper_gsm}
              </div>
            </>
          )}
          <div className="col-span-2">
            <b>File:</b>{" "}
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
                    className="w-24 h-24 object-cover rounded mt-2"
                  />
                </a>
              ) : (
                <a
                  href={sheet.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline flex items-center gap-1 mt-2"
                >
                  <FileText className="w-4 h-4" />
                  View File
                </a>
              )
            ) : (
              "-"
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 