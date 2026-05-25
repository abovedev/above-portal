import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdminSidebar from './AdminSidebar';
import HelpPanel from './HelpPanel';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <motion.main
        className="flex-1 flex flex-col overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </motion.main>
      <HelpPanel />
    </div>
  );
}
