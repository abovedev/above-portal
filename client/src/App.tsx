import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';

import { useAuthStore } from '@/stores/authStore';
import api, { API_BASE_URL } from '@/lib/api';

// Layouts
import UserLayout from '@/components/layout/UserLayout';
import AdminLayout from '@/components/layout/AdminLayout';

// Auth
import LoginPage from '@/pages/auth/LoginPage';

// User pages
import DashboardPage from '@/pages/user/DashboardPage';
import CompanyPagesPage from '@/pages/user/CompanyPagesPage';
import MyPagesPage from '@/pages/user/MyPagesPage';
import PageViewPage from '@/pages/user/PageViewPage';
import ProfilePage from '@/pages/user/ProfilePage';

// Admin pages
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminGlobalPagesPage from '@/pages/admin/AdminGlobalPagesPage';
import AdminPageEditorPage from '@/pages/admin/AdminPageEditorPage';
import AdminPerUserPagesPage from '@/pages/admin/AdminPerUserPagesPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminAnnouncementsPage from '@/pages/admin/AdminAnnouncementsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function App() {
  const { setUser, setAccessToken, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        // Use axios directly to bypass the 401 interceptor — a missing session
        // cookie is expected here and must NOT trigger the redirect loop.
        const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        setAccessToken(refreshRes.data.data.accessToken);
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.data.user);
      } catch {
        // No valid session — stay on login
      } finally {
        setLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#17191D',
            border: '1px solid rgba(238,241,244,0.08)',
            color: '#EEF1F4',
          },
        }}
      />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* User Portal */}
          <Route element={<ProtectedRoute />}>
            <Route element={<UserLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/pages" element={<CompanyPagesPage />} />
              <Route path="/my-pages" element={<MyPagesPage />} />
              <Route path="/pages/:slug" element={<PageViewPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Admin Portal */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/pages/global" element={<AdminGlobalPagesPage />} />
              <Route path="/admin/pages/global/new" element={<AdminPageEditorPage />} />
              <Route path="/admin/pages/global/:id/edit" element={<AdminPageEditorPage />} />
              <Route path="/admin/pages/per-user" element={<AdminPerUserPagesPage />} />
              <Route path="/admin/pages/per-user/new" element={<AdminPageEditorPage />} />
              <Route path="/admin/pages/per-user/:id/edit" element={<AdminPageEditorPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
