import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Package, Edit2, Trash2, CheckSquare, RotateCcw,
  Filter, AlertTriangle, ChevronRight, CircleCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { EmptyState, TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import type { GearItem, GearStatus, GearCondition, GearStats } from '@/types';
import { GEAR_CATEGORIES } from '@/types';

const STATUS_COLORS: Record<GearStatus, string> = {
  AVAILABLE:      'bg-priority-low/15 text-priority-low',
  CHECKED_OUT:    'bg-priority-high/15 text-priority-high',
  RESERVED:       'bg-priority-medium/15 text-priority-medium',
  RETURN_PENDING: 'bg-accent/15 text-accent',
  MAINTENANCE:    'bg-accent-muted text-accent',
  RETIRED:        'bg-surface-elevated text-text-muted',
};

const STATUS_LABELS: Record<GearStatus, string> = {
  AVAILABLE: 'Available', CHECKED_OUT: 'Checked Out',
  RESERVED: 'Reserved', RETURN_PENDING: 'Return Pending',
  MAINTENANCE: 'Maintenance', RETIRED: 'Retired',
};

const CONDITIONS: GearCondition[] = ['New', 'Good', 'Fair', 'Poor'];

const defaultForm = {
  name: '', brand: '', model: '', category: 'Other', serialNumber: '', imei: '',
  assetTag: '', description: '', notes: '', purchaseDate: '', purchaseCost: '',
  vendor: '', warrantyExpiry: '', condition: 'Good' as GearCondition, location: '',
};

export default function AdminGearPage() {
  const [items, setItems] = useState<GearItem[]>([]);
  const [stats, setStats] = useState<GearStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<GearItem | null>(null);
  const [detailItem, setDetailItem] = useState<GearItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState<GearItem | null>(null);
  const [returnItem, setReturnItem] = useState<GearItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [checkoutUserId, setCheckoutUserId] = useState('');
  const [checkoutDue, setCheckoutDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        api.get('/gear', { params: { search: search || undefined, category: categoryFilter || undefined, status: statusFilter || undefined } }),
        api.get('/gear/stats'),
      ]);
      setItems(itemsRes.data.data.items);
      setStats(statsRes.data.data);
    } catch { toast.error('Failed to load gear'); }
    finally { setLoading(false); }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/users').then((r) => setUsers(r.data.data.users)).catch(() => {});
  }, []);

  const openCreate = () => { setForm(defaultForm); setEditItem(null); setFormOpen(true); };
  const openEdit = (item: GearItem) => {
    setEditItem(item);
    setForm({
      name: item.name, brand: item.brand || '', model: item.model || '',
      category: item.category, serialNumber: item.serialNumber || '',
      imei: item.imei || '', assetTag: item.assetTag || '',
      description: item.description || '', notes: item.notes || '',
      purchaseDate: item.purchaseDate ? item.purchaseDate.slice(0, 10) : '',
      purchaseCost: item.purchaseCost?.toString() || '',
      vendor: item.vendor || '',
      warrantyExpiry: item.warrantyExpiry ? item.warrantyExpiry.slice(0, 10) : '',
      condition: item.condition as GearCondition, location: item.location || '',
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
      };
      if (editItem) {
        await api.put(`/gear/${editItem.id}`, payload);
        toast.success('Gear updated');
      } else {
        await api.post('/gear', payload);
        toast.success('Gear created');
      }
      setFormOpen(false);
      load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/gear/${deleteId}`);
      toast.success('Gear deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const handleCheckout = async () => {
    if (!checkoutOpen || !checkoutUserId) return toast.error('Select a user');
    setSaving(true);
    try {
      await api.post(`/gear/${checkoutOpen.id}/checkout`, { userId: checkoutUserId, dueDate: checkoutDue || undefined });
      toast.success('Gear checked out');
      setCheckoutOpen(null); setCheckoutUserId(''); setCheckoutDue('');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleReturn = async () => {
    if (!returnItem) return;
    setSaving(true);
    try {
      await api.post(`/gear/${returnItem.id}/confirm-return`);
      toast.success('Return confirmed — gear is now available');
      setReturnItem(null);
      load();
    } catch { toast.error('Failed to confirm return'); }
    finally { setSaving(false); }
  };

  const markAvailable = async (item: GearItem) => {
    try {
      await api.put(`/gear/${item.id}`, { status: 'AVAILABLE' });
      toast.success(`${item.name} marked as available`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Gear Management"
        actions={
          <button data-tour="new-gear" onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Gear
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Total', value: stats.total, color: 'text-text-primary' },
              { label: 'Available', value: stats.available, color: 'text-priority-low' },
              { label: 'Checked Out', value: stats.checkedOut, color: 'text-priority-high' },
              { label: 'Reserved', value: stats.reserved, color: 'text-priority-medium' },
              { label: 'Return Pending', value: stats.returnPending, color: 'text-accent', highlight: stats.returnPending > 0 },
              { label: 'Maintenance', value: stats.maintenance, color: 'text-text-muted' },
              { label: 'Pending Req.', value: stats.pendingRequests, color: 'text-priority-urgent', highlight: stats.pendingRequests > 0 },
            ].map(({ label, value, color, highlight }) => (
              <div key={label} className={`card p-4 text-center ${highlight ? 'border-accent/30' : ''}`}>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gear..."
              className="input pl-9 h-9 text-sm w-56"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-text-muted" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input h-9 text-sm w-36">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input h-9 text-sm w-36">
              <option value="">All Statuses</option>
              {(Object.keys(STATUS_LABELS) as GearStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <span className="ml-auto text-sm text-text-muted">{items.length} items</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card overflow-hidden">
            <table className="w-full"><tbody>{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}</tbody></table>
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Package} title="No gear found" description="Add your first piece of equipment to get started" />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Item', 'Category', 'Asset Tag', 'Status', 'Assigned To', 'Warranty', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {items.map((item) => {
                    const activeAssignment = item.assignments?.[0];
                    const warrantyExpired = item.warrantyExpiry && new Date(item.warrantyExpiry) < new Date();
                    const warrantySoon = item.warrantyExpiry && !warrantyExpired &&
                      new Date(item.warrantyExpiry) < new Date(Date.now() + 30 * 86400000);
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                      >
                        <td className="px-4 py-3">
                          <button onClick={() => setDetailItem(item)} className="text-left group">
                            <p className="font-medium text-text-primary group-hover:text-accent transition-colors flex items-center gap-1">
                              {item.name} <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            {item.brand && <p className="text-xs text-text-muted">{item.brand}{item.model ? ` · ${item.model}` : ''}</p>}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{item.category}</td>
                        <td className="px-4 py-3 text-sm text-text-muted font-mono">{item.assetTag || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                        </td>
                        <td className="px-4 py-3">
                          {activeAssignment ? (
                            <div className="flex items-center gap-2">
                              <Avatar src={activeAssignment.user.avatar} firstName={activeAssignment.user.firstName} lastName={activeAssignment.user.lastName} size="xs" />
                              <span className="text-xs text-text-secondary">{activeAssignment.user.firstName} {activeAssignment.user.lastName}</span>
                            </div>
                          ) : <span className="text-xs text-text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.warrantyExpiry ? (
                            <span className={warrantyExpired ? 'text-priority-urgent' : warrantySoon ? 'text-priority-medium' : 'text-text-muted'}>
                              {warrantyExpired ? '⚠ Expired ' : warrantySoon ? '⚠ ' : ''}{formatDate(item.warrantyExpiry, 'short')}
                            </span>
                          ) : <span className="text-text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {item.status === 'AVAILABLE' && (
                              <button onClick={() => { setCheckoutOpen(item); setCheckoutUserId(''); setCheckoutDue(''); }}
                                className="p-1.5 text-text-muted hover:text-priority-low transition-colors rounded hover:bg-surface-hover" title="Checkout">
                                <CheckSquare className="w-4 h-4" />
                              </button>
                            )}
                            {item.status === 'RETURN_PENDING' && (
                              <button onClick={() => setReturnItem(item)}
                                className="p-1.5 text-accent hover:text-priority-low transition-colors rounded hover:bg-surface-hover" title="Confirm Return">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {(item.status === 'CHECKED_OUT' || item.status === 'RESERVED') && (
                              <button onClick={() => setReturnItem(item)}
                                className="p-1.5 text-text-muted hover:text-accent transition-colors rounded hover:bg-surface-hover" title="Mark Returned">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {(item.status === 'MAINTENANCE' || item.status === 'RETIRED') && (
                              <button onClick={() => markAvailable(item)}
                                className="p-1.5 text-text-muted hover:text-priority-low transition-colors rounded hover:bg-surface-hover" title="Mark Available">
                                <CircleCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => openEdit(item)}
                              className="p-1.5 text-text-muted hover:text-accent transition-colors rounded hover:bg-surface-hover" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteId(item.id)}
                              className="p-1.5 text-text-muted hover:text-priority-urgent transition-colors rounded hover:bg-surface-hover" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Gear' : 'Add New Gear'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. MacBook Pro 14-inch" required />
            </div>
            <div>
              <label className="label">Brand</label>
              <input className="input" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Apple" />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="MBP14 M3 Pro" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {GEAR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as GearCondition }))}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input className="input" value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} placeholder="SN12345678" />
            </div>
            <div>
              <label className="label">IMEI <span className="text-text-muted text-xs">(phones)</span></label>
              <input className="input" value={form.imei} onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))} placeholder="35 digits" />
            </div>
            <div>
              <label className="label">Asset Tag</label>
              <input className="input" value={form.assetTag} onChange={(e) => setForm((f) => ({ ...f, assetTag: e.target.value }))} placeholder="ASSET-001" />
            </div>
            <div>
              <label className="label">Storage Location</label>
              <input className="input" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Server Room Shelf B" />
            </div>
            <div>
              <label className="label">Purchase Date</label>
              <input type="date" className="input" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Purchase Cost ($)</label>
              <input type="number" step="0.01" className="input" value={form.purchaseCost} onChange={(e) => setForm((f) => ({ ...f, purchaseCost: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Vendor / Supplier</label>
              <input className="input" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="JB Hi-Fi" />
            </div>
            <div>
              <label className="label">Warranty Expiry</label>
              <input type="date" className="input" value={form.warrantyExpiry} onChange={(e) => setForm((f) => ({ ...f, warrantyExpiry: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input min-h-16 resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description of the item..." />
            </div>
            <div className="col-span-2">
              <label className="label">Internal Notes</label>
              <textarea className="input min-h-16 resize-none" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Known issues, accessories included, etc." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Gear'}</button>
          </div>
        </form>
      </Modal>

      {/* Checkout Modal */}
      <Modal open={!!checkoutOpen} onClose={() => setCheckoutOpen(null)} title={`Check Out — ${checkoutOpen?.name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Assign To *</label>
            <select className="input" value={checkoutUserId} onChange={(e) => setCheckoutUserId(e.target.value)}>
              <option value="">Select a user...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due Date <span className="text-text-muted text-xs">(optional)</span></label>
            <input type="date" className="input" value={checkoutDue} onChange={(e) => setCheckoutDue(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCheckoutOpen(null)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleCheckout} disabled={saving} className="btn-primary text-sm">{saving ? 'Checking out...' : 'Confirm Checkout'}</button>
          </div>
        </div>
      </Modal>

      {/* Return Confirm */}
      <Modal open={!!returnItem} onClose={() => setReturnItem(null)} title="Confirm Return" size="sm">
        <div className="space-y-4">
          {returnItem?.status === 'RETURN_PENDING' ? (
            <p className="text-sm text-text-secondary">
              Confirm you've received <strong className="text-text-primary">{returnItem?.name}</strong> back. This will set it to Available and notify the user.
            </p>
          ) : (
            <p className="text-sm text-text-secondary">
              Mark <strong className="text-text-primary">{returnItem?.name}</strong> as returned and set it back to Available?
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setReturnItem(null)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleReturn} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Confirming...' : returnItem?.status === 'RETURN_PENDING' ? 'Confirm Receipt' : 'Mark Returned'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Gear" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-priority-urgent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">This will permanently delete the gear item and all its history. This cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteId(null)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm">{deleting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>

      {/* Detail Drawer */}
      <AnimatePresence>
        {detailItem && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailItem(null)} />
            <motion.aside
              className="fixed right-0 top-0 h-full w-96 bg-surface border-l border-border z-50 flex flex-col shadow-card-hover overflow-y-auto"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <h2 className="font-heading font-semibold text-text-primary">{detailItem.name}</h2>
                <button onClick={() => setDetailItem(null)} className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-hover transition-all">×</button>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <span className={`badge ${STATUS_COLORS[detailItem.status]}`}>{STATUS_LABELS[detailItem.status]}</span>
                  <span className="badge bg-surface-elevated text-text-secondary">{detailItem.condition}</span>
                  <span className="badge bg-surface-elevated text-text-secondary">{detailItem.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Brand', value: detailItem.brand },
                    { label: 'Model', value: detailItem.model },
                    { label: 'Serial No.', value: detailItem.serialNumber },
                    { label: 'IMEI', value: detailItem.imei },
                    { label: 'Asset Tag', value: detailItem.assetTag },
                    { label: 'Location', value: detailItem.location },
                    { label: 'Vendor', value: detailItem.vendor },
                    { label: 'Purchase Cost', value: detailItem.purchaseCost ? `$${detailItem.purchaseCost.toLocaleString()}` : null },
                    { label: 'Purchase Date', value: detailItem.purchaseDate ? formatDate(detailItem.purchaseDate, 'short') : null },
                    { label: 'Warranty Expiry', value: detailItem.warrantyExpiry ? formatDate(detailItem.warrantyExpiry, 'short') : null },
                  ].filter((r) => r.value).map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-text-muted">{label}</p>
                      <p className="text-sm text-text-primary font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                {detailItem.description && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Description</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{detailItem.description}</p>
                  </div>
                )}
                {detailItem.notes && (
                  <div className="bg-accent/5 border border-accent/15 rounded-lg p-3">
                    <p className="text-xs text-accent mb-1 font-medium">Internal Notes</p>
                    <p className="text-sm text-text-secondary">{detailItem.notes}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setDetailItem(null); openEdit(detailItem); }} className="btn-outline text-sm flex-1">Edit Details</button>
                  {detailItem.status === 'AVAILABLE' && (
                    <button onClick={() => { setDetailItem(null); setCheckoutOpen(detailItem); }} className="btn-primary text-sm flex-1">Check Out</button>
                  )}
                  {(detailItem.status === 'CHECKED_OUT' || detailItem.status === 'RESERVED') && (
                    <button onClick={() => { setDetailItem(null); setReturnItem(detailItem); }} className="btn-primary text-sm flex-1">Mark Returned</button>
                  )}
                  {detailItem.status === 'RETURN_PENDING' && (
                    <button onClick={() => { setDetailItem(null); setReturnItem(detailItem); }} className="btn-primary text-sm flex-1">Confirm Return</button>
                  )}
                  {(detailItem.status === 'MAINTENANCE' || detailItem.status === 'RETIRED') && (
                    <button onClick={() => { setDetailItem(null); markAvailable(detailItem); }} className="btn-primary text-sm flex-1">Mark Available</button>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
