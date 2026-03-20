import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, X } from 'lucide-react';

/**
 * A styled confirmation dialog to replace native window.confirm/window.prompt.
 *
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string | ReactNode
 *  - confirmLabel: string (default "Confirm")
 *  - cancelLabel: string (default "Cancel")
 *  - variant: "danger" | "info" (default "info")
 *  - onConfirm: () => void
 *  - onCancel: () => void
 *  - children: optional extra content (e.g. input fields)
 */
const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
  children,
}) => {
  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-full ${
                    isDanger ? 'bg-red-100' : 'bg-blue-100'
                  }`}
                >
                  {isDanger ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Message */}
            {message && (
              <p className="text-sm text-slate-600 mb-4">{message}</p>
            )}

            {/* Extra content (inputs, etc.) */}
            {children && <div className="mb-4">{children}</div>}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                  isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
