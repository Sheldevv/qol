import { useEffect, useRef, useState } from 'react';
import { load, save, migrate } from '../store';
import { ArrowLeft, KanbanSquare, NotebookPen, Network } from 'lucide-react';
import ProjectBoard from '../components/ProjectBoard';
import ProjectNotes from '../components/ProjectNotes';
import ProjectCanvas from '../components/ProjectCanvas';

const TABS = [
  { id: 'board', label: 'Board', Icon: KanbanSquare },
  { id: 'notes', label: 'Notes', Icon: NotebookPen },
  { id: 'canvas', label: 'Canvas', Icon: Network },
];

export default function ProjectView({ projectId, onBack }) {
  const [tab, setTab] = useState('board');
  const [projects, setProjects] = useState(() => migrate().projects || []);
  const [tasks, setTasks] = useState(() => {
    const all = migrate();
    return (all.tasks || []).filter(t => t.projectId === projectId);
  });
  const [notes, setNotes] = useState(() => {
    const all = migrate();
    return (all.notes || []).filter(n => n.projectId === projectId);
  });

  const project = projects.find(p => p.id === projectId);

  // --- Persist projects (skip the very first run so a fresh mount never overwrites storage) ---
  const projectsMounted = useRef(false);
  useEffect(() => {
    if (!projectsMounted.current) { projectsMounted.current = true; return; }
    const all = load();
    all.projects = projects;
    save(all);
  }, [projects]);

  // --- Persist tasks for THIS project, merging with other projects ---
  const tasksMounted = useRef(false);
  useEffect(() => {
    if (!tasksMounted.current) { tasksMounted.current = true; return; }
    const all = load();
    const others = (all.tasks || []).filter(t => t.projectId !== projectId);
    all.tasks = [...others, ...tasks];
    save(all);
  }, [tasks, projectId]);

  // --- Persist notes for THIS project, merging with other projects ---
  const notesMounted = useRef(false);
  useEffect(() => {
    if (!notesMounted.current) { notesMounted.current = true; return; }
    const all = load();
    const others = (all.notes || []).filter(n => n.projectId !== projectId);
    all.notes = [...others, ...notes];
    save(all);
  }, [notes, projectId]);

  // Auto-assign canvas positions to any card missing coordinates
  useEffect(() => {
    let needsUpdate = false;
    const newTasks = tasks.map((t, i) => {
      if (t.x === undefined || t.y === undefined) {
        needsUpdate = true;
        return { ...t, x: 40 + (i % 3) * 270, y: 40 + Math.floor(i / 3) * 200 };
      }
      return t;
    });
    const newNotes = notes.map((n, i) => {
      if (n.x === undefined || n.y === undefined) {
        needsUpdate = true;
        return { ...n, x: 40 + (i % 3) * 270, y: 40 + Math.floor(i / 3) * 200 };
      }
      return n;
    });
    if (needsUpdate) {
      setTasks(newTasks);
      setNotes(newNotes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!project) {
    return (
      <div className="text-center py-16 text-muted">
        <p>Project not found.</p>
        <button onClick={onBack} className="mt-4 text-accent hover:underline">← Back</button>
      </div>
    );
  }

  const updateProject = (patch) =>
    setProjects(ps => ps.map(p => (p.id === projectId ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-muted hover:text-ink hover:bg-border transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <input
          value={project.name}
          onChange={e => updateProject({ name: e.target.value })}
          className="bg-transparent text-2xl font-bold tracking-tight focus:outline-none flex-1 min-w-0"
        />
      </div>

      <div className="flex gap-1 bg-panel border border-border rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition ${
              tab === t.id ? 'bg-accent text-white' : 'text-muted hover:text-ink'
            }`}
          >
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'board' && (
        <ProjectBoard
          project={project}
          tasks={tasks}
          setTasks={setTasks}
          updateProject={updateProject}
        />
      )}
      {tab === 'notes' && (
        <ProjectNotes notes={notes} setNotes={setNotes} project={project} />
      )}
      {tab === 'canvas' && (
        <ProjectCanvas
          project={project}
          tasks={tasks}
          notes={notes}
          setTasks={setTasks}
          setNotes={setNotes}
          updateProject={updateProject}
        />
      )}
    </div>
  );
}