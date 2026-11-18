'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Təsdiq et',
  cancelText = 'Ləğv et',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-[#FFFFFF] border border-[rgba(26,19,12,0.12)] rounded-2xl p-6 sm:p-7 shadow-2xl text-[#1E2A22] animate-in fade-in zoom-in-98 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full border ${
                isDestructive
                  ? 'bg-[#B3261E]/10 border-[#B3261E]/25 text-[#B3261E]'
                  : 'bg-[#2F5D46]/10 border-[#2F5D46]/25 text-[#2F5D46]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif-heading font-medium text-[#1E2A22]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-[#5E6B62] hover:text-[#1E2A22] transition-colors p-1.5 rounded-full hover:bg-[rgba(26,19,12,0.05)] cursor-pointer"
            aria-label="Bağla"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-[#5E6B62] leading-relaxed">{description}</p>

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[rgba(26,19,12,0.08)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-[#1E2A22] bg-transparent hover:bg-[#2F5D46]/20 border border-[rgba(26,19,12,0.20)] rounded-full transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-xs ${
              isDestructive
                ? 'bg-[#B3261E] hover:bg-[#8C1D18] text-white border border-[#B3261E]'
                : 'bg-[#2F5D46] hover:bg-[#254B38] text-[#1E2A22] border border-[#2F5D46]'
            }`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
