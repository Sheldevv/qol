import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from './Toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus, X, Link2, Trash2, MousePointer2, Network, CircleDot,
  Bold, Italic, List, Undo, Redo, Link as LinkIcon,
} from 'lucide-react';

const CARD_W = 240;
const TASK_HEIGHT = 96;
const NOTE_HEIGHT = 140;
const DRAG_THRESHOLD = 4; // px of movement before it's a drag, not a click

export default function ProjectCanvas({ project, tasks, notes, setTasks, setNotes, updateProject }) {
  const [dragging, setDragging] = useState(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);
  const [editing, setEditing] = useState(null);
  const [hoverConn, setHoverConn] = useState(null);
  const canvasRef = useRef(null);
  // Tracks { id, startX, startY, moved } to distinguish click vs drag
  const pointerRef = useRef(null);
  const toast = useToast();

  const connections = project.connections || [];

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left + canvasRef.current.scrollLeft - dragging.offsetX);
      const y = Math.max(0, e.clientY - rect.top + canvasRef.current.scrollTop - dragging.offsetY);
      if (dragging.type === 'task') {
        setTasks(ts => ts.map(t => (t.id === dragging.id ? { ...t, x, y } : t)));
      } else {
        setNotes(ns => ns.map(n => (n.id === dragging.id ? { ...n, x, y } : n)));
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, setTasks, setNotes]);

  const startDrag = (e, type, item) => {
    if (connectMode) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left + canvasRef.current.scrollLeft - item.x;
    const offsetY = e.clientY - rect.top + canvasRef.current.scrollTop - item.y;
    // Track starting position for click-vs-drag detection
    pointerRef.current = {
      id: item.id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    setDragging({ type, id: item.id, offsetX, offsetY });
  };

  // Suppress the click that follows a real drag
  useEffect(() => {
    const onMove = (e) => {
      const p = pointerRef.current;
      if (!p || p.moved) return;
      const dx = Math.abs(e.clientX - p.startX);
      const dy = Math.abs(e.clientY - p.startY);
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        p.moved = true;
      }
    };
    const onUp = () => {
      // Defer clearing so the click event (which fires right after pointerup) sees the flag
      setTimeout(() => { pointerRef.current = null; }, 0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const handleCardClick = (type, item) => {
    // If the pointer was moved (i.e. it was a drag), swallow the click
    if (pointerRef.current?.moved) return;
    // Ignore click if connect mode toggle just happened to fire on this card
    // (connect mode uses click explicitly, so we still allow it)

    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom({ type, id: item.id });
        return;
      }
      if (connectFrom.type === type && connectFrom.id === item.id) {
        setConnectFrom(null);
        return;
      }
      const exists = connections.find(c =>
        (c.from === connectFrom.id && c.to === item.id) ||
        (c.from === item.id && c.to === connectFrom.id)
      );
      if (exists) {
        toast('Already connected');
        setConnectFrom(null);
        return;
      }
      updateProject({
        connections: [
          ...connections,
          { id: crypto.randomUUID(), from: connectFrom.id, to: item.id },
        ],
      });
      setConnectFrom(null);
    } else {
      setEditing({ type, id: item.id });
    }
  };

  const removeConnection = (id) => {
    updateProject({ connections: connections.filter(c => c.id !== id) });
  };

  const deleteTask = (id) => {
    setTasks(ts => ts.filter(t => t.id !== id));
    updateProject({ connections: connections.filter(c => c.from !== id && c.to !== id) });
  };
  const deleteNote = (id) => {
    setNotes(ns => ns.filter(n => n.id !== id));
    updateProject({ connections: connections.filter(c => c.from !== id && c.to !== id) });
  };

  const addTask = () => {
    const t = {
      id: crypto.randomUUID(),
      projectId: project.id,
      col: project.columns[0]?.id || 'todo',
      text: 'New task', priority: 0, note: '',
      x: 40 + Math.random() * 200, y: 40 + Math.random() * 200,
    };
    setTasks(ts => [...ts, t]);
    setEditing({ type: 'task', id: t.id });
  };

  const addNote = () => {
    const n = {
      id: crypto.randomUUID(),
      projectId: project.id,
      title: 'New note', content: '<p></p>',
      pinned: false, updatedAt: Date.now(),
      x: 40 + Math.random() * 200, y: 40 + Math.random() * 200,
    };
    setNotes(ns => [...ns, n]);
    setEditing({ type: 'note', id: n.id });
  };

  const cardPositions = useMemo(() => {
    const map = new Map();
    tasks.forEach(t => map.set(t.id, {
      x: t.x ?? 0, y: t.y ?? 0,
      cx: (t.x ?? 0) + CARD_W / 2, cy: (t.y ?? 0) + TASK_HEIGHT / 2,
    }));
    notes.forEach(n => map.set(n.id, {
      x: n.x ?? 0, y: n.y ?? 0,
      cx: (n.x ?? 0) + CARD_W / 2, cy: (n.y ?? 0) + NOTE_HEIGHT / 2,
    }));
    return map;
  }, [tasks, notes]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setConnectMode(m => !m); setConnectFrom(null); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border transition ${
            connectMode
              ? 'bg-accent text-white border-accent'
              : 'bg-panel border-border text-muted hover:text-ink'
          }`}
        >
          {connectMode ? <Link2 size={14} /> : <MousePointer2 size={14} />}
          {connectMode ? 'Connect mode — click two cards' : 'Connect'}
        </button>
        <div className="flex-1" />
        <button onClick={addTask}
          className="px-3 py-1.5 rounded-lg text-sm bg-panel border border-border hover:border-border-strong flex items-center gap-2">
          <Plus size={14} /> Task
        </button>
        <button onClick={addNote}
          className="px-3 py-1.5 rounded-lg text-sm bg-panel border border-border hover:border-border-strong flex items-center gap-2">
          <Plus size={14} /> Note
        </button>
      </div>

      {connectFrom && (
        <div className="text-xs text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 flex items-center gap-2">
          <CircleDot size={12} /> Source selected — click a target card
          <button onClick={() => setConnectFrom(null)} className="ml-auto text-muted hover:text-ink">Cancel</button>
        </div>
      )}

      <div
        ref={canvasRef}
        className="relative bg-panel border border-border rounded-2xl overflow-auto canvas-grid"
        style={{ height: '600px' }}
      >
        <div className="relative" style={{ width: 2400, height: 1600 }}>
          <svg className="absolute inset-0" width="100%" height="100%" style={{ zIndex: 1 }}>
            {connections.map(c => {
              const from = cardPositions.get(c.from);
              const to = cardPositions.get(c.to);
              if (!from || !to) return null;
              const midX = (from.cx + to.cx) / 2;
              const path = `M ${from.cx} ${from.cy} C ${midX} ${from.cy}, ${midX} ${to.cy}, ${to.cx} ${to.cy}`;
              const isHover = hoverConn === c.id;
              return (
                <g key={c.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={isHover ? 'var(--color-danger)' : 'var(--color-accent)'}
                    strokeWidth={isHover ? 3 : 2}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onMouseEnter={() => setHoverConn(c.id)}
                    onMouseLeave={() => setHoverConn(null)}
                    onClick={(e) => { e.stopPropagation(); removeConnection(c.id); }}
                  />
                </g>
              );
            })}
          </svg>

          {tasks.map(task => {
            const isSource = connectFrom?.type === 'task' && connectFrom.id === task.id;
            const isDragging = dragging?.type === 'task' && dragging.id === task.id;
            return (
              <div
                key={task.id}
                onPointerDown={e => startDrag(e, 'task', task)}
                onClick={(e) => { e.stopPropagation(); handleCardClick('task', task); }}
                onDoubleClick={(e) => { e.stopPropagation(); if (!connectMode) setEditing({ type: 'task', id: task.id }); }}
                className={`absolute bg-bg border rounded-xl p-3 select-none transition ${
                  isDragging ? 'cursor-grabbing shadow-2xl' : 'cursor-grab hover:shadow-lg'
                } ${isSource ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-border-strong'}`}
                style={{
                  left: task.x ?? 0, top: task.y ?? 0,
                  width: CARD_W, height: TASK_HEIGHT,
                  zIndex: isDragging ? 30 : 10,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority ? ({ 1: 'bg-danger', 2: 'bg-warning', 3: 'bg-blue-400' }[task.priority]) : 'border border-border'
                  }`} />
                  <span className="text-[10px] uppercase tracking-wide text-muted">
                    Task · {project.columns.find(c => c.id === task.col)?.title || 'unknown'}
                  </span>
                </div>
                <p className="text-sm font-medium line-clamp-2">{task.text}</p>
                {task.note && <p className="text-xs text-muted mt-1 line-clamp-1">{task.note}</p>}
              </div>
            );
          })}

          {notes.map(note => {
            const isSource = connectFrom?.type === 'note' && connectFrom.id === note.id;
            const isDragging = dragging?.type === 'note' && dragging.id === note.id;
            const plain = note.content?.replace(/<[^>]*>/g, '').trim() || '';
            return (
              <div
                key={note.id}
                onPointerDown={e => startDrag(e, 'note', note)}
                onClick={(e) => { e.stopPropagation(); handleCardClick('note', note); }}
                onDoubleClick={(e) => { e.stopPropagation(); if (!connectMode) setEditing({ type: 'note', id: note.id }); }}
                className={`absolute bg-bg border rounded-xl p-3 select-none transition ${
                  isDragging ? 'cursor-grabbing shadow-2xl' : 'cursor-grab hover:shadow-lg'
                } ${isSource ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-border-strong'}`}
                style={{
                  left: note.x ?? 0, top: note.y ?? 0,
                  width: CARD_W, height: NOTE_HEIGHT,
                  zIndex: isDragging ? 30 : 10,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-[10px] uppercase tracking-wide text-muted">Note</span>
                </div>
                <p className="text-sm font-medium line-clamp-1">{note.title || 'Untitled'}</p>
                <p className="text-xs text-muted mt-1 line-clamp-4">{plain.slice(0, 100)}</p>
              </div>
            );
          })}

          {tasks.length === 0 && notes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
              <Network size={36} className="mb-3 opacity-50" />
              <p className="text-sm">Your canvas is empty.</p>
            </div>
          )}
        </div>
      </div>

      {editing?.type === 'task' && (
        <TaskModal
          task={tasks.find(t => t.id === editing.id)}
          columns={project.columns}
          onClose={() => setEditing(null)}
          onChange={(patch) => setTasks(ts => ts.map(t => t.id === editing.id ? { ...t, ...patch } : t))}
          onDelete={() => { deleteTask(editing.id); setEditing(null); }}
        />
      )}
      {editing?.type === 'note' && (
        <NoteModal
          note={notes.find(n => n.id === editing.id)}
          onClose={() => setEditing(null)}
          onChange={(patch) => setNotes(ns => ns.map(n => n.id === editing.id ? { ...n, ...patch, updatedAt: Date.now() } : n))}
          onDelete={() => { deleteNote(editing.id); setEditing(null); }}
        />
      )}
    </div>
  );
}

function TaskModal({ task, columns, onClose, onChange, onDelete }) {
  if (!task) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel border border-border-strong rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-xs uppercase tracking-wide text-muted">Task</span>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={task.text} onChange={e => onChange({ text: e.target.value })}
            className="w-full bg-transparent text-lg font-semibold focus:outline-none" />
          <textarea value={task.note || ''} onChange={e => onChange({ note: e.target.value })}
            placeholder="Add a note…" rows={4}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent" />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="text-muted">Column</span>
              <select value={task.col} onChange={e => onChange({ col: e.target.value })}
                className="mt-1 w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent">
                {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <label className="text-xs">
              <span className="text-muted">Priority</span>
              <select value={task.priority || 0} onChange={e => onChange({ priority: parseInt(e.target.value) })}
                className="mt-1 w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-accent">
                <option value={0}>None</option>
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            </label>
          </div>
        </div>
        <div className="flex justify-between items-center p-4 border-t border-border">
          <button onClick={onDelete} className="text-danger text-sm hover:underline flex items-center gap-1">
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={onClose} className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium">Done</button>
        </div>
      </div>
    </div>
  );
}

function NoteModal({ note, onClose, onChange, onDelete }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: note?.content || '<p></p>',
    onUpdate: ({ editor }) => onChange({ content: editor.getHTML() }),
  });
  if (!note) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel border border-border-strong rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-xs uppercase tracking-wide text-muted">Note</span>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-2">
          <input value={note.title} onChange={e => onChange({ title: e.target.value })}
            placeholder="Note title" className="w-full bg-transparent text-lg font-semibold focus:outline-none" />
          <div className="bg-bg border border-border rounded-xl overflow-hidden">
            {editor && (
              <div className="flex gap-1 p-2 border-b border-border">
                {[
                  { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
                  { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
                  { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
                  { icon: LinkIcon, action: () => {
                    const url = prompt('URL:');
                    if (url === null) return;
                    if (url === '') editor.chain().focus().unsetLink().run();
                    else editor.chain().focus().setLink({ href: url }).run();
                  }, active: editor.isActive('link') },
                  { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false },
                  { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false },
                ].map((b, i) => (
                  <button key={i} onClick={b.action}
                    className={`p-2 rounded-md transition ${b.active ? 'bg-accent text-white' : 'text-muted hover:bg-border hover:text-ink'}`}>
                    <b.icon size={14} />
                  </button>
                ))}
              </div>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
        <div className="flex justify-between items-center p-4 border-t border-border">
          <button onClick={onDelete} className="text-danger text-sm hover:underline flex items-center gap-1">
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={onClose} className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium">Done</button>
        </div>
      </div>
    </div>
  );
}