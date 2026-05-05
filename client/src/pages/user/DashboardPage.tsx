import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, Save, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import Topbar from '@/components/layout/Topbar';
import WidgetContainer from '@/components/widgets/WidgetContainer';
import WidgetRenderer from '@/components/widgets/WidgetRenderer';
import AddWidgetModal from '@/components/widgets/AddWidgetModal';
import { WidgetSkeleton } from '@/components/ui/Skeleton';
import { useWidgetStore } from '@/stores/widgetStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { Widget, WidgetType } from '@/types';

const WIDGET_LABELS: Record<WidgetType, string> = {
  CLOCK: 'Clock',
  WEATHER: 'Weather',
  ANNOUNCEMENTS: 'Announcements',
  QUICK_LINKS: 'Quick Links',
  TASKS: 'My Tasks',
  CALENDAR: 'Google Calendar',
  NOTES: 'Notes',
  STATS: 'My Stats',
  SYSTEM_STATS: 'System Stats',
  RECENT_ACTIVITY: 'Recent Activity',
  USER_GROWTH: 'User Growth',
  PAGE_VIEWS: 'Page Views',
  GMAIL: 'Gmail',
  GCHAT: 'Google Chat',
  AI_CHAT: 'AI Assistant',
};

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { widgets, setWidgets, removeWidget, addWidget, pendingLayout, setPendingLayout } = useWidgetStore();
  const { boardEditMode, setBoardEditMode } = useUIStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<Widget[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const googleStatus = searchParams.get('google');
    if (googleStatus === 'connected') {
      toast.success('Google account connected');
      setSearchParams({}, { replace: true });
    } else if (googleStatus === 'error') {
      toast.error('Google connection failed');
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    api.get('/widgets').then((res) => {
      setWidgets(res.data.data.widgets);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [setWidgets]);

  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalWidgets((prev) => {
      const oldIdx = prev.findIndex((w) => w.id === active.id);
      const newIdx = prev.findIndex((w) => w.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleEnterEdit = () => {
    setLocalWidgets(widgets);
    setBoardEditMode(true);
  };

  const handleCancelEdit = () => {
    setLocalWidgets(widgets);
    setBoardEditMode(false);
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    const updated = localWidgets.map((w, i) => ({ ...w, order: i }));
    const payload = updated.map(({ id, positionX, positionY, width, height, order }) => ({
      id, positionX, positionY, width, height, order,
    }));
    try {
      const res = await api.put('/widgets/batch', payload);
      setWidgets(res.data.data.widgets);
      setBoardEditMode(false);
      toast.success('Board layout saved');
    } catch {
      toast.error('Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWidget = async (type: WidgetType) => {
    try {
      const res = await api.post('/widgets', {
        type,
        title: WIDGET_LABELS[type],
        settings: {},
        width: 4,
        height: 3,
        order: widgets.length,
        positionX: 0,
        positionY: 0,
      });
      addWidget(res.data.data.widget);
      setLocalWidgets((prev) => [...prev, res.data.data.widget]);
      toast.success(`${WIDGET_LABELS[type]} added to board`);
    } catch {
      toast.error('Failed to add widget');
    }
  };

  const handleResizeStart = useCallback((widget: Widget, e: React.PointerEvent) => {
    if (!gridRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = widget.width;
    const startHeight = widget.height;
    const gridWidth = gridRef.current.clientWidth;
    // 12 columns, 11 gaps of 16px (gap-4)
    const colWidth = (gridWidth - 11 * 16) / 12;
    // auto-rows-[120px] + 16px gap
    const rowHeight = 136;

    const handleMove = (moveE: PointerEvent) => {
      const dCols = Math.round((moveE.clientX - startX) / colWidth);
      const dRows = Math.round((moveE.clientY - startY) / rowHeight);
      const newWidth = Math.max(2, Math.min(12, startWidth + dCols));
      const newHeight = Math.max(1, Math.min(8, startHeight + dRows));
      setLocalWidgets((prev) =>
        prev.map((w) => (w.id === widget.id ? { ...w, width: newWidth, height: newHeight } : w))
      );
    };

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, []);

  const handleRemoveWidget = async (id: string) => {
    setLocalWidgets((prev) => prev.filter((w) => w.id !== id));
    removeWidget(id);
    try {
      await api.delete(`/widgets/${id}`);
      toast.success('Widget removed');
    } catch {
      toast.error('Failed to remove widget');
    }
  };

  const displayWidgets = boardEditMode ? localWidgets : widgets;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Dashboard"
        actions={
          boardEditMode ? (
            <>
              <button onClick={handleCancelEdit} className="btn-ghost text-sm flex items-center gap-1.5">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSaveLayout}
                disabled={saving}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
            </>
          ) : (
            <>
              <button data-tour="add-widget" onClick={() => setAddOpen(true)} className="btn-ghost text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Widget
              </button>
              <button data-tour="customize" onClick={handleEnterEdit} className="btn-outline text-sm flex items-center gap-1.5">
                <Pencil className="w-4 h-4" /> Customize
              </button>
            </>
          )
        }
      />

      {boardEditMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent/10 border-b border-accent/30 px-6 py-2 flex items-center gap-2"
        >
          <Pencil className="w-3.5 h-3.5 text-accent" />
          <span className="text-accent text-sm font-medium">Edit Mode — drag to rearrange, drag corner to resize, × to remove</span>
        </motion.div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="grid grid-cols-12 gap-4">
            {[3, 6, 3, 4, 4, 4].map((span, i) => (
              <div key={i} style={{ gridColumn: `span ${span}` }}>
                <WidgetSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
              <div ref={gridRef} data-tour="widget-grid" className="grid grid-cols-12 gap-4 auto-rows-[120px]">
                <AnimatePresence>
                  {displayWidgets.map((widget) => (
                    <WidgetContainer
                      key={widget.id}
                      widget={widget}
                      editMode={boardEditMode}
                      onRemove={boardEditMode ? handleRemoveWidget : undefined}
                      onResizeStart={boardEditMode ? handleResizeStart : undefined}
                    >
                      <WidgetRenderer widget={widget} />
                    </WidgetContainer>
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!loading && displayWidgets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-6xl">📊</div>
            <h3 className="font-heading font-semibold text-text-primary">Your board is empty</h3>
            <p className="text-text-secondary text-sm">Add widgets to customize your dashboard</p>
            <button onClick={() => setAddOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Widget
            </button>
          </div>
        )}
      </div>

      <AddWidgetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddWidget}
        existingTypes={widgets.map((w) => w.type)}
        isAdmin={user?.role === 'ADMIN'}
      />
    </div>
  );
}
