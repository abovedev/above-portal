import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import Avatar from '@/components/ui/Avatar';
import NotificationPanel from './NotificationPanel';
import api from '@/lib/api';

interface TopbarProps {
  title?: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, actions }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const { boardEditMode } = useUIStore();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/login', { replace: true });
    toast.success('Logged out');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pages?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center px-6 gap-4 flex-shrink-0 z-10">
      {title && (
        <h1 className="font-heading font-bold text-lg text-text-primary mr-4 hidden sm:block">
          {title}
        </h1>
      )}

      {/* Search */}
      {!boardEditMode && (
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 h-9 text-sm bg-surface-elevated"
              placeholder="Search pages, announcements..."
            />
          </div>
        </form>
      )}

      {actions && <div className="flex items-center gap-2 whitespace-nowrap">{actions}</div>}

      <div className="ml-auto flex items-center gap-2">
        <NotificationPanel />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 hover:bg-surface-hover rounded-lg px-2 py-1.5 transition-all"
          >
            {user && (
              <>
                <Avatar src={user.avatar} firstName={user.firstName} lastName={user.lastName} size="sm" />
                <span className="text-sm font-medium text-text-primary hidden md:block">
                  {user.firstName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden md:block" />
              </>
            )}
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-card shadow-card-hover z-50 overflow-hidden py-1"
                >
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-sm font-medium text-text-primary">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-text-muted">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    <UserIcon className="w-4 h-4" /> Profile
                  </button>
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-priority-urgent hover:bg-priority-urgent/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
