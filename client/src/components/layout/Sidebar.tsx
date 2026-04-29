import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Bookmark, User, ChevronLeft,
  ChevronRight, LogOut, ShieldCheck
} from 'lucide-react';
import logo from '@/assets/logo_81bd7332c31221e7511fb2f09781db21_1x.png';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pages', label: 'Company Pages', icon: BookOpen },
  { to: '/my-pages', label: 'My Pages', icon: Bookmark },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    logout();
    navigate('/login', { replace: true });
    toast.success('Logged out successfully');
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 68 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex-shrink-0 bg-surface border-r border-border flex flex-col h-full overflow-hidden relative z-10"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border h-16">
        <img
          src={logo}
          alt="Above Portal"
          className={cn(
            'h-11 object-contain flex-shrink-0',
            sidebarCollapsed ? 'w-11' : 'w-24'
          )}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 pt-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 group',
                sidebarCollapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-accent-muted text-accent border border-accent/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-accent' : '')} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}

        {user?.role === 'ADMIN' && (
          <div className="pt-2 mt-2 border-t border-border">
            <NavLink
              to="/admin/dashboard"
              className="flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-text-muted hover:text-accent hover:bg-accent-muted"
            >
              <ShieldCheck className="w-4.5 h-4.5 flex-shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm whitespace-nowrap overflow-hidden"
                  >
                    Admin Portal
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[4.5rem] w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-text-muted hover:text-accent hover:border-accent/40 transition-all z-20"
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* User profile footer */}
      <div className="p-2 border-t border-border">
        {user && (
          <div className={cn('flex items-center gap-2.5 px-2 py-2 rounded-lg', sidebarCollapsed ? 'justify-center' : '')}>
            <Avatar
              src={user.avatar}
              firstName={user.firstName}
              lastName={user.lastName}
              size="sm"
            />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-xs font-medium text-text-primary truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleLogout}
                  className="text-text-muted hover:text-priority-urgent transition-colors flex-shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
        {sidebarCollapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 text-text-muted hover:text-priority-urgent transition-colors rounded-lg hover:bg-surface-hover"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
