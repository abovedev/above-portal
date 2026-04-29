import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken } = res.data.data;
      setAccessToken(accessToken);
      setUser(user);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-surface-elevated relative overflow-hidden p-12">
        <div className="absolute inset-0 bg-gradient-radial from-accent/10 via-transparent to-transparent" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-background" />
          </div>
          <span className="font-heading font-bold text-xl text-text-primary">Above Portal</span>
        </div>

        <motion.div
          className="relative z-10 flex-1 flex flex-col justify-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="font-heading text-4xl font-bold text-text-primary mb-4 leading-tight">
            Your workspace,<br />
            <span className="text-gradient">beautifully unified.</span>
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed max-w-sm">
            Access company resources, manage tasks, and stay connected — all in one intelligent portal.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { label: 'Customizable Dashboard', desc: 'Drag-and-drop widgets built around your workflow' },
              { label: 'Company Knowledge Base', desc: 'Structured pages and documentation at your fingertips' },
              { label: 'Real-time Announcements', desc: 'Stay informed with priority-tiered company updates' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-text-primary text-sm">{item.label}</p>
                  <p className="text-text-muted text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-accent-gradient flex items-center justify-center shadow-glow">
              <Zap className="w-4 h-4 text-background" />
            </div>
            <span className="font-heading font-bold text-lg text-text-primary">Above Portal</span>
          </div>

          <h2 className="font-heading text-2xl font-bold text-text-primary mb-1">Sign in</h2>
          <p className="text-text-secondary text-sm mb-8">Enter your credentials to access your portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-surface-elevated rounded-lg border border-border">
            <p className="text-text-muted text-xs mb-2 font-medium">Demo credentials</p>
            <div className="space-y-1 text-xs text-text-secondary">
              <p><span className="text-text-muted">Admin:</span> admin@company.com / admin123</p>
              <p><span className="text-text-muted">User:</span> dev@abovedigital.co / user123</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
