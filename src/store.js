const KEY = 'qol-v2';

export const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
};

export const save = (data) => localStorage.setItem(KEY, JSON.stringify(data));

export const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To Do', accent: 'blue' },
  { id: 'doing', title: 'In Progress', accent: 'yellow' },
  { id: 'done', title: 'Done', accent: 'emerald' },
];

const DEFAULT_PROJECT_COLOR = '#6366f1';

export const createProject = (name, color = DEFAULT_PROJECT_COLOR) => ({
  id: crypto.randomUUID(),
  name: name.trim() || 'Untitled',
  color,
  columns: DEFAULT_COLUMNS.map(c => ({ ...c })),
  connections: [],
  createdAt: Date.now(),
});

export const migrate = () => {
  const data = load();
  let changed = false;

  // 1. Ensure at least one project exists
  if (!Array.isArray(data.projects) || data.projects.length === 0) {
    data.projects = [{
      id: crypto.randomUUID(),
      name: 'Personal',
      color: DEFAULT_PROJECT_COLOR,
      columns: DEFAULT_COLUMNS.map(c => ({ ...c })),
      connections: [],
      createdAt: Date.now(),
    }];
    changed = true;
  }

  // 2. Ensure every project has valid columns + connections arrays
  data.projects = data.projects.map(p => {
    let pChanged = false;
    const next = { ...p };
    if (!Array.isArray(next.columns) || next.columns.length === 0) {
      next.columns = DEFAULT_COLUMNS.map(c => ({ ...c }));
      pChanged = true;
    }
    if (!Array.isArray(next.connections)) {
      next.connections = [];
      pChanged = true;
    }
    if (pChanged) changed = true;
    return next;
  });

  const defaultProjectId = data.projects[0].id;

  // 3. Attach any orphaned tasks/notes to the default project
  data.tasks = (Array.isArray(data.tasks) ? data.tasks : []).map(t => {
    if (!t.projectId) { changed = true; return { ...t, projectId: defaultProjectId }; }
    return t;
  });
  data.notes = (Array.isArray(data.notes) ? data.notes : []).map(n => {
    if (!n.projectId) { changed = true; return { ...n, projectId: defaultProjectId }; }
    return n;
  });

  if (changed) save(data);
  return data;
};

export const COLUMN_COLORS = {
  blue:    { border: 'border-t-blue-500',    dot: 'bg-blue-500',    text: 'text-blue-400' },
  yellow:  { border: 'border-t-yellow-500',  dot: 'bg-yellow-500',  text: 'text-yellow-400' },
  emerald: { border: 'border-t-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  pink:    { border: 'border-t-pink-500',    dot: 'bg-pink-500',    text: 'text-pink-400' },
  purple:  { border: 'border-t-purple-500',  dot: 'bg-purple-500',  text: 'text-purple-400' },
  orange:  { border: 'border-t-orange-500',  dot: 'bg-orange-500',  text: 'text-orange-400' },
};

export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#ef4444',
];