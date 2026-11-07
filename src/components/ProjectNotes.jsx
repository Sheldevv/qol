import { useMemo, useState } from 'react';
import { useToast } from './Toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus, Trash2, Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Link as LinkIcon, Undo, Redo, Search, Pin,
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
  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

export default function ProjectNotes({ notes, setNotes, project }) {
  const [activeId, setActiveId] = useState(notes[0]?.id ?? null);
  const [q, setQ] = useState('');
  const toast = useToast();

  const filtered = useMemo(() => {
    const list = notes.filter(n => !q || n.title?.toLowerCase().includes(q.toLowerCase()));
    return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [notes, q]);

  const activeNote = notes.find(n => n.id === activeId);

  const addNote = () => {
    const n = {
      id: crypto.randomUUID(), title: 'Untitled',
      content: '<p></p>', pinned: false,
      updatedAt: Date.now(),
      projectId: project.id,
      x: 40 + Math.random() * 200, y: 40 + Math.random() * 200,
    };
    setNotes(ns => [n, ...ns]);
    setActiveId(n.id);
  };

  const update = (id, patch) =>
    setNotes(ns => ns.map(n => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));

  const remove = (id) => {
    const removed = notes.find(n => n.id === id);
    const idx = notes.findIndex(n => n.id === id);
    setNotes(ns => ns.filter(n => n.id !== id));
    if (activeId === id) setActiveId(null);
    if (removed) {
      toast(`Deleted "${removed.title || 'Untitled'}"`, () => {
        setNotes(ns => {
          const next = [...ns];
          next.splice(idx, 0, removed);
          return next;
        });
        setActiveId(removed.id);
      });
    }
  };

  const togglePin = (id) =>
    setNotes(ns => ns.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{notes.length} note{notes.length !== 1 ? 's' : ''} in this project</p>
        </div>
        <button onClick={addNote}
          className="bg-accent hover:opacity-90 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> New Note
        </button>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-4 min-h-[520px]">
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
            {filtered.length === 0 && (
              <p className="text-muted text-sm p-4 text-center">
                {q ? 'No matching notes' : 'No notes yet.'}
              </p>
            )}
            {filtered.map(n => (
              <div
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={`p-3 border-b border-border cursor-pointer group flex items-center gap-2 transition ${
                  activeId === n.id ? 'bg-border' : 'hover:bg-border/50'
                }`}
              >
                <button
                  onClick={e => { e.stopPropagation(); togglePin(n.id); }}
                  className={`flex-shrink-0 ${n.pinned ? 'text-accent' : 'text-muted/40 hover:text-muted'}`}
                >
                  <Pin size={12} fill={n.pinned ? 'currentColor' : 'none'} />
                </button>
                <span className="truncate text-sm flex-1">{n.title || 'Untitled'}</span>
                <button
                  onClick={e => { e.stopPropagation(); remove(n.id); }}
                  className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          {activeNote ? (
            <div className="space-y-2">
              <input
                value={activeNote.title}
                onChange={e => update(activeNote.id, { title: e.target.value })}
                className="w-full bg-transparent text-xl font-semibold focus:outline-none border-b border-transparent focus:border-border pb-2"
                placeholder="Note title"
              />
              <NoteEditor
                key={activeNote.id}
                note={activeNote}
                onChange={(id, html) => update(id, { content: html })}
              />
            </div>
          ) : (
            <div className="bg-panel border border-border rounded-2xl p-12 text-center text-muted">
              <p>Select or create a note.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}