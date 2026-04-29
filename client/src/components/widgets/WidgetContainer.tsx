import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, Settings } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { Widget } from '@/types';

interface WidgetContainerProps {
  widget: Widget;
  editMode: boolean;
  children: ReactNode;
  onRemove?: (id: string) => void;
  onSettings?: (widget: Widget) => void;
  onResizeStart?: (widget: Widget, e: React.PointerEvent) => void;
}

export default function WidgetContainer({
  widget,
  editMode,
  children,
  onRemove,
  onSettings,
  onResizeStart,
}: WidgetContainerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${widget.width}`,
    gridRow: `span ${Math.max(1, widget.height)}`,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={cn(
        'card relative flex flex-col overflow-hidden transition-shadow',
        editMode && 'border-dashed border-border-hover ring-1 ring-accent/20',
        isDragging && 'shadow-glow-lg z-50'
      )}
    >
      {/* Edit mode overlay controls */}
      {editMode && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing pointer-events-auto text-text-muted hover:text-accent transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Settings */}
          {onSettings && (
            <button
              onClick={() => onSettings(widget)}
              className="absolute top-2 right-8 pointer-events-auto text-text-muted hover:text-accent transition-colors p-1"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Remove */}
          {onRemove && (
            <button
              onClick={() => onRemove(widget.id)}
              className="absolute top-2 right-2 pointer-events-auto text-text-muted hover:text-priority-urgent transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Size label */}
          <div className="absolute bottom-6 left-2 pointer-events-none text-[10px] text-text-muted/60 font-mono leading-none">
            {widget.width}×{widget.height}
          </div>

          {/* Resize handle */}
          {onResizeStart && (
            <div
              className="absolute bottom-0 right-0 w-6 h-6 pointer-events-auto cursor-se-resize flex items-end justify-end p-1 text-text-muted hover:text-accent transition-colors"
              onPointerDown={(e) => onResizeStart(widget, e)}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 9L9 9L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 9L9 9L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
      )}

      <div className={cn('flex-1 flex flex-col min-h-0', editMode && 'pt-6')}>
        {children}
      </div>
    </motion.div>
  );
}
