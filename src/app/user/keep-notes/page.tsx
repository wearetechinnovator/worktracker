"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Edit3,
  FileText,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
  StickyNote,
  Search,
  RefreshCw,
} from "lucide-react";
import PageShimmer from "@/components/PageShimmer";
import type { KeepNote } from "@/types/KeepNote";
import { toast } from "@/lib/toast";
import { useModalDraft } from "@/context/ModalDraftContext";
import { usePunch } from "@/context/PunchContext";
import ViewModeBanner from "@/components/ViewModeBanner";

const NOTE_COLORS = [
  { name: "Yellow", value: "#fef9c3", border: "#fde047", accent: "#ca8a04" },
  { name: "Blue", value: "#e0f2fe", border: "#7dd3fc", accent: "#0284c7" },
  { name: "Green", value: "#dcfce7", border: "#86efac", accent: "#16a34a" },
  { name: "Pink", value: "#fce7f3", border: "#f472b6", accent: "#db2777" },
  { name: "Purple", value: "#f3e8ff", border: "#c084fc", accent: "#9333ea" },
  { name: "Orange", value: "#ffedd5", border: "#fdba74", accent: "#ea580c" },
  { name: "Teal", value: "#ccfbf1", border: "#5eead4", accent: "#0d9488" },
  { name: "White", value: "#ffffff", border: "#e2e8f0", accent: "#475569" },
];

export default function UserKeepNotesPage() {
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isViewMode } = usePunch();
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    color: NOTE_COLORS[0].value,
    isPinned: false,
  });

  const draftKey = editingNoteId ? `edit-note-${editingNoteId}` : "create-note";
  const { saveDraft, getDraft, clearDraft, setModalOpenState } = useModalDraft();

  // --------------------------------------------------
  // FETCH NOTES FROM API
  // --------------------------------------------------
  const fetchNotes = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const response = await fetch("/api/keep-notes", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load keep notes");
      }

      setNotes(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Keep notes load error:", err);
      const msg = err instanceof Error ? err.message : "Failed to load notes";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // --------------------------------------------------
  // DRAFT RESTORE LISTENER
  // --------------------------------------------------
  useEffect(() => {
    const handleRestore = (e: CustomEvent) => {
      const { type, data } = e.detail || {};
      if (type === "keep-note" && data) {
        setEditingNoteId(data.editingNoteId || null);
        setFormData({
          title: data.title || "",
          content: data.content || "",
          color: data.color || NOTE_COLORS[0].value,
          isPinned: Boolean(data.isPinned),
        });
        const activeKey = data.editingNoteId ? `edit-note-${data.editingNoteId}` : "create-note";
        setModalOpenState(activeKey, true);
        setIsModalOpen(true);
      }
    };
    window.addEventListener("app-restore-modal", handleRestore as EventListener);
    return () => {
      window.removeEventListener("app-restore-modal", handleRestore as EventListener);
    };
  }, [setModalOpenState]);

  // --------------------------------------------------
  // FILTERED NOTES
  // --------------------------------------------------
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  // --------------------------------------------------
  // MODAL LOGIC
  // --------------------------------------------------
  const openModal = (note?: KeepNote) => {
    if (isViewMode) return;

    if (note) {
      setEditingNoteId(note._id);
      const noteDraftKey = `edit-note-${note._id}`;
      setModalOpenState(noteDraftKey, true);
      const draft = getDraft(noteDraftKey);
      if (draft && draft.data) {
        setFormData({
          title: draft.data.title || note.title,
          content: draft.data.content || note.content,
          color: draft.data.color || note.color || NOTE_COLORS[0].value,
          isPinned: draft.data.isPinned !== undefined ? draft.data.isPinned : note.isPinned,
        });
      } else {
        setFormData({
          title: note.title,
          content: note.content,
          color: note.color || NOTE_COLORS[0].value,
          isPinned: note.isPinned,
        });
      }
    } else {
      setEditingNoteId(null);
      setModalOpenState("create-note", true);
      const draft = getDraft("create-note");
      if (draft && draft.data) {
        setFormData({
          title: draft.data.title || "",
          content: draft.data.content || "",
          color: draft.data.color || NOTE_COLORS[0].value,
          isPinned: Boolean(draft.data.isPinned),
        });
      } else {
        setFormData({
          title: "",
          content: "",
          color: NOTE_COLORS[0].value,
          isPinned: false,
        });
      }
    }
    setIsModalOpen(true);
  };

  const isFormDirty = () => {
    return Boolean(formData.title.trim() || formData.content.trim());
  };

  const closeModal = () => {
    if (isFormDirty()) {
      saveDraft(draftKey, {
        type: "keep-note",
        title: formData.title.trim() ? `Note: ${formData.title.trim()}` : editingNoteId ? "Edit Note" : "New Note",
        subtitle: formData.content.slice(0, 30) || "Draft saved",
        data: {
          ...formData,
          editingNoteId,
        },
      });
    } else {
      clearDraft(draftKey);
    }
    setIsModalOpen(false);
    setEditingNoteId(null);
    setError(null);
  };

  // --------------------------------------------------
  // SAVE NOTE (CREATE / UPDATE)
  // --------------------------------------------------
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() && !formData.content.trim()) {
      toast.warning("Please provide a title or content for your note.");
      return;
    }

    try {
      setSubmitting(true);
      const isEditing = Boolean(editingNoteId);

      const url = isEditing
        ? `/api/keep-notes?id=${editingNoteId}`
        : "/api/keep-notes";

      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save note");
      }

      if (isEditing && result.data) {
        setNotes((prev) =>
          prev.map((n) => (n._id === editingNoteId ? result.data : n))
        );
        toast.success(`Note updated successfully`);
      } else if (result.data) {
        setNotes((prev) => [result.data, ...prev]);
        toast.success(`Note created successfully`);
      } else {
        await fetchNotes(true);
      }

      clearDraft(draftKey);
      setIsModalOpen(false);
      setEditingNoteId(null);
    } catch (err) {
      console.error("Save note error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // TOGGLE PIN
  // --------------------------------------------------
  const handleTogglePin = async (note: KeepNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isViewMode) return;

    const newPinnedState = !note.isPinned;

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n._id === note._id ? { ...n, isPinned: newPinnedState } : n))
    );

    try {
      const response = await fetch(`/api/keep-notes?id=${note._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ isPinned: newPinnedState }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to pin note");
      }

      toast.info(newPinnedState ? "Note pinned to top" : "Note unpinned");
    } catch (err) {
      console.error("Pin toggle error:", err);
      // Revert on error
      setNotes((prev) =>
        prev.map((n) => (n._id === note._id ? { ...n, isPinned: note.isPinned } : n))
      );
      toast.error("Failed to update pin status");
    }
  };

  // --------------------------------------------------
  // DELETE NOTE
  // --------------------------------------------------
  const handleDelete = async (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isViewMode) return;

    const note = notes.find((n) => n._id === noteId);
    const noteTitle = note?.title || "Note";

    if (!confirm(`Are you sure you want to delete "${noteTitle}"?`)) return;

    try {
      const response = await fetch(`/api/keep-notes?id=${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete note");
      }

      setNotes((prev) => prev.filter((n) => n._id !== noteId));
      toast.success(`Note "${noteTitle}" deleted`);
    } catch (err) {
      console.error("Delete note error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  if (loading && notes.length === 0) {
    return <PageShimmer variant="dashboard" />;
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      <ViewModeBanner />

      {/* PAGE HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          
          <div>
            <h1
              style={{
                fontSize: "1.45rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Keep Notes
            </h1>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                margin: "3px 0 0 0",
              }}
            >
              Capture quick thoughts, checklists, project ideas, and reference notes.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => fetchNotes(true)}
            disabled={loading || refreshing}
            className="btn btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
            }}
            title="Refresh notes"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => openModal()}
            disabled={isViewMode}
            title={isViewMode ? "Punched out: view mode only" : "Create new note"}
            className="btn btn-primary"
            style={{
              padding: "9px 18px",
              fontSize: "0.84rem",
              fontWeight: 700,
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              cursor: isViewMode ? "not-allowed" : "pointer",
              opacity: isViewMode ? 0.6 : 1,
            }}
          >
            <Plus size={16} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* SEARCH TOOLBAR */}
      <div
        className="card"
        style={{
          padding: "12px 16px",
          borderRadius: "12px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
        }}
      >
        <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title or content..."
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
          {notes.length} {notes.length === 1 ? "note" : "notes"} saved
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #ef4444",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
          }}
        >
          <AlertCircle size={16} style={{ color: "#ef4444" }} />
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {notes.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "60px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            background: "var(--bg-secondary)",
            border: "2px dashed var(--border-color)",
            borderRadius: "14px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "rgba(245, 158, 11, 0.12)",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StickyNote size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              No notes yet
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
              Keep thoughts, checklists, meeting notes, and snippets organized.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openModal()}
            disabled={isViewMode}
            style={{
              marginTop: "8px",
              padding: "8px 18px",
              fontSize: "0.82rem",
              fontWeight: 700,
              borderRadius: "8px",
              opacity: isViewMode ? 0.6 : 1,
            }}
          >
            <Plus size={15} />
            <span>Create First Note</span>
          </button>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "var(--bg-secondary)",
            borderRadius: "12px",
          }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            No notes found matching "{searchQuery}".
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="btn btn-secondary"
            style={{ marginTop: "10px", fontSize: "0.78rem" }}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* PINNED SECTION */}
          {pinnedNotes.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "14px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <Pin size={13} style={{ color: "#2563eb" }} />
                <span>Pinned ({pinnedNotes.length})</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                {pinnedNotes.map((note) => (
                  <StickyNoteCard
                    key={note._id}
                    note={note}
                    onEdit={() => openModal(note)}
                    onDelete={(e) => handleDelete(note._id, e)}
                    onTogglePin={(e) => handleTogglePin(note, e)}
                    isViewMode={isViewMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* OTHERS SECTION */}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "14px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <span>Others ({unpinnedNotes.length})</span>
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                {unpinnedNotes.map((note) => (
                  <StickyNoteCard
                    key={note._id}
                    note={note}
                    onEdit={() => openModal(note)}
                    onDelete={(e) => handleDelete(note._id, e)}
                    onTogglePin={(e) => handleTogglePin(note, e)}
                    isViewMode={isViewMode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT NOTE MODAL */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "540px",
              width: "100%",
              padding: 0,
              overflow: "hidden",
              borderRadius: "16px",
              border: "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 24px 48px -12px rgba(0,0,0,0.3)",
              backgroundColor: formData.color || "#ffffff",
              transition: "background-color 0.2s ease",
            }}
          >
            {/* Modal Titlebar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(6px)",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <StickyNote size={16} style={{ color: "#d97706" }} />
                <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a" }}>
                  {editingNoteId ? "Edit Sticky Note" : "New Sticky Note"}
                </span>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Note Editor Form */}
            <form
              onSubmit={handleSaveNote}
              style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <input
                type="text"
                placeholder="Note Title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  border: "none",
                  background: "transparent",
                  padding: "4px 0",
                  outline: "none",
                  color: "#0f172a",
                }}
                autoFocus={!editingNoteId}
              />

              <textarea
                placeholder="Take a note, paste links, write a list..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={7}
                style={{
                  fontSize: "0.88rem",
                  lineHeight: 1.55,
                  border: "none",
                  background: "transparent",
                  padding: "4px 0",
                  outline: "none",
                  resize: "vertical",
                  color: "#1e293b",
                  minHeight: "140px",
                }}
              />

              {/* Bottom Controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                {/* Color Palette */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      title={c.name}
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        backgroundColor: c.value,
                        border:
                          formData.color === c.value
                            ? `2px solid ${c.accent}`
                            : "1px solid rgba(0,0,0,0.18)",
                        cursor: "pointer",
                        transform: formData.color === c.value ? "scale(1.2)" : "scale(1)",
                        transition: "transform 0.15s ease",
                      }}
                    />
                  ))}
                </div>

                {/* Pin & Save */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                    style={{
                      background: formData.isPinned ? "#eff6ff" : "rgba(255,255,255,0.7)",
                      border: formData.isPinned ? "1px solid #93c5fd" : "1px solid #cbd5e1",
                      borderRadius: "7px",
                      padding: "6px 11px",
                      fontSize: "0.76rem",
                      fontWeight: 650,
                      color: formData.isPinned ? "#2563eb" : "#475569",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {formData.isPinned ? <Pin size={13} /> : <PinOff size={13} />}
                    <span>{formData.isPinned ? "Pinned" : "Pin"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      border: "1px solid #cbd5e1",
                      borderRadius: "7px",
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || (!formData.title.trim() && !formData.content.trim())}
                    style={{
                      padding: "6px 16px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: "7px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingNoteId ? "Save Changes" : "Save Note"}</span>
                    )}
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

function StickyNoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  isViewMode,
}: {
  note: KeepNote;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
  isViewMode?: boolean;
}) {
  return (
    <article
      onClick={() => !isViewMode && onEdit()}
      style={{
        backgroundColor: note.color || "#fef9c3",
        border: note.isPinned ? "1.5px solid #60a5fa" : "1px solid rgba(0,0,0,0.1)",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "170px",
        boxShadow: note.isPinned
          ? "0 6px 16px rgba(37, 99, 235, 0.12)"
          : "0 2px 8px rgba(0, 0, 0, 0.04)",
        cursor: isViewMode ? "default" : "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!isViewMode) {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isViewMode) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = note.isPinned
            ? "0 6px 16px rgba(37, 99, 235, 0.12)"
            : "0 2px 8px rgba(0, 0, 0, 0.04)";
        }
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.35,
              wordBreak: "break-word",
            }}
          >
            {note.title}
          </h3>
          {note.isPinned && (
            <span
              title="Pinned Note"
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(37, 99, 235, 0.12)",
                padding: "3px 6px",
                borderRadius: "6px",
              }}
            >
              <Pin size={12} style={{ color: "#2563eb", flexShrink: 0 }} />
            </span>
          )}
        </div>

        <p
          style={{
            margin: 0,
            color: "#334155",
            fontSize: "0.82rem",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "220px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {note.content}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "14px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>
          {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>

        {!isViewMode && (
          <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="action-btn"
              title={note.isPinned ? "Unpin note" : "Pin note"}
              onClick={onTogglePin}
              style={{
                padding: "5px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: note.isPinned ? "#2563eb" : "#64748b",
                borderRadius: "5px",
              }}
            >
              {note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            <button
              type="button"
              className="action-btn"
              title="Edit note"
              onClick={onEdit}
              style={{
                padding: "5px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#475569",
                borderRadius: "5px",
              }}
            >
              <Edit3 size={14} />
            </button>
            <button
              type="button"
              className="action-btn btn-delete-item"
              title="Delete note"
              onClick={onDelete}
              style={{
                padding: "5px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#ef4444",
                borderRadius: "5px",
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}