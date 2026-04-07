import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean; // Uses red styling for destructive actions
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      ></div>
      
      {/* Dialog content */}
      <div className="bg-white dark:bg-[#18181b] border border-transparent dark:border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10 shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDangerous ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            
            <div className="flex-1 mt-0.5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
            </div>

            {/* Close button */}
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50/50 dark:bg-[#121214] border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onCancel(); }} 
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-sm ${
              isDangerous 
                ? 'bg-red-500 hover:bg-red-600 border border-transparent hover:border-red-600' 
                : 'bg-purple-600 hover:bg-purple-700 border border-transparent hover:border-purple-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}