"use client";

import React, { useState } from "react";
import { X, UploadCloud, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { uploadAndAnalyze } from "@/lib/api";
import { AnalyzeResponse } from "@/types/api";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: AnalyzeResponse) => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
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
      const data = await uploadAndAnalyze(file, "kane-jones", periodLabel || undefined);
      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to analyze workbook.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-5 shadow-none">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upload Sales Register</h2>
              <p className="text-[11px] text-slate-500">Run pricing, volume & margin audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="mt-4 space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
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

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Period Label <span className="text-slate-400 font-normal">(optional, e.g. 2026-07)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 2026-07"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200/80 rounded-lg text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Analyzing Workbook..." : "Run Analysis"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
