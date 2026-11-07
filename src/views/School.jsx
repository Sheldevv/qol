import { useEffect, useMemo, useState } from 'react';
import { load, save } from '../store';
import { useToast } from '../components/Toast';
import {
  Plus, Trash2, CheckCircle2, Circle, AlertCircle, GraduationCap,
  BookOpen, Clock, Flag, ChevronDown, ChevronRight, X, Check,
} from 'lucide-react';

const PRIORITIES = {
  high:   { label: 'High',   color: 'text-danger',     bg: 'bg-danger/10',     dot: 'bg-danger'     },
  medium: { label: 'Medium', color: 'text-warning',    bg: 'bg-warning/10',    dot: 'bg-warning'    },
  low:    { label: 'Low',    color: 'text-blue-400',   bg: 'bg-blue-400/10',   dot: 'bg-blue-400'   },
};

const COURSE_COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee', '#fb923c',
];

const courseColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
};

const today = () => new Date(new Date().toDateString());
const daysDiff = (dateStr) => {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - today()) / 86400000);
};

const relativeDue = (dateStr) => {
  if (!dateStr) return { label: 'No date', tone: 'muted' };
  const d = daysDiff(dateStr);
  if (d < 0) return { label: `${-d} day${-d !== 1 ? 's' : ''} overdue`, tone: 'danger' };
  if (d === 0) return { label: 'Due today', tone: 'warning' };
  if (d === 1) return { label: 'Tomorrow', tone: 'warning' };
  if (d <= 7) return { label: `in ${d} days`, tone: 'muted' };
  return { label: dateStr, tone: 'muted' };
};

const groupOf = (item) => {
  if (!item.due) return 'No date';
  const d = daysDiff(item.due);
  if (d < 0) return 'Overdue';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d <= 7) return 'This week';
  return 'Later';
};

const GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'No date'];

export default function School() {
  const [items, setItems] = useState(() => load().school || []);
  const [form, setForm] = useState({ class: '', assign: '', due: '', priority: 'medium' });
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('open');
  const [sortBy, setSortBy] = useState('due');
  const toast = useToast();

  useEffect(() => {
    const a = load(); a.school = items; save(a);
  }, [items]);

  const courses = useMemo(() => [...new Set(items.map(i => i.class))].sort(), [items]);

  const stats = useMemo(() => {
    const open = items.filter(i => !i.done);
    const overdue = open.filter(i => i.due && daysDiff(i.due) < 0).length;
    const thisWeek = open.filter(i => {
      if (!i.due) return false;
      const d = daysDiff(i.due);
      return d >= 0 && d <= 7;
    }).length;
    const done = items.filter(i => i.done).length;
    return { total: items.length, open: open.length, overdue, thisWeek, done };
  }, [items]);

  const visible = useMemo(() => {
    let list = items;
    if (filterCourse !== 'all') list = list.filter(i => i.class === filterCourse);
    if (filterStatus === 'open') list = list.filter(i => !i.done);
    if (filterStatus === 'done') list = list.filter(i => i.done);
    if (filterStatus === 'overdue') list = list.filter(i => !i.done && i.due && daysDiff(i.due) < 0);

    const PRIO_RANK = { high: 0, medium: 1, low: 2 };
    return [...list].sort((a, b) => {
      if (sortBy === 'priority') {
        const r = (PRIO_RANK[a.priority] ?? 3) - (PRIO_RANK[b.priority] ?? 3);
        if (r !== 0) return r;
      }
      if (sortBy === 'class') {
        const r = a.class.localeCompare(b.class);
        if (r !== 0) return r;
      }
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });
  }, [items, filterCourse, filterStatus, sortBy]);

  const grouped = useMemo(() => {
    if (sortBy !== 'due') return null;
    const groups = {};
    visible.forEach(i => {
      const g = i.done ? 'Completed' : groupOf(i);
      (groups[g] ||= []).push(i);
    });
    const order = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'No date', 'Completed'];
    return order.filter(g => groups[g]?.length).map(g => [g, groups[g]]);
  }, [visible, sortBy]);

  const add = () => {
    if (!form.class.trim() || !form.assign.trim()) return;
    setItems(xs => [{
      id: crypto.randomUUID(),
      class: form.class.trim(),
      assign: form.assign.trim(),
      due: form.due,
      priority: form.priority,
      done: false,
      note: '',
    }, ...xs]);
    setForm({ class: form.class, assign: '', due: '', priority: 'medium' });
  };

  const remove = (id) => {
    const removed = items.find(x => x.id === id);
    const index = items.findIndex(x => x.id === id);
    setItems(xs => xs.filter(x => x.id !== id));
    if (removed) {
      toast(`Deleted "${removed.assign}"`, () => {
        setItems(xs => {
          const next = [...xs];
          next.splice(index, 0, removed);
          return next;
        });
      });
    }
  };

  const update = (id, patch) =>
    setItems(xs => xs.map(x => (x.id === id ? { ...x, ...patch } : x)));

  const toggleDone = (id) => {
    const item = items.find(x => x.id === id);
    update(id, { done: !item.done });
  };

  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">🎓 School</h2>
        <p className="text-sm text-muted mt-1">Stay on top of every assignment.</p>
      </div>

      {/* Stats + progress */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-muted">Open</p>
          <p className="text-2xl font-bold mt-1">{stats.open}</p>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-muted flex items-center gap-1"><Clock size={12} /> Due this week</p>
          <p className="text-2xl font-bold mt-1 text-warning">{stats.thisWeek}</p>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-muted flex items-center gap-1"><AlertCircle size={12} /> Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${stats.overdue > 0 ? 'text-danger' : ''}`}>{stats.overdue}</p>
        </div>
        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-muted">Completed</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-success">{completionPct}%</p>
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-success transition-all" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Add form */}
      <div className="bg-panel border border-border rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={form.class}
            onChange={e => setForm(f => ({ ...f, class: e.target.value }))}
            placeholder="Class"
            list="course-list"
            className="bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
          />
          <datalist id="course-list">
            {courses.map(c => <option key={c} value={c} />)}
          </datalist>
          <input
            value={form.assign}
            onChange={e => setForm(f => ({ ...f, assign: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Assignment"
            className="bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent md:col-span-2"
          />
          <input
            type="date"
            value={form.due}
            onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
            className="bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="flex-1 bg-bg border border-border rounded-lg px-2 py-2 focus:outline-none focus:border-accent text-sm"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={add}
              className="bg-accent hover:opacity-90 text-white rounded-lg px-4 py-2 font-medium flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-panel border border-border rounded-lg p-1">
          {[
            { id: 'open', label: 'Open' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'done', label: 'Done' },
            { id: 'all', label: 'All' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                filterStatus === f.id ? 'bg-accent text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {courses.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterCourse('all')}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                filterCourse === 'all'
                  ? 'bg-panel border-accent text-ink'
                  : 'bg-panel border-border text-muted hover:text-ink'
              }`}
            >
              All courses
            </button>
            {courses.map(c => {
              const color = courseColor(c);
              const active = filterCourse === c;
              return (
                <button
                  key={c}
                  onClick={() => setFilterCourse(active ? 'all' : c)}
                  className={`px-3 py-1 rounded-full text-xs border transition flex items-center gap-1.5 ${
                    active ? 'bg-panel border-accent text-ink' : 'bg-panel border-border text-muted hover:text-ink'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {c}
                </button>
              );
            })}
          </div>
        )}

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="ml-auto bg-panel border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent"
        >
          <option value="due">Sort: Due date</option>
          <option value="priority">Sort: Priority</option>
          <option value="class">Sort: Class</option>
        </select>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="bg-panel border border-border rounded-2xl p-12 text-center">
          <GraduationCap className="mx-auto text-muted mb-3" size={32} />
          <p className="text-muted text-sm">
            {filterStatus === 'done' ? 'Nothing completed yet.' : 'Nothing here. 🎉'}
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-5">
          {grouped.map(([group, groupItems]) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                  group === 'Overdue' ? 'text-danger'
                  : group === 'Today' || group === 'Tomorrow' ? 'text-warning'
                  : 'text-muted'
                }`}>
                  {group}
                </h3>
                <span className="text-xs text-muted">({groupItems.length})</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="bg-panel border border-border rounded-2xl overflow-hidden">
                {groupItems.map(item => (
                  <SchoolRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleDone(item.id)}
                    onRemove={() => remove(item.id)}
                    onUpdate={(patch) => update(item.id, patch)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-panel border border-border rounded-2xl overflow-hidden">
          {visible.map(item => (
            <SchoolRow
              key={item.id}
              item={item}
              onToggle={() => toggleDone(item.id)}
              onRemove={() => remove(item.id)}
              onUpdate={(patch) => update(item.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolRow({ item, onToggle, onRemove, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.assign);

  const prio = PRIORITIES[item.priority] || PRIORITIES.medium;
  const color = courseColor(item.class);
  const rel = relativeDue(item.due);
  const overdue = item.due && !item.done && daysDiff(item.due) < 0;
  const dueToday = item.due && !item.done && daysDiff(item.due) === 0;

  const saveTitle = () => {
    const v = titleDraft.trim();
    if (v && v !== item.assign) onUpdate({ assign: v });
    else setTitleDraft(item.assign);
    setEditingTitle(false);
  };

  return (
    <div className={`border-b border-border last:border-0 ${overdue ? 'bg-danger/[0.03]' : ''}`}>
      <div className="flex items-center gap-3 p-3 hover:bg-bg/40 transition group">
        <button onClick={onToggle} className="flex-shrink-0">
          {item.done
            ? <CheckCircle2 size={20} className="text-success" />
            : <Circle size={20} className={`${overdue ? 'text-danger' : 'text-muted'} hover:text-accent transition`} />}
        </button>

        <button
          onClick={() => setExpanded(e => !e)}
          className="text-muted hover:text-ink flex-shrink-0"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') { setTitleDraft(item.assign); setEditingTitle(false); }
                }}
                className="flex-1 bg-bg border border-accent rounded px-2 py-0.5 text-sm focus:outline-none"
              />
            ) : (
              <p
                onClick={() => setEditingTitle(true)}
                className={`font-medium truncate cursor-text hover:text-accent transition ${
                  item.done ? 'line-through text-muted' : ''
                }`}
              >
                {item.assign}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {item.class}
            </span>
            {item.note && <span className="text-xs text-muted">· has note</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${prio.bg} ${prio.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
            {prio.label}
          </span>
          {item.due && (
            <span className={`text-xs flex items-center gap-1 ${
              overdue ? 'text-danger font-medium'
              : dueToday ? 'text-warning font-medium'
              : 'text-muted'
            }`}>
              {overdue && <AlertCircle size={12} />}
              {rel.label}
            </span>
          )}
          <button
            onClick={onRemove}
            className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pl-[68px] animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs">
              <span className="text-muted">Due date</span>
              <input
                type="date"
                value={item.due || ''}
                onChange={e => onUpdate({ due: e.target.value })}
                className="mt-1 w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted">Priority</span>
              <select
                value={item.priority || 'medium'}
                onChange={e => onUpdate({ priority: e.target.value })}
                className="mt-1 w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="text-muted">Class</span>
              <input
                value={item.class}
                onChange={e => onUpdate({ class: e.target.value })}
                className="mt-1 w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              />
            </label>
          </div>
          <label className="block mt-3">
            <span className="text-xs text-muted">Notes</span>
            <textarea
              value={item.note || ''}
              onChange={e => onUpdate({ note: e.target.value })}
              placeholder="Add context, links, reminders…"
              rows={3}
              className="mt-1 w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}