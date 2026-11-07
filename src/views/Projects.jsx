import { useEffect, useState } from 'react';
import { load, save, createProject, migrate, PROJECT_COLORS } from '../store';
import { useToast } from '../components/Toast';
import { Plus, Folder, Trash2, KanbanSquare, X, Check } from 'lucide-react';

export default function Projects({ onOpen }) {
  // migrate() guarantees projects exist — belt-and-suspenders even if main.jsx already ran it
  const [projects, setProjects] = useState(() => migrate().projects || []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const toast = useToast();

  useEffect(() => {
    const all = load(); all.projects = projects; save(all);
  }, [projects]);

  const data = load();
  const tasks = data.tasks || [];
  const notes = data.notes || [];

  const create = () => {
    if (!name.trim()) return;
    const p = createProject(name, color);
    setProjects(ps => [...ps, p]);
    setName(''); setColor(PROJECT_COLORS[0]);
    setCreating(false);
  };

  const remove = (id) => {
    if (projects.length <= 1) {
      toast('You need at least one project');
      return;
    }
    const removed = projects.find(p => p.id === id);
    const idx = projects.findIndex(p => p.id === id);
    setProjects(ps => ps.filter(p => p.id !== id));
    toast(`Deleted "${removed.name}"`, () => {
      setProjects(ps => {
        const next = [...ps];
        next.splice(idx, 0, removed);
        return next;
      });
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">📁 Projects</h2>
          <p className="text-sm text-muted mt-1">
            Boards, notes, and visual canvases — organized per project.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="bg-accent hover:opacity-90 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {creating && (
        <div className="bg-panel border border-border rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">New project</h3>
            <button onClick={() => setCreating(false)} className="text-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
            placeholder="Project name (e.g. Thesis, Side hustle, Trip planning)"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent mb-3"
          />
          <div className="flex flex-wrap gap-2 mb-3">
            {PROJECT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                  color === c ? 'ring-2 ring-offset-2 ring-offset-panel ring-ink' : ''
                }`}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check size={14} className="text-white" />}
              </button>
            ))}
          </div>
          <button
            onClick={create}
            className="bg-accent hover:opacity-90 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Create
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-panel border border-border rounded-2xl p-12 text-center">
          <Folder className="mx-auto text-muted mb-3" size={32} />
          <p className="text-muted text-sm mb-3">No projects yet.</p>
          <button
            onClick={() => setCreating(true)}
            className="bg-accent hover:opacity-90 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const pTasks = tasks.filter(t => t.projectId === p.id);
            const pNotes = notes.filter(n => n.projectId === p.id);
            const doneCols = (p.columns || [])
              .filter(c => c.title.toLowerCase().includes('done'))
              .map(c => c.id);
            const done = pTasks.filter(t => doneCols.includes(t.col)).length;
            const progress = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;

            return (
              <div key={p.id} className="bg-panel border border-border rounded-2xl p-5 hover:border-border-strong transition group">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: p.color + '22', color: p.color }}
                  >
                    <Folder size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <p className="text-xs text-muted">
                      {pTasks.length} task{pTasks.length !== 1 ? 's' : ''} · {pNotes.length} note{pNotes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-muted">
                    <span>{done}/{pTasks.length} done</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 text-xs text-muted mb-4">
                  <span className="flex items-center gap-1">
                    <KanbanSquare size={12} /> {(p.columns || []).length} columns
                  </span>
                  {p.connections?.length > 0 && (
                    <span className="flex items-center gap-1">
                      · {p.connections.length} link{p.connections.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onOpen(p.id)}
                  className="w-full bg-bg border border-border rounded-lg py-2 text-sm font-medium hover:bg-border transition"
                >
                  Open →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}