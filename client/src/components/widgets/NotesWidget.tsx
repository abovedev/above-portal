import { useState, useEffect, useRef } from 'react';
import { StickyNote } from 'lucide-react';

const STORAGE_KEY = 'portal_notes';

export default function NotesWidget() {
  const [content, setContent] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, value);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <StickyNote className="w-4 h-4 text-accent" />
        <h3 className="font-heading font-semibold text-text-primary text-sm">Notes</h3>
        <span className="ml-auto text-xs text-text-muted">Autosaves locally</span>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        className="flex-1 bg-transparent resize-none text-sm text-text-secondary placeholder:text-text-muted focus:outline-none"
        placeholder="Jot down anything..."
      />
    </div>
  );
}
