import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Users, Megaphone, Settings,
  ChevronLeft, ChevronRight, LogOut, BookOpen, UserCog, Bot
} from 'lucide-react';
import logo from '@/assets/logo_81bd7332c31221e7511fb2f09781db21_1x.png';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/pages/global', label: 'Global Pages', icon: BookOpen },
  { to: '/admin/pages/per-user', label: 'Per-User Pages', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/ai-settings', label: 'AI Settings', icon: Bot },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/login', { replace: true });
    toast.success('Logged out');
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 68 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      data-tour="admin-sidebar"
      className="flex-shrink-0 bg-surface border-r border-border flex flex-col h-full overflow-hidden relative z-10"
    >
      {/* Logo + Admin badge */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border h-16">
        <img
          src={logo}
          alt="Above Portal"
          className={cn(
            'h-11 object-contain flex-shrink-0',
            sidebarCollapsed ? 'w-11' : 'w-24'
          )}
        />
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <span className="text-[10px] text-accent font-medium bg-accent-muted px-1.5 py-0.5 rounded-full whitespace-nowrap">Admin</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 pt-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin/dashboard'}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 px-2.5 py-2 rounded-lg group',
                sidebarCollapsed ? 'justify-center' : '',
                isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="admin-nav-pill"
                    className="absolute inset-0 bg-accent-muted border border-accent/20 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                  />
                )}
                {!isActive && (
                  <div className="absolute inset-0 rounded-lg group-hover:bg-surface-hover transition-colors duration-150" />
                )}
                <Icon className={cn('relative w-4.5 h-4.5 flex-shrink-0 z-10', isActive ? 'text-accent' : '')} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="relative z-10 text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-2 mt-2 border-t border-border">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-text-muted hover:text-text-secondary hover:bg-surface-hover"
          >
            <UserCog className="w-4.5 h-4.5 flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm whitespace-nowrap overflow-hidden"
                >
                  User Portal
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        </div>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[4.5rem] w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-text-muted hover:text-accent hover:border-accent/40 transition-all z-20"
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* User footer */}
      <div className="p-2 border-t border-border">
        {user && !sidebarCollapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <Avatar src={user.avatar} firstName={user.firstName} lastName={user.lastName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-accent">Administrator</p>
            </div>
            <button onClick={handleLogout} className="text-text-muted hover:text-priority-urgent transition-colors" title="Logout">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {sidebarCollapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 text-text-muted hover:text-priority-urgent rounded-lg hover:bg-surface-hover transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
