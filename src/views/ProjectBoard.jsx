import { useState } from 'react';
import { useToast } from './Toast';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  useDroppable, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, GripVertical, X, MoreHorizontal, Trash2, Pencil, ArrowLeft, ArrowRight, Check,
} from 'lucide-react';
import { COLUMN_COLORS } from '../store';

const PRIORITY_COLORS = { 1: 'bg-danger', 2: 'bg-warning', 3: 'bg-blue-400' };

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

function ColumnMenu({ column, onRename, onDelete, onMove, canDelete, isFirst, isLast }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-muted hover:text-ink p-1 rounded hover:bg-border transition"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-panel border border-border-strong rounded-lg shadow-xl z-50 min-w-[160px] py-1">
            <button
              onClick={() => { onRename(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-border flex items-center gap-2"
            >
              <Pencil size={12} /> Rename
            </button>
            <button
              onClick={() => { onMove(-1); setOpen(false); }}
              disabled={isFirst}
              className="w-full text-left px-3 py-2 text-sm hover:bg-border flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ArrowLeft size={12} /> Move left
            </button>
            <button
              onClick={() => { onMove(1); setOpen(false); }}
              disabled={isLast}
              className="w-full text-left px-3 py-2 text-sm hover:bg-border flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ArrowRight size={12} /> Move right
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              disabled={!canDelete}
              className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-border flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Column({ col, tasks, onAdd, onDelete, onEdit, onCyclePriority, columnMenu, renaming, onRenameSubmit }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [renameDraft, setRenameDraft] = useState(col.title);
  const accent = COLUMN_COLORS[col.accent] || COLUMN_COLORS.blue;

  const submit = () => {
    if (draft.trim()) onAdd(col.id, draft.trim());
    setDraft(''); setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-panel border border-border border-t-4 ${accent.border} rounded-2xl p-3 min-h-[400px] transition ${
        isOver ? 'ring-2 ring-accent' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        {renaming ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              autoFocus
              value={renameDraft}
              onChange={e => setRenameDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onRenameSubmit(renameDraft);
                if (e.key === 'Escape') onRenameSubmit(null);
              }}
              className="flex-1 min-w-0 bg-bg border border-accent rounded px-2 py-1 text-sm focus:outline-none"
            />
            <button
              onClick={() => onRenameSubmit(renameDraft)}
              className="text-success hover:text-success/80"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm truncate">{col.title}</h3>
            <span className="text-xs text-muted flex-shrink-0">{tasks.length}</span>
          </div>
        )}
        {!renaming && columnMenu}
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

export default function ProjectBoard({ project, tasks, setTasks, updateProject }) {
  const [activeId, setActiveId] = useState(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const toast = useToast();
  const columns = project.columns;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const columnOf = (id) =>
    columns.some(c => c.id === id) ? id : tasks.find(t => t.id === id)?.col;

  const onDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const fromCol = columnOf(active.id);
    const toCol = columnOf(over.id);
    if (!fromCol || !toCol) return;

    setTasks(ts => {
      const activeTask = ts.find(t => t.id === active.id);
      if (!activeTask) return ts;

      if (fromCol === toCol) {
        const colTasks = ts.filter(t => t.col === fromCol);
        const oldIdx = colTasks.findIndex(t => t.id === active.id);
        const newIdx = colTasks.findIndex(t => t.id === over.id);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return ts;
        const reordered = arrayMove(colTasks, oldIdx, newIdx);
        const result = [];
        for (const t of ts) {
          if (t.col === fromCol) continue;
          result.push(t);
        }
        return [...result, ...reordered];
      }

      const moved = { ...activeTask, col: toCol };
      const targetColTasks = ts.filter(t => t.col === toCol);
      const overIdx = targetColTasks.findIndex(t => t.id === over.id);
      const insertAt = overIdx === -1 ? targetColTasks.length : overIdx;
      const remaining = ts.filter(t => t.id !== active.id);
      const targetRebuilt = [...targetColTasks];
      targetRebuilt.splice(insertAt, 0, moved);

      const result = [];
      let inserted = false;
      for (const t of remaining) {
        if (t.col === toCol) {
          if (!inserted) { result.push(...targetRebuilt); inserted = true; }
        } else { result.push(t); }
      }
      if (!inserted) result.push(...targetRebuilt);
      return result;
    });
  };

  // FIX: include projectId so cards stay attached to the right project
  const addCard = (colId, text) =>
    setTasks(ts => [...ts, {
      id: crypto.randomUUID(),
      projectId: project.id,
      col: colId,
      text,
      priority: 0,
      note: '',
    }]);

  const deleteCard = (id) => {
    const removed = tasks.find(t => t.id === id);
    const idx = tasks.findIndex(t => t.id === id);
    setTasks(ts => ts.filter(t => t.id !== id));
    if (removed) {
      toast(`Deleted "${removed.text}"`, () => {
        setTasks(ts => {
          const next = [...ts];
          next.splice(idx, 0, removed);
          return next;
        });
      });
    }
  };

  const editCard = (id, text) =>
    setTasks(ts => ts.map(t => (t.id === id ? { ...t, text } : t)));

  const cyclePriority = (id) =>
    setTasks(ts => ts.map(t => t.id === id ? { ...t, priority: ((t.priority || 0) + 1) % 4 } : t));

  // Column management — all inline, no prompt()/confirm()
  const submitNewColumn = () => {
    const name = newColumnName.trim();
    if (!name) { setAddingColumn(false); setNewColumnName(''); return; }
    const accents = Object.keys(COLUMN_COLORS);
    const accent = accents[Math.floor(Math.random() * accents.length)];
    updateProject({
      columns: [...columns, { id: crypto.randomUUID(), title: name, accent }],
    });
    setNewColumnName('');
    setAddingColumn(false);
  };

  const submitRename = (colId, name) => {
    if (name && name.trim()) {
      updateProject({
        columns: columns.map(c => (c.id === colId ? { ...c, title: name.trim() } : c)),
      });
    }
    setRenamingId(null);
  };

  const confirmDelete = (colId) => {
    if (columns.length <= 1) return;
    updateProject({ columns: columns.filter(c => c.id !== colId) });
    setTasks(ts => ts.filter(t => t.col !== colId));
    setDeletingId(null);
  };

  const moveColumn = (colId, dir) => {
    const idx = columns.findIndex(c => c.id === colId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= columns.length) return;
    const next = [...columns];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    updateProject({ columns: next });
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns.length + 1}, minmax(220px, 1fr))` }}
        >
          {columns.map((col, i) => (
            <div key={col.id} className="relative">
              {deletingId === col.id ? (
                <div className="bg-panel border border-danger/40 border-t-4 border-t-danger rounded-2xl p-4 min-h-[400px] flex flex-col items-center justify-center gap-3">
                  <Trash2 size={24} className="text-danger" />
                  <p className="text-sm text-center">Delete "<strong>{col.title}</strong>" and its {tasks.filter(t => t.col === col.id).length} cards?</p>
                  <div className="flex gap-2">
                    <button onClick={() => confirmDelete(col.id)} className="bg-danger text-white rounded-lg px-3 py-1.5 text-sm font-medium">Delete</button>
                    <button onClick={() => setDeletingId(null)} className="text-muted text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <Column
                  col={col}
                  tasks={tasks.filter(t => t.col === col.id)}
                  onAdd={addCard}
                  onDelete={deleteCard}
                  onEdit={editCard}
                  onCyclePriority={cyclePriority}
                  renaming={renamingId === col.id}
                  onRenameSubmit={(name) => submitRename(col.id, name)}
                  columnMenu={
                    <ColumnMenu
                      column={col}
                      onRename={() => setRenamingId(col.id)}
                      onDelete={() => setDeletingId(col.id)}
                      onMove={(d) => moveColumn(col.id, d)}
                      canDelete={columns.length > 1}
                      isFirst={i === 0}
                      isLast={i === columns.length - 1}
                    />
                  }
                />
              )}
            </div>
          ))}

          {addingColumn ? (
            <div className="border-2 border-dashed border-accent rounded-2xl p-3 min-h-[400px] flex flex-col gap-2">
              <input
                autoFocus
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitNewColumn();
                  if (e.key === 'Escape') { setAddingColumn(false); setNewColumnName(''); }
                }}
                placeholder="Column name…"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
              <button onClick={submitNewColumn} className="bg-accent text-white rounded-lg px-3 py-1.5 text-sm font-medium">Add column</button>
              <button onClick={() => { setAddingColumn(false); setNewColumnName(''); }} className="text-muted text-sm">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="border-2 border-dashed border-border rounded-2xl p-4 text-muted hover:text-ink hover:border-border-strong transition flex flex-col items-center justify-center gap-2 min-h-[400px]"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">Add column</span>
            </button>
          )}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="bg-bg border border-accent rounded-lg p-3 text-sm shadow-2xl">
              {activeTask.text}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}