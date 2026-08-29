'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Edit3, FileText, Loader2, Pin, PinOff, Plus, Trash2, X, StickyNote } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';

interface KeepNote {
  _id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const NOTE_COLORS = [
  { name: 'Yellow', value: '#fef9c3', border: '#fde047', accent: '#ca8a04' },
  { name: 'Blue', value: '#e0f2fe', border: '#7dd3fc', accent: '#0284c7' },
  { name: 'Green', value: '#dcfce7', border: '#86efac', accent: '#16a34a' },
  { name: 'Pink', value: '#fce7f3', border: '#f472b6', accent: '#db2777' },
  { name: 'Purple', value: '#f3e8ff', border: '#c084fc', accent: '#9333ea' },
  { name: 'Orange', value: '#ffedd5', border: '#fdba74', accent: '#ea580c' },
  { name: 'White', value: '#ffffff', border: '#e2e8f0', accent: '#475569' },
];

export default function KeepNotesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Create & Edit
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState(NOTE_COLORS[0].value);
  const [newPinned, setNewPinned] = useState(false);

  const [editTarget, setEditTarget] = useState<KeepNote | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState(NOTE_COLORS[0].value);
  const [editPinned, setEditPinned] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/keep-notes');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch notes');
      setNotes(data.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to load notes.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, fetchNotes]);

  const pinnedNotes = useMemo(() => notes.filter((n) => n.isPinned), [notes]);
  const unpinnedNotes = useMemo(() => notes.filter((n) => !n.isPinned), [notes]);

  const resetCreateForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewColor(NOTE_COLORS[0].value);
    setNewPinned(false);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/keep-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          color: newColor,
          isPinned: newPinned,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create note');

      resetCreateForm();
      setIsCreateModalOpen(false);
      await fetchNotes();
    } catch (err: any) {
      alert(err.message || 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (note: KeepNote) => {
    setEditTarget(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color || NOTE_COLORS[0].value);
    setEditPinned(note.isPinned);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editTitle.trim() || !editContent.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/keep-notes/${editTarget._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          color: editColor,
          isPinned: editPinned,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update note');

      setEditTarget(null);
      await fetchNotes();
    } catch (err: any) {
      alert(err.message || 'Failed to update note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Delete this sticky note?')) return;

    try {
      const res = await fetch(`/api/keep-notes/${noteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete note');
      await fetchNotes();
    } catch (err: any) {
      alert(err.message || 'Failed to delete note');
    }
  };

  const handleTogglePin = async (note: KeepNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/keep-notes/${note._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update note');
      await fetchNotes();
    } catch (err: any) {
      alert(err.message || 'Failed to update note');
    }
  };

  if (loading && notes.length === 0) {
    return <PageShimmer variant="dashboard" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* PAGE HEADER WITH Windows-Style + New Note ACTION BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p className="hero-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <StickyNote size={14} style={{ color: '#2563eb' }} />
            <span>Personal Workspace</span>
          </p>
          <h1 className="hero-title" style={{ margin: 0, fontSize: '1.45rem', fontWeight: 850 }}>Keep Notes</h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '2px', margin: 0 }}>
            Sticky notes to capture quick reminders, task notes, and ideas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setIsCreateModalOpen(true);
          }}
          className="btn btn-primary"
          style={{
            padding: '9px 18px',
            fontSize: '0.84rem',
            fontWeight: 750,
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px' }}>
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>{error}</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {notes.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: '#ffffff',
            border: '2px dashed #e2e8f0',
            borderRadius: '12px',
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>No sticky notes yet</h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '4px', margin: 0 }}>
              Click <strong>+ New Note</strong> above to open a floating window card note.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
            }}
            style={{ marginTop: '8px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700 }}
          >
            <Plus size={14} />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* PINNED NOTES SECTION */}
          {pinnedNotes.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Pin size={13} style={{ color: '#2563eb' }} />
                <span>Pinned ({pinnedNotes.length})</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '16px',
                }}
              >
                {pinnedNotes.map((note) => (
                  <StickyNoteCard
                    key={note._id}
                    note={note}
                    onEdit={() => openEditModal(note)}
                    onDelete={(e) => handleDelete(note._id, e)}
                    onTogglePin={(e) => handleTogglePin(note, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* OTHER NOTES SECTION */}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Others ({unpinnedNotes.length})</span>
                </div>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '16px',
                }}
              >
                {unpinnedNotes.map((note) => (
                  <StickyNoteCard
                    key={note._id}
                    note={note}
                    onEdit={() => openEditModal(note)}
                    onDelete={(e) => handleDelete(note._id, e)}
                    onTogglePin={(e) => handleTogglePin(note, e)}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* WINDOW MODAL: CREATE NEW NOTE */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)} style={{ zIndex: 1200, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)' }}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              width: '95%',
              padding: 0,
              overflow: 'hidden',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
              backgroundColor: newColor || '#ffffff',
            }}
          >
            {/* Windows Window Header Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.65)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StickyNote size={15} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>New Sticky Note</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Window Content Form */}
            <form onSubmit={handleCreateNote} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Note Title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  border: 'none',
                  background: 'transparent',
                  padding: '4px 0',
                  boxShadow: 'none',
                  outline: 'none',
                  color: '#0f172a',
                }}
                autoFocus
                required
              />

              <textarea
                className="form-control"
                placeholder="Take a note..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={5}
                style={{
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  border: 'none',
                  background: 'transparent',
                  padding: '4px 0',
                  boxShadow: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  color: '#1e293b',
                }}
                required
              />

              {/* Window Footer Controls: Color Picker & Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>

                {/* Color Palette Dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewColor(c.value)}
                      title={c.name}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: c.value,
                        border: newColor === c.value ? `2px solid ${c.accent}` : '1px solid rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        transform: newColor === c.value ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setNewPinned(!newPinned)}
                    style={{
                      background: newPinned ? '#eff6ff' : 'transparent',
                      border: newPinned ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      color: newPinned ? '#2563eb' : '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {newPinned ? <Pin size={13} /> : <PinOff size={13} />}
                    <span>{newPinned ? 'Pinned' : 'Pin'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 650,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{ padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    {submitting ? <Loader2 size={13} className="spin" /> : 'Save Note'}
                  </button>
                </div>

              </div>
            </form>

          </div>
        </div>
      )}

      {/* WINDOW MODAL: EDIT NOTE */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)} style={{ zIndex: 1200, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)' }}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              width: '95%',
              padding: 0,
              overflow: 'hidden',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
              backgroundColor: editColor || '#ffffff',
            }}
          >
            {/* Windows Window Header Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.65)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StickyNote size={15} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Edit Sticky Note</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Window Content Form */}
            <form onSubmit={handleSaveEdit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                className="form-control"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  border: 'none',
                  background: 'transparent',
                  padding: '4px 0',
                  boxShadow: 'none',
                  outline: 'none',
                  color: '#0f172a',
                }}
                required
              />

              <textarea
                className="form-control"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                style={{
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  border: 'none',
                  background: 'transparent',
                  padding: '4px 0',
                  boxShadow: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  color: '#1e293b',
                }}
                required
              />

              {/* Window Footer Controls: Color Picker & Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>

                {/* Color Palette Dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setEditColor(c.value)}
                      title={c.name}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: c.value,
                        border: editColor === c.value ? `2px solid ${c.accent}` : '1px solid rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        transform: editColor === c.value ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditPinned(!editPinned)}
                    style={{
                      background: editPinned ? '#eff6ff' : 'transparent',
                      border: editPinned ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      color: editPinned ? '#2563eb' : '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {editPinned ? <Pin size={13} /> : <PinOff size={13} />}
                    <span>{editPinned ? 'Pinned' : 'Pin'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 650,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{ padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    {submitting ? <Loader2 size={13} className="spin" /> : 'Save Changes'}
                  </button>
                </div>

              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// WINDOWS STICKY NOTE CARD COMPONENT
function StickyNoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  note: KeepNote;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
}) {
  return (
    <article
      onClick={onEdit}
      style={{
        backgroundColor: note.color || '#fef9c3',
        border: note.isPinned ? '1px solid #60a5fa' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: '10px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '160px',
        boxShadow: note.isPinned
          ? '0 4px 14px rgba(37, 99, 235, 0.12)'
          : '0 2px 6px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = note.isPinned
          ? '0 4px 14px rgba(37, 99, 235, 0.12)'
          : '0 2px 6px rgba(0, 0, 0, 0.04)';
      }}
    >
      <div>
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
            {note.title}
          </h3>
          {note.isPinned && (
            <span title="Pinned Note" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Pin size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
            </span>
          )}
        </div>

        {/* Card Content Body */}
        <p
          style={{
            margin: 0,
            color: '#334155',
            fontSize: '0.8rem',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {note.content}
        </p>
      </div>

      {/* Card Footer Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 550 }}>
          {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>

        <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="action-btn"
            title={note.isPinned ? 'Unpin' : 'Pin'}
            onClick={onTogglePin}
            style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#475569', borderRadius: '4px' }}
          >
            {note.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
          <button
            type="button"
            className="action-btn"
            title="Edit Note"
            onClick={onEdit}
            style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#475569', borderRadius: '4px' }}
          >
            <Edit3 size={13} />
          </button>
          <button
            type="button"
            className="action-btn btn-delete-item"
            title="Delete Note"
            onClick={onDelete}
            style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', borderRadius: '4px' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

