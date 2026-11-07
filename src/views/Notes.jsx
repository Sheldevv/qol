import { useEffect, useMemo, useState } from 'react';
import { load, save } from '../store';
import { useToast } from '../components/Toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus, Trash2, Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Link as LinkIcon, Undo, Redo, Search, Pin, Folder,
} from 'lucide-react';

function Toolbar({ editor }) {
  if (!editor) return null;
  const btn = (active, onClick, Icon, title) => (
    <button
      onClick={onClick} title={title}
      className={`p-2 rounded-md transition ${
        active ? 'bg-accent text-white' : 'text-muted hover:bg-border hover:text-ink'
      }`}
    >
      <Icon size={14} />
    </button>
  );
  return (
    <div className="flex gap-1 p-2 border-b border-border">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), Bold, 'Bold')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), Italic, 'Italic')}
      {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), Heading1, 'H1')}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, 'H2')}
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), List, 'Bullets')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, 'Numbered')}
      {btn(editor.isActive('link'), () => {
        const url = prompt('URL:');
        if (url === null) return;
        if (url === '') editor.chain().focus().unsetLink().run();
        else editor.chain().focus().setLink({ href: url }).run();
      }, LinkIcon, 'Link')}
      <div className="w-px bg-border mx-1" />
      {btn(false, () => editor.chain().focus().undo().run(), Undo, 'Undo')}
      {btn(false, () => editor.chain().focus().redo().run(), Redo, 'Redo')}
    </div>
  );
}

function NoteEditor({ note, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: note.content || '<p></p>',
    onUpdate: ({ editor }) => onChange(note.id, editor.getHTML()),
  });
  const wordCount = editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0;

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="px-4 py-2 border-t border-border text-xs text-muted flex justify-between">
        <span>{wordCount} words</span>
        <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleString() : ''}</span>
      </div>
    </div>
  );
}

function ProjectDot({ project }) {
  if (!project) return <span className="w-2 h-2 rounded-full bg-muted flex-shrink-0" />;
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: project.color }}
    />
  );
}

export default function Notes() {
  const [notes, setNotes] = useState(() => load().notes || []);
  const [projects, setProjects] = useState(() => load().projects || []);
  const [filterProject, setFilterProject] = useState('all');
  const [activeId, setActiveId] = useState(null);
  const [q, setQ] = useState('');
  const toast = useToast();

  useEffect(() => {
    const all = load(); all.notes = notes; save(all);
  }, [notes]);

  useEffect(() => {
    const all = load(); all.projects = projects; save(all);
  }, [projects]);

  const projectOf = (projectId) =>
    projects.find(p => p.id === projectId) ||
    (projectId == null ? projects[0] : null);

  const currentProject =
    filterProject === 'all' ? null : projects.find(p => p.id === filterProject);

  const visibleNotes = useMemo(() => {
    let list = notes;
    if (filterProject !== 'all') {
      list = list.filter(n => n.projectId === filterProject);
    }
    if (q) {
      list = list.filter(n => n.title?.toLowerCase().includes(q.toLowerCase()));
    }
    return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [notes, filterProject, q]);

  const activeNote = notes.find(n => n.id === activeId);
  const activeNoteProject = activeNote ? projectOf(activeNote.projectId) : null;

  const addNote = () => {
    const projectId =
      filterProject !== 'all'
        ? filterProject
        : projects[0]?.id;
    if (!projectId) {
      toast('Create a project first');
      return;
    }
    const n = {
      id: crypto.randomUUID(),
      title: 'Untitled',
      content: '<p></p>',
      pinned: false,
      updatedAt: Date.now(),
      projectId,
    };
    setNotes(ns => [n, ...ns]);
    setActiveId(n.id);
  };

  const update = (id, patch) =>
    setNotes(ns => ns.map(n =>
      n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
    ));

  const remove = (id) => {
    const removed = notes.find(n => n.id === id);
    const index = notes.findIndex(n => n.id === id);
    setNotes(ns => ns.filter(n => n.id !== id));
    if (activeId === id) setActiveId(null);
    if (removed) {
      toast(`Deleted "${removed.title || 'Untitled'}"`, () => {
        setNotes(ns => {
          const next = [...ns];
          next.splice(index, 0, removed);
          return next;
        });
        setActiveId(removed.id);
      });
    }
  };

  const togglePin = (id) =>
    setNotes(ns => ns.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));

  const moveToProject = (id, projectId) =>
    setNotes(ns => ns.map(n =>
      n.id === id ? { ...n, projectId, updatedAt: Date.now() } : n
    ));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">📝 Notes</h2>
          <p className="text-sm text-muted mt-1">
            {notes.length} note{notes.length !== 1 ? 's' : ''} across {projects.length} project{projects.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button onClick={addNote}
          className="bg-accent hover:opacity-90 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> New Note
        </button>
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

      <div className="grid grid-cols-[280px_1fr] gap-4 min-h-[520px]">
        {/* Note list */}
        <div className="bg-panel border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 bg-bg border border-border rounded-lg px-2 py-1.5">
              <Search size={14} className="text-muted" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search notes…"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {visibleNotes.length === 0 && (
              <div className="p-6 text-center">
                <Folder className="mx-auto text-muted mb-2" size={20} />
                <p className="text-muted text-sm">
                  {q ? 'No matching notes' : filterProject === 'all' ? 'No notes yet.' : 'No notes in this project yet.'}
                </p>
              </div>
            )}
            {visibleNotes.map(n => {
              const proj = projectOf(n.projectId);
              return (
                <div
                  key={n.id}
                  onClick={() => setActiveId(n.id)}
                  className={`p-3 border-b border-border cursor-pointer group flex flex-col gap-1 transition ${
                    activeId === n.id ? 'bg-border' : 'hover:bg-border/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(n.id); }}
                      className={`flex-shrink-0 ${n.pinned ? 'text-accent' : 'text-muted/40 hover:text-muted'}`}
                    >
                      <Pin size={12} fill={n.pinned ? 'currentColor' : 'none'} />
                    </button>
                    <span className="truncate text-sm flex-1 font-medium">{n.title || 'Untitled'}</span>
                    <button
                      onClick={e => { e.stopPropagation(); remove(n.id); }}
                      className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 pl-5">
                    <ProjectDot project={proj} />
                    <span
                      className="text-[10px] truncate"
                      style={{ color: proj?.color || 'var(--color-muted)' }}
                    >
                      {proj?.name || 'No project'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div>
          {activeNote ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={activeNote.title}
                  onChange={e => update(activeNote.id, { title: e.target.value })}
                  className="flex-1 bg-transparent text-xl font-semibold focus:outline-none border-b border-transparent focus:border-border pb-2"
                  placeholder="Note title"
                />
                <select
                  value={activeNote.projectId || ''}
                  onChange={e => moveToProject(activeNote.id, e.target.value)}
                  className="bg-panel border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-accent"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <NoteEditor
                key={activeNote.id}
                note={activeNote}
                onChange={(id, html) => update(id, { content: html })}
              />
            </div>
          ) : (
            <div className="bg-panel border border-border rounded-2xl p-12 text-center text-muted">
              <p>Select or create a note to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}