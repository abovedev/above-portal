import { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export default function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-5xl',
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full mx-4',
                  sizes[size]
                )}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.15 }}
              >
                <div className={cn('bg-surface border border-border rounded-card shadow-card-hover', className)}>
                  {title && (
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <Dialog.Title className="font-heading font-semibold text-text-primary">
                        {title}
                      </Dialog.Title>
                      <Dialog.Close asChild>
                        <button
                          onClick={onClose}
                          className="text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg p-1.5 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </Dialog.Close>
                    </div>
                  )}
                  <div className="p-4">{children}</div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-text-secondary mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="btn-danger text-sm"
        >
          {loading ? 'Deleting...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
