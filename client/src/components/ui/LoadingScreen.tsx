import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/api';

export default function LoadingScreen() {
  const [debug, setDebug] = useState<{ status?: number; body?: string; error?: string }>({});
  const setLoading = useAuthStore((s) => s.setLoading);

  // NOTE: Removed automatic refresh call to avoid duplicate requests during
  // React StrictMode and initial mount. Use the button below to run a single
  // manual check if needed.
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        </div>
        <p className="text-text-secondary text-sm">Loading portal...</p>
        <div className="mt-4 text-xs text-text-muted max-w-xs text-center">
          <div>Debug: {debug.status ?? '—'}</div>
          <pre className="whitespace-pre-wrap">{debug.error || debug.body}</pre>
          <div className="flex items-center justify-center gap-2 mt-2">
            <button
              onClick={() => setLoading(false)}
              className="btn-ghost text-xs"
            >
              Force stop loading
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
                  const text = await res.text();
                  setDebug({ status: res.status, body: text });
                } catch (err: unknown) {
                  setDebug({ error: String(err) });
                }
              }}
              className="btn-ghost text-xs"
            >
              Check refresh
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
