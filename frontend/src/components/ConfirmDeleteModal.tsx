import { X, Trash2 } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';


type Props = {
  open: boolean;
  title?: string;
  message?: string;
  detail?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'success';
};

export default function ConfirmDeleteModal({
  open,
  title = 'Delete',
  message = 'Do you really want to delete this item?',
  detail,
  onCancel,
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: Props) {
  useEscapeKey(onCancel, open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="bg-white w-full max-w-md md:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto min-h-0 custom-scrollbar">
          <p className="text-base text-slate-700 leading-relaxed">{message}</p>
          {variant === 'danger' && (
            <p className="text-sm text-slate-500 mt-2">It will be moved to Trash for 30 days.</p>
          )}
          {detail && (
            <div className="mt-4 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm font-medium text-slate-700">{detail}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium flex-1 md:flex-none"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-lg transition-all font-medium flex-1 md:flex-none shadow-sm ${variant === 'success'
                ? 'bg-green-600 hover:bg-green-700 hover:shadow-md'
                : 'bg-red-600 hover:bg-red-700 hover:shadow-md'
              }`}
          >
            {variant === 'danger' && <Trash2 className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
