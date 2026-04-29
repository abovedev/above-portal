import { create } from 'zustand';
import { Widget } from '@/types';

interface WidgetState {
  widgets: Widget[];
  pendingLayout: Widget[] | null;
  setWidgets: (widgets: Widget[]) => void;
  updateWidget: (id: string, data: Partial<Widget>) => void;
  removeWidget: (id: string) => void;
  addWidget: (widget: Widget) => void;
  setPendingLayout: (layout: Widget[] | null) => void;
  applyPendingLayout: () => void;
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
  widgets: [],
  pendingLayout: null,
  setWidgets: (widgets) => set({ widgets }),
  updateWidget: (id, data) =>
    set((s) => ({
      widgets: s.widgets.map((w) => (w.id === id ? { ...w, ...data } : w)),
    })),
  removeWidget: (id) =>
    set((s) => ({ widgets: s.widgets.filter((w) => w.id !== id) })),
  addWidget: (widget) =>
    set((s) => ({ widgets: [...s.widgets, widget] })),
  setPendingLayout: (pendingLayout) => set({ pendingLayout }),
  applyPendingLayout: () =>
    set((s) => ({
      widgets: s.pendingLayout ?? s.widgets,
      pendingLayout: null,
    })),
}));
