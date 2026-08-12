"use client";

import React, { useState } from "react";
import { X, UploadCloud, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { uploadAndAnalyze } from "@/lib/api";
import { AnalyzeResponse } from "@/types/api";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: AnalyzeResponse) => void;
  clientId?: string;
}

export function UploadModal({ isOpen, onClose, onSuccess, clientId = "kane-jones" }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [auditTitle, setAuditTitle] = useState<string>("");
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.match(/\.(xlsx|xlsm|xltx|xltm)$/i)) {
        setError("Please select an Excel workbook (.xlsx).");
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await uploadAndAnalyze(
        file,
        clientId,
        periodLabel.trim() || undefined,
        auditTitle.trim() || undefined
      );
      onSuccess(data);
      onClose();
      // Reset form
      setFile(null);
      setAuditTitle("");
      setPeriodLabel("");
    } catch (err: any) {
      setError(err.message || "Failed to analyze workbook.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-800">
              <FileSpreadsheet className="w-5 h-5 text-slate-800" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upload Sales Register</h2>
              <p className="text-[11px] text-slate-500">Run pricing, volume & margin audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleUpload} className="space-y-4">
          {/* File Upload Box */}
          <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-5 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              id="file-upload"
              accept=".xlsx,.xlsm"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
              {file ? (
                <div className="text-xs font-semibold text-slate-800">
                  {file.name}
                  <span className="block text-[11px] text-slate-400 font-normal">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-xs font-semibold text-slate-700">
                    Click to browse sales spreadsheet
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Supports Kane-Jones formatted .xlsx workbooks
                  </span>
                </>
              )}
            </label>
          </div>

          {/* Audit Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Audit Title
            </label>
            <input
              type="text"
              placeholder="e.g. August 2026 Full Audit"
              value={auditTitle}
              onChange={(e) => setAuditTitle(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Period Label Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Period Label <span className="text-slate-400 font-normal">(e.g. 2026-08)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 2026-08"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Auditing Spreadsheet..." : "Run Analysis"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
