import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Search, Filter, CheckCircle, Clock, X, ChevronRight,
  AlertTriangle, Briefcase, PackageCheck, Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import type { GearItem, GearRequest, GearStatus, GearRequestStatus, GearAssignmentSummary } from '@/types';

const STATUS_COLORS: Record<GearStatus, string> = {
  AVAILABLE:      'bg-priority-low/15 text-priority-low',
  CHECKED_OUT:    'bg-priority-high/15 text-priority-high',
  RESERVED:       'bg-priority-medium/15 text-priority-medium',
  RETURN_PENDING: 'bg-accent/15 text-accent',
  MAINTENANCE:    'bg-accent-muted text-accent',
  RETIRED:        'bg-surface-elevated text-text-muted',
};

const STATUS_LABELS: Record<GearStatus, string> = {
  AVAILABLE: 'Available', CHECKED_OUT: 'In Use', RESERVED: 'Reserved',
  RETURN_PENDING: 'Return Pending', MAINTENANCE: 'Maintenance', RETIRED: 'Retired',
};

const REQ_COLORS: Record<GearRequestStatus, string> = {
  PENDING:   'bg-priority-medium/15 text-priority-medium',
  APPROVED:  'bg-priority-low/15 text-priority-low',
  DECLINED:  'bg-priority-urgent/15 text-priority-urgent',
  CANCELLED: 'bg-surface-elevated text-text-muted',
  COLLECTED: 'bg-surface-elevated text-text-muted',
};

const REQ_LABELS: Record<GearRequestStatus, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', DECLINED: 'Declined',
  CANCELLED: 'Cancelled', COLLECTED: 'Collected',
};

function GearCard({ item, onRequest, onDetail }: { item: GearItem; onRequest: () => void; onDetail: () => void }) {
  const isAvailable = item.status === 'AVAILABLE';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 flex flex-col gap-3 hover:border-border-hover hover:shadow-card-hover transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <button onClick={onDetail} className="text-left group">
            <p className="font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1 text-sm">
              {item.name} <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </button>
          {item.brand && <p className="text-xs text-text-muted mt-0.5">{item.brand}{item.model ? ` · ${item.model}` : ''}</p>}
        </div>
        <span className={`badge flex-shrink-0 ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="badge bg-surface-elevated text-text-secondary">{item.category}</span>
        <span className="badge bg-surface-elevated text-text-secondary">{item.condition}</span>
        {item.location && <span className="badge bg-surface-elevated text-text-muted">{item.location}</span>}
      </div>

      {item.description && <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{item.description}</p>}

      <button
        onClick={onRequest}
        disabled={!isAvailable}
        className={`mt-auto text-sm py-2 rounded-lg font-medium transition-all ${
          isAvailable
            ? 'btn-primary'
            : 'bg-surface-elevated text-text-muted cursor-not-allowed'
        }`}
      >
        {isAvailable ? 'Request to Use' : STATUS_LABELS[item.status]}
      </button>
    </motion.div>
  );
}

export default function GearPage() {
  const [tab, setTab] = useState<'catalog' | 'mine'>('catalog');
  const [items, setItems] = useState<GearItem[]>([]);
  const [myRequests, setMyRequests] = useState<GearRequest[]>([]);
  const [myGear, setMyGear] = useState<GearItem[]>([]);
  const [returnHistory, setReturnHistory] = useState<(GearAssignmentSummary & { returnedAt: string; gearItem: { id: string; name: string; brand?: string; category: string } })[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [requestItem, setRequestItem] = useState<GearItem | null>(null);
  const [detailItem, setDetailItem] = useState<GearItem | null>(null);
  const [requestForm, setRequestForm] = useState({ reason: '', startDate: '', endDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState('');
  const [pickingUp, setPickingUp] = useState('');
  const [returnItem, setReturnItem] = useState<GearItem | null>(null);
  const [returning, setReturning] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/gear', { params: { search: search || undefined, category: categoryFilter || undefined } });
      const all: GearItem[] = res.data.data.items ?? [];
      setItems(all.filter((i) => i.status !== 'RETIRED'));
      setMyGear(all.filter((i) => i.assignments && i.assignments.length > 0));
    } catch { toast.error('Failed to load gear'); }
    finally { setLoading(false); }
  }, [search, categoryFilter]);

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.get('/gear/requests');
      setMyRequests(res.data.data.requests);
    } catch {}
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/gear/my-history');
      setReturnHistory(res.data.data.assignments);
    } catch {}
  }, []);

  useEffect(() => { loadCatalog(); loadRequests(); loadHistory(); }, [loadCatalog, loadRequests, loadHistory]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestItem) return;
    if (requestForm.startDate && requestForm.endDate && requestForm.startDate > requestForm.endDate) {
      toast.error('End date must be after start date');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (requestForm.endDate && requestForm.endDate < today) {
      toast.error('End date cannot be in the past');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/gear/${requestItem.id}/request`, {
        reason: requestForm.reason || undefined,
        startDate: requestForm.startDate || undefined,
        endDate: requestForm.endDate || undefined,
      });
      toast.success('Request submitted! Admin will review it shortly.');
      setRequestItem(null);
      setRequestForm({ reason: '', startDate: '', endDate: '' });
      loadRequests();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit request';
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleReturn = async () => {
    if (!returnItem) return;
    setReturning(true);
    try {
      await api.post(`/gear/${returnItem.id}/return`);
      toast.success('Return requested — admin will confirm receipt shortly.');
      setReturnItem(null);
      loadCatalog();
      loadRequests();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to return gear';
      toast.error(msg);
    } finally { setReturning(false); }
  };

  const handlePickup = async (reqId: string) => {
    setPickingUp(reqId);
    try {
      await api.post(`/gear/requests/${reqId}/pickup`);
      toast.success('Gear checked out to you! Enjoy.');
      loadCatalog();
      loadRequests();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to confirm pickup';
      toast.error(msg);
    } finally { setPickingUp(''); }
  };

  const handleCancel = async (reqId: string) => {
    setCancelling(reqId);
    try {
      await api.delete(`/gear/requests/${reqId}`);
      toast.success('Request cancelled');
      loadRequests();
    } catch { toast.error('Failed to cancel'); }
    finally { setCancelling(''); }
  };

  const categories = [...new Set(items.map((i) => i.category))].sort();
  const pendingRequests = myRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Gear" />

      <div className="flex-1 overflow-auto">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-5 pb-0 border-b border-border">
          {(['catalog', 'mine'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? 'text-accent' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t === 'catalog' ? 'Gear Catalog' : 'My Gear & Requests'}
              {t === 'mine' && pendingRequests > 0 && (
                <span className="ml-1.5 badge bg-priority-medium/15 text-priority-medium">{pendingRequests}</span>
              )}
              {tab === t && (
                <motion.div layoutId="gear-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 36 }} />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {tab === 'catalog' ? (
              <motion.div key="catalog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search gear..." className="input pl-9 h-9 text-sm w-52" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-text-muted" />
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input h-9 text-sm w-36">
                      <option value="">All Categories</option>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <span className="ml-auto text-sm text-text-muted">{items.length} items</span>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="card p-4 space-y-3 animate-pulse">
                        <div className="h-4 bg-surface-elevated rounded w-3/4" />
                        <div className="h-3 bg-surface-elevated rounded w-1/2" />
                        <div className="h-8 bg-surface-elevated rounded" />
                      </div>
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <EmptyState icon={Package} title="No gear available" description="Check back later or contact your admin." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map((item) => (
                      <GearCard
                        key={item.id}
                        item={item}
                        onRequest={() => { setRequestItem(item); setRequestForm({ reason: '', startDate: '', endDate: '' }); }}
                        onDetail={() => setDetailItem(item)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="mine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Currently assigned */}
                <div>
                  <h2 className="font-heading font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-accent" /> Currently Assigned to Me
                  </h2>
                  {myGear.length === 0 ? (
                    <p className="text-sm text-text-muted">You have no gear currently checked out.</p>
                  ) : (
                    <div className="space-y-2">
                      {myGear.map((item) => {
                        const a = item.assignments?.[0];
                        if (!a) return null;
                        return (
                          <div key={item.id} className="card p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text-primary">{item.name}</p>
                              <p className="text-xs text-text-muted">{item.category}{item.brand ? ` · ${item.brand}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <span className={`badge ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                                <p className="text-xs text-text-muted mt-1">Since {formatDate(a.checkedOutAt, 'short')}</p>
                                {a.dueDate && (
                                  <p className={`text-xs mt-0.5 ${new Date(a.dueDate) < new Date() ? 'text-priority-urgent' : 'text-text-muted'}`}>
                                    Due {formatDate(a.dueDate, 'short')}
                                  </p>
                                )}
                              </div>
                              {item.status === 'RETURN_PENDING' ? (
                                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  Return Pending
                                </span>
                              ) : (
                                <button
                                  onClick={() => setReturnItem(item)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
                                  title="Request to return this gear"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  Return
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Return history */}
                {returnHistory.length > 0 && (
                  <div>
                    <h2 className="font-heading font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <Undo2 className="w-4 h-4 text-text-muted" /> Return History
                    </h2>
                    <div className="space-y-2">
                      {returnHistory.map((a) => (
                        <div key={a.id} className="card p-4 flex items-center gap-4 opacity-70">
                          <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary">{a.gearItem.name}</p>
                            <p className="text-xs text-text-muted">{a.gearItem.category}{a.gearItem.brand ? ` · ${a.gearItem.brand}` : ''}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="badge bg-surface-elevated text-text-muted">Returned</span>
                            <p className="text-xs text-text-muted mt-1">{formatDate(a.returnedAt!, 'short')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* My requests */}
                <div>
                  <h2 className="font-heading font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" /> My Requests
                  </h2>
                  {myRequests.length === 0 ? (
                    <p className="text-sm text-text-muted">You haven't made any gear requests yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {myRequests.map((req) => (
                        <div key={req.id} className="card p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary">{req.gearItem.name}</p>
                            <p className="text-xs text-text-muted">
                              {req.gearItem.category} · Requested {formatDate(req.createdAt, 'relative')}
                            </p>
                            {req.adminNote && (
                              <p className="text-xs text-text-secondary mt-1 italic">"{req.adminNote}"</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`badge ${REQ_COLORS[req.status]}`}>{REQ_LABELS[req.status]}</span>
                            {req.status === 'APPROVED' && (
                              <button
                                onClick={() => handlePickup(req.id)}
                                disabled={pickingUp === req.id}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-priority-low/15 text-priority-low hover:bg-priority-low/25 transition-colors text-xs font-medium"
                                title="Confirm you've collected this item"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                {pickingUp === req.id ? 'Confirming...' : 'Confirm Pickup'}
                              </button>
                            )}
                            {req.status === 'PENDING' && (
                              <button
                                onClick={() => handleCancel(req.id)}
                                disabled={cancelling === req.id}
                                className="p-1 text-text-muted hover:text-priority-urgent transition-colors rounded hover:bg-surface-hover"
                                title="Cancel request"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Return Confirm Modal */}
      <Modal open={!!returnItem} onClose={() => setReturnItem(null)} title="Return Gear" size="sm">
        {returnItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg">
              <Package className="w-5 h-5 text-text-muted flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">{returnItem.name}</p>
                <p className="text-xs text-text-muted">{returnItem.category}{returnItem.brand ? ` · ${returnItem.brand}` : ''}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-accent/5 border border-accent/15 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">This will notify the admin to confirm receipt. The gear will show as <strong>Return Pending</strong> until they approve it.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReturnItem(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleReturn} disabled={returning} className="btn-primary text-sm">
                {returning ? 'Requesting...' : 'Request Return'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Request Modal */}
      <Modal open={!!requestItem} onClose={() => setRequestItem(null)} title={`Request — ${requestItem?.name}`} size="sm">
        {requestItem && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg">
              <CheckCircle className="w-5 h-5 text-priority-low flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">{requestItem.name}</p>
                <p className="text-xs text-text-muted">{requestItem.category}{requestItem.brand ? ` · ${requestItem.brand}` : ''}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">From <span className="text-text-muted text-xs">(optional)</span></label>
                <input type="date" className="input text-sm" value={requestForm.startDate}
                  onChange={(e) => setRequestForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Until <span className="text-text-muted text-xs">(optional)</span></label>
                <input type="date" className="input text-sm" value={requestForm.endDate}
                  onChange={(e) => setRequestForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Reason / Project <span className="text-text-muted text-xs">(optional)</span></label>
              <textarea
                className="input min-h-16 resize-none text-sm"
                value={requestForm.reason}
                onChange={(e) => setRequestForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Client shoot on Thursday, need the camera kit"
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-accent/5 border border-accent/15 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">Your request will be sent to an admin for approval. You'll get a notification once it's reviewed.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRequestItem(null)} className="btn-ghost text-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary text-sm">{submitting ? 'Submitting...' : 'Submit Request'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Detail drawer */}
      <AnimatePresence>
        {detailItem && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailItem(null)} />
            <motion.aside
              className="fixed right-0 top-0 h-full w-80 bg-surface border-l border-border z-50 flex flex-col shadow-card-hover overflow-y-auto"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-heading font-semibold text-text-primary">{detailItem.name}</h2>
                <button onClick={() => setDetailItem(null)} className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-hover transition-all">×</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`badge ${STATUS_COLORS[detailItem.status]}`}>{STATUS_LABELS[detailItem.status]}</span>
                  <span className="badge bg-surface-elevated text-text-secondary">{detailItem.condition}</span>
                  <span className="badge bg-surface-elevated text-text-secondary">{detailItem.category}</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Brand', value: detailItem.brand },
                    { label: 'Model', value: detailItem.model },
                    { label: 'Location', value: detailItem.location },
                    { label: 'Serial No.', value: detailItem.serialNumber },
                  ].filter((r) => r.value).map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-text-muted">{label}</span>
                      <span className="text-text-primary font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                {detailItem.description && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">About this item</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{detailItem.description}</p>
                  </div>
                )}
                {detailItem.status === 'AVAILABLE' && (
                  <button onClick={() => { setDetailItem(null); setRequestItem(detailItem); setRequestForm({ reason: '', startDate: '', endDate: '' }); }}
                    className="btn-primary w-full text-sm">Request to Use</button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
