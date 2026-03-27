'use client';

import { ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" className="rounded-full border border-slate-300 px-3 py-1 text-sm" onClick={onClose}>Close</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
        {footer ? <div className="mt-4 border-t border-slate-200 pt-3">{footer}</div> : null}
      </div>
    </div>
  );
}
