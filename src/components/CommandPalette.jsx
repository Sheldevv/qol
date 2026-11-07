import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Home, Wallet, KanbanSquare, NotebookPen, GraduationCap, Sparkles, Timer, Search,
} from 'lucide-react';

const COMMANDS = [
  { id: 'dashboard', label: 'Go to Dashboard', Icon: Home, hint: '1' },
  { id: 'money', label: 'Go to Money', Icon: Wallet, hint: '2' },
  { id: 'tasks', label: 'Go to Tasks', Icon: KanbanSquare, hint: '3' },
  { id: 'notes', label: 'Go to Notes', Icon: NotebookPen, hint: '4' },
  { id: 'school', label: 'Go to School', Icon: GraduationCap, hint: '5' },
  { id: 'habits', label: 'Go to Habits', Icon: Sparkles, hint: '6' },
  { id: 'pomodoro', label: 'Go to Pomodoro', Icon: Timer, hint: '7' },
];

export default function CommandPalette({ open, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) { setQuery(''); setSelected(0); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[selected];
        if (cmd) { onNavigate(cmd.id); onClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, selected, onClose, onNavigate]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <Search size={16} className="text-muted" />
          <input
            autoFocus value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-base focus:outline-none"
          />
          <kbd className="text-xs text-muted bg-bg border border-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No results</p>
          ) : filtered.map((c, i) => (
            <button
              key={c.id}
              onClick={() => { onNavigate(c.id); onClose(); }}
              onMouseEnter={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition ${
                i === selected ? 'bg-border' : ''
              }`}
            >
              <c.Icon size={16} className="text-muted" />
              <span className="flex-1">{c.label}</span>
              <kbd className="text-xs text-muted bg-bg border border-border rounded px-1.5 py-0.5">⌘{c.hint}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
