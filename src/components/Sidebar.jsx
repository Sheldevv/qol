import {
  Home, Folder, Wallet, KanbanSquare, NotebookPen, GraduationCap,
  Sparkles, Timer, Download, Upload, Moon, Sun, Search,
} from 'lucide-react';
import { useTheme } from './ThemeContext';

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', Icon: Home },
  { id: 'projects', label: 'Projects', Icon: Folder },
  { id: 'money', label: 'Money', Icon: Wallet },
  { id: 'tasks', label: 'All Tasks', Icon: KanbanSquare },
  { id: 'notes', label: 'All Notes', Icon: NotebookPen },
  { id: 'school', label: 'School', Icon: GraduationCap },
  { id: 'habits', label: 'Habits', Icon: Sparkles },
  { id: 'pomodoro', label: 'Pomodoro', Icon: Timer },
];

export default function Sidebar({ current, onNavigate, onOpenPalette }) {
  const { theme, toggle } = useTheme();

  const handleExport = () => {
    const raw = localStorage.getItem('qol-v2') || '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qol-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        JSON.parse(reader.result);
        localStorage.setItem('qol-v2', reader.result);
        window.location.reload();
      } catch { alert('Invalid JSON file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className="w-60 bg-panel border-r border-border p-4 flex flex-col min-h-screen">
      <div className="mb-6">
        <h1 className="text-lg font-bold tracking-tight">✨ QoL</h1>
        <p className="text-xs text-muted mt-0.5">Your daily dashboard</p>
      </div>

      <button
        onClick={onOpenPalette}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted bg-bg border border-border hover:border-border-strong transition mb-4 w-full"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-xs bg-panel border border-border rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      <nav className="space-y-1 flex-1">
        {ITEMS.map(({ id, label, Icon }, i) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition ${
              current === id
                ? 'bg-accent text-white'
                : 'text-muted hover:bg-border hover:text-ink'
            }`}
          >
            <Icon size={16} /> {label}
            <span className={`ml-auto text-[10px] ${current === id ? 'text-white/60' : 'text-muted/50'} opacity-0 group-hover:opacity-100 transition`}>
              ⌘{i + 1}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-6 pt-6 border-t border-border space-y-1">
        <button onClick={handleExport}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted hover:bg-border hover:text-ink transition">
          <Download size={16} /> Export
        </button>
        <label className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted hover:bg-border hover:text-ink transition cursor-pointer">
          <Upload size={16} /> Import
          <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </label>
        <button onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted hover:bg-border hover:text-ink transition">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  );
}