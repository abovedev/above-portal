import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, arrayMove,
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
import api from '@/lib/api';
import type { Widget, WidgetType } from '@/types';

const WIDGET_LABELS: Record<string, string> = {
  CLOCK: 'Clock',
  ANNOUNCEMENTS: 'Announcements',
  TASKS: 'My Tasks',
  QUICK_LINKS: 'Quick Links',
  NOTES: 'Notes',
  STATS: 'My Stats',
  CALENDAR: 'Calendar',
  SYSTEM_STATS: 'System Stats',
  RECENT_ACTIVITY: 'Recent Activity',
};

export default function AdminDashboardPage() {
  const { widgets, setWidgets, removeWidget, addWidget } = useWidgetStore();
  const { boardEditMode, setBoardEditMode } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<Widget[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    api.get('/widgets').then((res) => {
      setWidgets(res.data.data.widgets);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [setWidgets]);

  useEffect(() => { setLocalWidgets(widgets); }, [widgets]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalWidgets((prev) => {
      const oi = prev.findIndex((w) => w.id === active.id);
      const ni = prev.findIndex((w) => w.id === over.id);
      return arrayMove(prev, oi, ni);
    });
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    const updated = localWidgets.map((w, i) => ({ ...w, order: i }));
    const payload = updated.map(({ id, positionX, positionY, width, height, order }) => ({ id, positionX, positionY, width, height, order }));
    try {
      const res = await api.put('/widgets/batch', payload);
      setWidgets(res.data.data.widgets);
      setBoardEditMode(false);
      toast.success('Board layout saved');
    } catch { toast.error('Failed to save layout'); }
    finally { setSaving(false); }
  };

  const handleAddWidget = async (type: WidgetType) => {
    try {
      const res = await api.post('/widgets', { type, title: WIDGET_LABELS[type] || type, settings: {}, width: 4, height: 3, order: widgets.length, positionX: 0, positionY: 0 });
      addWidget(res.data.data.widget);
      setLocalWidgets((prev) => [...prev, res.data.data.widget]);
      toast.success('Widget added');
    } catch { toast.error('Failed to add widget'); }
  };

  const handleRemoveWidget = async (id: string) => {
    setLocalWidgets((prev) => prev.filter((w) => w.id !== id));
    removeWidget(id);
    try { await api.delete(`/widgets/${id}`); toast.success('Widget removed'); }
    catch { toast.error('Failed to remove widget'); }
  };

  const display = boardEditMode ? localWidgets : widgets;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Admin Dashboard"
        actions={
          boardEditMode ? (
            <>
              <button onClick={() => { setLocalWidgets(widgets); setBoardEditMode(false); }} className="btn-ghost text-sm">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSaveLayout} disabled={saving} className="btn-primary text-sm">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Layout'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setAddOpen(true)} className="btn-ghost text-sm">
                <Plus className="w-4 h-4" /> Add Widget
              </button>
              <button onClick={() => { setLocalWidgets(widgets); setBoardEditMode(true); }} className="btn-outline text-sm">
                <Pencil className="w-4 h-4" /> Customize
              </button>
            </>
          )
        }
      />

      {boardEditMode && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/10 border-b border-accent/30 px-6 py-2 flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5 text-accent" />
          <span className="text-accent text-sm font-medium">Edit Mode — drag to rearrange, click × to remove</span>
        </motion.div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="grid grid-cols-12 gap-4">
            {[3, 6, 3, 4, 4, 4].map((span, i) => (
              <div key={i} style={{ gridColumn: `span ${span}` }}><WidgetSkeleton /></div>
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={display.map((w) => w.id)} strategy={rectSortingStrategy}>
              <div data-tour="admin-stats" className="grid grid-cols-12 gap-4 auto-rows-[120px]">
                <AnimatePresence>
                  {display.map((widget) => (
                    <WidgetContainer key={widget.id} widget={widget} editMode={boardEditMode} onRemove={boardEditMode ? handleRemoveWidget : undefined}>
                      <WidgetRenderer widget={widget} />
                    </WidgetContainer>
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <AddWidgetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddWidget}
        existingTypes={widgets.map((w) => w.type)}
        isAdmin
      />
    </div>
  );
}
