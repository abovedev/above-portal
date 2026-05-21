import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Package, Filter } from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { EmptyState, TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import api from '@/lib/api';
import type { GearRequest, GearRequestStatus } from '@/types';

const STATUS_COLORS: Record<GearRequestStatus, string> = {
  PENDING:   'bg-priority-medium/15 text-priority-medium',
  APPROVED:  'bg-priority-low/15 text-priority-low',
  DECLINED:  'bg-priority-urgent/15 text-priority-urgent',
  CANCELLED: 'bg-surface-elevated text-text-muted',
  COLLECTED: 'bg-accent/10 text-accent',
};

const STATUS_LABELS: Record<GearRequestStatus, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', DECLINED: 'Declined',
  CANCELLED: 'Cancelled', COLLECTED: 'Collected',
};

export default function AdminGearRequestsPage() {
  const [requests, setRequests] = useState<GearRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [reviewModal, setReviewModal] = useState<GearRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'DECLINED'>('APPROVED');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/gear/requests', { params: { status: statusFilter || undefined } });
      setRequests(res.data.data.requests);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openReview = (req: GearRequest, action: 'APPROVED' | 'DECLINED') => {
    setReviewModal(req);
    setReviewAction(action);
    setAdminNote('');
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    setSaving(true);
    try {
      await api.put(`/gear/requests/${reviewModal.id}/review`, { action: reviewAction, adminNote: adminNote || undefined });
      toast.success(reviewAction === 'APPROVED' ? 'Request approved' : 'Request declined');
      setReviewModal(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const pending = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Gear Requests"
        actions={
          pending > 0 ? (
            <span className="badge bg-priority-urgent/15 text-priority-urgent">
              {pending} pending
            </span>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-text-muted" />
          {([
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'COLLECTED', label: 'Collected' },
            { value: 'DECLINED', label: 'Declined' },
            { value: 'CANCELLED', label: 'Cancelled' },
            { value: '', label: 'All' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                statusFilter === value
                  ? 'bg-accent-muted border-accent/40 text-accent'
                  : 'border-border text-text-muted hover:border-border-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card overflow-hidden">
            <table className="w-full"><tbody>{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}</tbody></table>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState icon={Package} title="No requests" description={statusFilter === 'PENDING' ? 'No pending gear requests right now.' : 'No requests match this filter.'} />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Requested By', 'Gear Item', 'Dates', 'Reason', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {requests.map((req) => (
                    <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={req.requester.avatar} firstName={req.requester.firstName} lastName={req.requester.lastName} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{req.requester.firstName} {req.requester.lastName}</p>
                            <p className="text-xs text-text-muted">{formatDate(req.createdAt, 'relative')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{req.gearItem.name}</p>
                        <p className="text-xs text-text-muted">{req.gearItem.category}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {req.startDate ? (
                          <span>{formatDate(req.startDate, 'short')}{req.endDate ? ` → ${formatDate(req.endDate, 'short')}` : ''}</span>
                        ) : <span className="text-text-muted">Not specified</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-48">
                        <p className="line-clamp-2">{req.reason || <span className="text-text-muted">—</span>}</p>
                        {req.adminNote && (
                          <p className="text-xs text-text-muted mt-1 italic">Admin: {req.adminNote}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_COLORS[req.status]}`}>{STATUS_LABELS[req.status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        {req.status === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openReview(req, 'APPROVED')}
                              className="p-1.5 text-text-muted hover:text-priority-low transition-colors rounded hover:bg-surface-hover" title="Approve">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => openReview(req, 'DECLINED')}
                              className="p-1.5 text-text-muted hover:text-priority-urgent transition-colors rounded hover:bg-surface-hover" title="Decline">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {req.status !== 'PENDING' && req.reviewedBy && (
                          <div>
                            <p className="text-xs text-text-muted">by {req.reviewedBy.firstName}</p>
                            {req.reviewedAt && <p className="text-xs text-text-muted">{formatDate(req.reviewedAt, 'relative')}</p>}
                          </div>
                        )}
                        {req.status === 'COLLECTED' && !req.reviewedBy && (
                          <p className="text-xs text-text-muted">Self-collected</p>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        )}
      </div>

      {/* Review Modal */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)}
        title={reviewAction === 'APPROVED' ? 'Approve Request' : 'Decline Request'} size="sm">
        {reviewModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-surface-elevated rounded-lg">
              {reviewAction === 'APPROVED'
                ? <CheckCircle className="w-5 h-5 text-priority-low flex-shrink-0" />
                : <XCircle className="w-5 h-5 text-priority-urgent flex-shrink-0" />}
              <div>
                <p className="text-sm font-medium text-text-primary">{reviewModal.gearItem.name}</p>
                <p className="text-xs text-text-muted">Requested by {reviewModal.requester.firstName} {reviewModal.requester.lastName}</p>
              </div>
            </div>
            {reviewModal.reason && (
              <div>
                <p className="text-xs text-text-muted mb-1">User's reason</p>
                <p className="text-sm text-text-secondary italic">"{reviewModal.reason}"</p>
              </div>
            )}
            <div>
              <label className="label">Note to user <span className="text-text-muted text-xs">(optional)</span></label>
              <textarea
                className="input min-h-16 resize-none text-sm"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={reviewAction === 'APPROVED' ? 'e.g. Please pick up from reception by 5pm' : 'e.g. Item is already booked this week'}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReviewModal(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={handleReview}
                disabled={saving}
                className={reviewAction === 'APPROVED' ? 'btn-primary text-sm' : 'btn-danger text-sm'}
              >
                {saving ? 'Saving...' : reviewAction === 'APPROVED' ? 'Approve' : 'Decline'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
