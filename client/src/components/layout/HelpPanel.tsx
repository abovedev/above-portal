import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { getHelpForPath } from '@/lib/helpContent';
import { useTour } from '@/hooks/useTour';

export default function HelpPanel() {
  const { helpOpen, closeHelp } = useUIStore();
  const { pathname } = useLocation();

  const help = getHelpForPath(pathname);

  // Close on route change
  useEffect(() => { closeHelp(); }, [pathname, closeHelp]);

  // Close on Escape
  useEffect(() => {
    if (!helpOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeHelp(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [helpOpen, closeHelp]);

  return (
    <AnimatePresence>
      {helpOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeHelp}
          />

          {/* Panel */}
          <motion.aside
            className="fixed right-0 top-0 h-full w-80 bg-surface border-l border-border z-50 flex flex-col shadow-card-hover"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-text-primary">Page Guide</span>
              </div>
              <button
                onClick={closeHelp}
                className="text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg p-1.5 transition-all"
                title="Close help"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {!help ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-accent" />
                  </div>
                  <p className="text-sm text-text-muted">No guide available for this page yet.</p>
                </div>
              ) : (
                <div className="px-4 py-4 space-y-5">
                  {/* Page title + intro */}
                  <div>
                    <h2 className="font-heading font-semibold text-text-primary text-base">
                      {help.pageTitle}
                    </h2>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {help.intro}
                    </p>
                  </div>

                  {/* Sections */}
                  <div className="space-y-3">
                    {help.sections.map((section, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border bg-surface-elevated p-3 space-y-1"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-xs font-semibold text-text-primary leading-snug">
                            {section.title}
                          </p>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed pl-6">
                          {section.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex-shrink-0">
              <p className="text-xs text-text-muted text-center">
                Guide updates as you navigate pages
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function HelpTrigger() {
  const { toggleHelp, helpOpen } = useUIStore();
  const { startTour, hasTour } = useTour();

  const handleClick = () => {
    if (hasTour) {
      startTour();
    } else {
      toggleHelp();
    }
  };

  return (
    <button
      onClick={handleClick}
      data-tour="help-trigger"
      title={hasTour ? 'Page tour' : 'Page guide'}
      className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
        helpOpen && !hasTour
          ? 'bg-accent/15 text-accent'
          : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
      }`}
    >
      <HelpCircle className="w-4.5 h-4.5" />
    </button>
  );
}
