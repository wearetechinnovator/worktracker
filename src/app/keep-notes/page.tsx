'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Edit3, FileText, Loader2, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
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

const NOTE_COLORS = ['#f8fafc', '#eef2ff', '#ecfeff', '#f0fdf4', '#fff7ed', '#fff1f2', '#fefce8'];

export default function KeepNotesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState(NOTE_COLORS[0]);
  const [newPinned, setNewPinned] = useState(false);

  const [editTarget, setEditTarget] = useState<KeepNote | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState(NOTE_COLORS[0]);
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

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
    [notes]
  );

  const resetCreateForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewColor(NOTE_COLORS[0]);
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
    setEditColor(note.color || NOTE_COLORS[0]);
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

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const res = await fetch(`/api/keep-notes/${noteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete note');
      await fetchNotes();
    } catch (err: any) {
      alert(err.message || 'Failed to delete note');
    }
  };

  const handleTogglePin = async (note: KeepNote) => {
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
    <div style={{ display: 'grid', gap: '14px' }}>
      <section className="card" style={{ display: 'grid', gap: '12px' }}>
        <div>
          <p className="hero-eyebrow">Personal Workspace</p>
          <h1 className="hero-title" style={{ marginBottom: '4px' }}>Keep Notes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>
            Capture reminders, ideas, and task details for quick access.
          </p>
        </div>

        <form onSubmit={handleCreateNote} style={{ display: 'grid', gap: '10px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Note title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <textarea
            className="form-control"
            placeholder="Write your note..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            required
          />

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  title="Select note color"
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '999px',
                    border: `2px solid ${newColor === c ? 'var(--text-primary)' : 'transparent'}`,
                    backgroundColor: c,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setNewPinned((prev) => !prev)}
              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
            >
              {newPinned ? <Pin size={12} /> : <PinOff size={12} />}
              <span>{newPinned ? 'Pinned' : 'Pin Note'}</span>
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginLeft: 'auto' }}>
              {submitting ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
              <span>{submitting ? 'Saving...' : 'Add Note'}</span>
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      )}

      <section
        style={{
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        }}
      >
        {sortedNotes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px', gridColumn: '1 / -1' }}>
            <FileText size={18} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No notes yet. Add your first note above.</p>
          </div>
        ) : (
          sortedNotes.map((note) => (
            <article
              key={note._id}
              className="card"
              style={{
                backgroundColor: note.color || '#f8fafc',
                border: note.isPinned ? '1px solid #93c5fd' : '1px solid var(--border-color)',
                display: 'grid',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>{note.title}</h3>
                {note.isPinned && <Pin size={14} style={{ color: '#2563eb', flexShrink: 0 }} />}
              </div>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {note.content}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Updated {new Date(note.updatedAt).toLocaleString()}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="action-btn" title="Pin/Unpin" onClick={() => handleTogglePin(note)}>
                    {note.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                  <button className="action-btn" title="Edit" onClick={() => openEditModal(note)}>
                    <Edit3 size={12} />
                  </button>
                  <button className="action-btn btn-delete-item" title="Delete" onClick={() => handleDelete(note._id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Edit Note</h3>
              <button className="modal-close" onClick={() => setEditTarget(null)}>&times;</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'grid', gap: '10px' }}>
              <input
                type="text"
                className="form-control"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
              <textarea
                className="form-control"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                required
              />

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      title="Select note color"
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '999px',
                        border: `2px solid ${editColor === c ? 'var(--text-primary)' : 'transparent'}`,
                        backgroundColor: c,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditPinned((prev) => !prev)}
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                >
                  {editPinned ? <Pin size={12} /> : <PinOff size={12} />}
                  <span>{editPinned ? 'Pinned' : 'Pin Note'}</span>
                </button>

                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginLeft: 'auto' }}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
