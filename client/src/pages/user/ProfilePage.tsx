import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    department: user?.department || '',
    position: user?.position || '',
  });
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPass, setChangingPass] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/users/${user!.id}`, form);
      setUser(res.data.data.user);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await api.post('/users/avatar', fd);
      setUser({ ...user!, avatar: res.data.data.avatarUrl });
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setChangingPass(true);
    try {
      await api.put(`/users/${user!.id}`, {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to change password';
      toast.error(msg);
    } finally {
      setChangingPass(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Profile" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Avatar section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <h2 className="font-heading font-semibold text-text-primary mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-accent" /> Profile Photo
            </h2>
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar src={user.avatar} firstName={user.firstName} lastName={user.lastName} size="xl" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full flex items-center justify-center border-2 border-background hover:bg-accent-hover transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-background" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="font-medium text-text-primary">{user.firstName} {user.lastName}</p>
                <p className="text-text-muted text-sm">{user.email}</p>
                <p className="text-xs text-accent mt-1 capitalize">{user.role}</p>
              </div>
            </div>
          </motion.div>

          {/* Profile info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card p-6"
          >
            <h2 className="font-heading font-semibold text-text-primary mb-4">Personal Information</h2>
            <form onSubmit={handleProfileSave} className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input
                  className="input"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  className="input"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Department</label>
                <input
                  className="input"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Engineering"
                />
              </div>
              <div>
                <label className="label">Position</label>
                <input
                  className="input"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Email</label>
                <input className="input opacity-60" value={user.email} disabled />
              </div>
              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Password change */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="font-heading font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent" /> Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={passForm.currentPassword}
                  onChange={(e) => setPassForm((f) => ({ ...f, currentPassword: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={passForm.newPassword}
                  onChange={(e) => setPassForm((f) => ({ ...f, newPassword: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  value={passForm.confirmPassword}
                  onChange={(e) => setPassForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={changingPass} className="btn-primary flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {changingPass ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
