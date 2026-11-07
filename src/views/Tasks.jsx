import { useEffect, useMemo, useState } from 'react';
import { load, save } from '../store';
import { useToast } from '../components/Toast';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  useDroppable, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, X, Folder } from 'lucide-react';

const PRIORITY_COLORS = { 1: 'bg-danger', 2: 'bg-warning', 3: 'bg-blue-400' };
const COLUMN_ACCENT = {
  blue: 'border-t-blue-500',
  yellow: 'border-t-yellow-500',
  emerald: 'border-t-emerald-500',
  pink: 'border-t-pink-500',
  purple: 'border-t-purple-500',
  orange: 'border-t-orange-500',
};

function ProjectBadge({ project }) {
  if (!project) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-border text-muted">
        No project
      </span>
    );
  }
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
      style={{ backgroundColor: project.color + '22', color: project.color }}
    >
      {project.name}
    </span>
  );
}

function SortableCard({ task, onDelete, onEdit, onCyclePriority }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-bg border border-border rounded-lg p-3 mb-2 group hover:border-border-strong transition ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => onCyclePriority(task.id)}
          className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${
            task.priority ? PRIORITY_COLORS[task.priority] : 'border-2 border-border'
          }`}
        />
        <button className="text-muted cursor-grab touch-none mt-0.5" {...listeners} {...attributes}>
          <GripVertical size={14} />
        </button>
        <input
          value={task.text}
          onChange={e => onEdit(task.id, e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
        <button
          onClick={() => onDelete(task.id)}
          className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function Column({ col, tasks, onAdd, onDelete, onEdit, onCyclePriority }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const accent = COLUMN_ACCENT[col.accent] || 'border-t-blue-500';

  const submit = () => {
    if (draft.trim()) onAdd(col.id, draft.trim());
    setDraft(''); setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-panel border border-border border-t-4 ${accent} rounded-2xl p-3 min-h-[400px] transition ${
        isOver ? 'ring-2 ring-accent' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{col.title}</h3>
        <span className="text-xs text-muted">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map(t => (
          <SortableCard key={t.id} task={t} onDelete={onDelete} onEdit={onEdit} onCyclePriority={onCyclePriority} />
        ))}
      </SortableContext>
      {adding ? (
        <div>
          <textarea
            autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
              if (e.key === 'Escape') { setAdding(false); setDraft(''); }
            }}
            placeholder="Card title…"
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-accent"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={submit} className="bg-accent text-white px-3 py-1 rounded-md text-xs font-medium">Add</button>
            <button onClick={() => { setAdding(false); setDraft(''); }} className="text-muted text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full text-muted hover:text-ink hover:bg-border rounded-lg py-2 text-sm flex items-center justify-center gap-1 transition"
        >
          <Plus size={14} /> Add card
        </button>
      )}
    </div>
  );
}

function FlatTaskRow({ task, project, onDelete, onCyclePriority, onJumpProject }) {
  const col = project?.columns.find(c => c.id === task.col);
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-bg/40 transition group">
      <button
        onClick={() => onCyclePriority(task.id)}
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          task.priority ? PRIORITY_COLORS[task.priority] : 'border border-border'
        }`}
      />
      <span className="flex-1 text-sm truncate">{task.text}</span>
      {col && (
        <span className="text-xs text-muted hidden sm:inline">{col.title}</span>
      )}
      <button
        onClick={() => onJumpProject(task.projectId)}
        className="opacity-0 group-hover:opacity-100 transition"
        title="Open project"
      >
        <ProjectBadge project={project} />
      </button>
      <button
        onClick={() => onDelete(task.id)}
        className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState(() => load().tasks || []);
  const [projects, setProjects] = useState(() => load().projects || []);
  const [filterProject, setFilterProject] = useState('all');
  const [activeId, setActiveId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const all = load(); all.tasks = tasks; save(all);
  }, [tasks]);

  useEffect(() => {
    const all = load(); all.projects = projects; save(all);
  }, [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Fallback project for tasks missing a projectId
  const defaultProjectId = projects[0]?.id;

  const projectOf = (projectId) =>
    projects.find(p => p.id === projectId) ||
    (projectId == null ? projects[0] : null);

  const currentProject =
    filterProject === 'all' ? null : projects.find(p => p.id === filterProject);
  const currentColumns = currentProject?.columns || [];

  // Tasks grouped by project for "All" mode
  const grouped = useMemo(() => {
    const groups = projects.map(p => ({
      project: p,
      tasks: tasks.filter(t => t.projectId === p.id),
    }));
    const orphaned = tasks.filter(
      t => !projects.some(p => p.id === t.projectId)
    );
    if (orphaned.length) {
      groups.push({ project: null, tasks: orphaned });
    }
    return groups.filter(g => g.tasks.length > 0);
  }, [tasks, projects]);

  const columnOf = (id) => {
    if (currentColumns.some(c => c.id === id)) return id;
    return tasks.find(t => t.id === id)?.col;
  };

  const onDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || !currentProject) return;

    const fromCol = columnOf(active.id);
    const toCol = columnOf(over.id);
    if (!fromCol || !toCol) return;

    setTasks(ts => {
      const activeTask = ts.find(t => t.id === active.id);
      if (!activeTask) return ts;

      if (fromCol === toCol) {
        const colTasks = ts.filter(t => t.col === fromCol && t.projectId === currentProject.id);
        const oldIdx = colTasks.findIndex(t => t.id === active.id);
        const newIdx = colTasks.findIndex(t => t.id === over.id);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return ts;
        const reordered = arrayMove(colTasks, oldIdx, newIdx);
        const result = [];
        for (const t of ts) {
          if (t.col === fromCol && t.projectId === currentProject.id) continue;
          result.push(t);
        }
        return [...result, ...reordered];
      }

      const moved = { ...activeTask, col: toCol };
      const targetColTasks = ts.filter(t => t.col === toCol && t.projectId === currentProject.id);
      const overIdx = targetColTasks.findIndex(t => t.id === over.id);
      const insertAt = overIdx === -1 ? targetColTasks.length : overIdx;

      const remaining = ts.filter(t => t.id !== active.id);
      const targetRebuilt = [...targetColTasks];
      targetRebuilt.splice(insertAt, 0, moved);

      const result = [];
      let inserted = false;
      for (const t of remaining) {
        if (t.col === toCol && t.projectId === currentProject.id) {
          if (!inserted) { result.push(...targetRebuilt); inserted = true; }
        } else {
          result.push(t);
        }
      }
      if (!inserted) result.push(...targetRebuilt);
      return result;
    });
  };

  const addCard = (colId, text) => {
    if (!currentProject) return;
    setTasks(ts => [...ts, {
      id: crypto.randomUUID(),
      projectId: currentProject.id,
      col: colId,
      text,
      priority: 0,
      note: '',
    }]);
  };

  const deleteCard = (id) => {
    const removed = tasks.find(t => t.id === id);
    const index = tasks.findIndex(t => t.id === id);
    setTasks(ts => ts.filter(t => t.id !== id));
    if (removed) {
      toast(`Deleted "${removed.text}"`, () => {
        setTasks(ts => {
          const next = [...ts];
          next.splice(index, 0, removed);
          return next;
        });
      });
    }
  };

  const editCard = (id, text) =>
    setTasks(ts => ts.map(t => (t.id === id ? { ...t, text } : t)));

  const cyclePriority = (id) =>
    setTasks(ts => ts.map(t =>
      t.id === id ? { ...t, priority: ((t.priority || 0) + 1) % 4 } : t
    ));

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">✅ Tasks</h2>
        <p className="text-sm text-muted mt-1">
          {filterProject === 'all'
            ? 'All tasks across your projects. Click a project to open its board.'
            : `Board for ${currentProject?.name}. Drag cards to move or reorder.`}
        </p>
      </div>

      {/* Project filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterProject('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            filterProject === 'all'
              ? 'bg-accent text-white border-accent'
              : 'bg-panel border-border text-muted hover:text-ink'
          }`}
        >
          All projects
        </button>
        {projects.map(p => {
          const active = filterProject === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setFilterProject(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${
                active
                  ? 'bg-accent text-white border-accent'
                  : 'bg-panel border-border text-muted hover:text-ink'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: active ? '#fff' : p.color }}
              />
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {filterProject === 'all' ? (
        <div className="space-y-6">
          {grouped.length === 0 && (
            <div className="bg-panel border border-border rounded-2xl p-12 text-center">
              <Folder className="mx-auto text-muted mb-3" size={28} />
              <p className="text-muted text-sm">No tasks yet. Open a project to add some.</p>
            </div>
          )}
          {grouped.map(g => (
            <div key={g.project?.id || 'orphaned'}>
              <div className="flex items-center gap-2 mb-2 px-1">
                {g.project ? (
                  <>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: g.project.color }}
                    />
                    <h3 className="font-semibold text-sm">{g.project.name}</h3>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                    <h3 className="font-semibold text-sm text-muted">No project</h3>
                  </>
                )}
                <span className="text-xs text-muted">({g.tasks.length})</span>
                {g.project && (
                  <button
                    onClick={() => setFilterProject(g.project.id)}
                    className="ml-auto text-xs text-accent hover:underline"
                  >
                    Open board →
                  </button>
                )}
              </div>
              <div className="bg-panel border border-border rounded-2xl overflow-hidden">
                {g.tasks.map(t => (
                  <FlatTaskRow
                    key={t.id}
                    task={t}
                    project={projectOf(t.projectId)}
                    onDelete={deleteCard}
                    onCyclePriority={cyclePriority}
                    onJumpProject={(pid) => pid && setFilterProject(pid)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : currentColumns.length === 0 ? (
        <div className="bg-panel border border-border rounded-2xl p-12 text-center">
          <p className="text-muted text-sm">This project has no columns. Add some in Projects.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${currentColumns.length}, minmax(220px, 1fr))` }}
          >
            {currentColumns.map(col => (
              <Column
                key={col.id}
                col={col}
                tasks={tasks.filter(t => t.col === col.id && t.projectId === currentProject.id)}
                onAdd={addCard}
                onDelete={deleteCard}
                onEdit={editCard}
                onCyclePriority={cyclePriority}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="bg-bg border border-accent rounded-lg p-3 text-sm shadow-2xl">
                {activeTask.text}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Default project hint */}
      {filterProject === 'all' && !defaultProjectId && (
        <p className="text-xs text-muted text-center">
          Create a project first — head to the Projects tab.
        </p>
      )}
    </div>
  );
}