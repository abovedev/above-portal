import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Settings } from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import type { CompanySettings } from '@/types';
import api from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    theme: 'dark',
    accentColor: '#D7DCE2',
  });

  useEffect(() => {
    api.get('/settings').then((res) => {
      const s: CompanySettings = res.data.data.settings;
      setSettings(s);
      setForm({ companyName: s.companyName, theme: s.theme, accentColor: s.accentColor });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', form);
      setSettings(res.data.data.settings);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const res = await api.post('/settings/logo', fd);
      setSettings((s) => s ? { ...s, logoUrl: res.data.data.logoUrl } : s);
      toast.success('Logo updated');
    } catch { toast.error('Upload failed'); }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Settings" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Admin Settings" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Company branding */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-tour="settings-form" className="card p-6">
            <h2 className="font-heading font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-accent" /> Company Branding
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Company Name</label>
                <input
                  className="input"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Company Logo</label>
                {settings?.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-12 mb-2 object-contain" />
                )}
                <label className="flex items-center gap-2 btn-ghost text-sm cursor-pointer border border-dashed border-border rounded-lg py-2 px-4 w-fit">
                  <Upload className="w-4 h-4" />
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>

              <div>
                <label className="label">Accent Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                  />
                  <input
                    className="input w-32 font-mono text-sm"
                    value={form.accentColor}
                    onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Default Theme</label>
                <div className="flex gap-3">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, theme: t }))}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all capitalize ${
                        form.theme === t
                          ? 'bg-accent-muted border-accent/40 text-accent'
                          : 'border-border text-text-secondary hover:border-border-hover'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Danger zone */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card p-6 border-priority-urgent/20">
            <h2 className="font-heading font-semibold text-priority-urgent mb-4">Danger Zone</h2>
            <p className="text-text-secondary text-sm mb-4">
              These actions are irreversible. Proceed with extreme caution.
            </p>
            <button className="btn-danger text-sm" disabled>
              Reset All User Widgets (coming soon)
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
