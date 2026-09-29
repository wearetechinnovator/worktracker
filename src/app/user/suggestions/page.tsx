"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Lightbulb,
  CheckCircle2,
  Clock,
  Search,
  MessageSquare,
  Sparkles,
  Loader2,
  RefreshCw,
  Calendar,
  X,
  XCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface Suggestion {
  _id: string;
  user_id:
    | string
    | {
        _id: string;
        full_name?: string;
        email?: string;
      };
  suggestion: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: {
    _id: string;
    full_name?: string;
    email?: string;
  } | null;
  approved_at?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function UserSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Create / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null);
  const [suggestionText, setSuggestionText] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // -----------------------------------------
  // FETCH SUGGESTIONS
  // -----------------------------------------
  const fetchSuggestions = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const response = await fetch("/api/suggestions", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load suggestions");
      }

      setSuggestions(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load suggestions"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // -----------------------------------------
  // MODAL HANDLERS
  // -----------------------------------------
  const openCreateModal = () => {
    setEditingSuggestion(null);
    setSuggestionText("");
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: Suggestion) => {
    setEditingSuggestion(item);
    setSuggestionText(item.suggestion);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setIsFormModalOpen(false);
    setEditingSuggestion(null);
    setSuggestionText("");
  };

  // -----------------------------------------
  // SAVE / CREATE / UPDATE
  // -----------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = suggestionText.trim();
    if (!trimmed) {
      toast.warning("Please enter your suggestion before submitting.");
      return;
    }

    try {
      setSaving(true);
      const isEditing = Boolean(editingSuggestion);

      const url = isEditing
        ? `/api/suggestions?id=${editingSuggestion?._id}`
        : "/api/suggestions";

      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          suggestion: trimmed,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save suggestion");
      }

      toast.success(
        isEditing
          ? "Suggestion updated successfully."
          : "Suggestion submitted successfully."
      );

      closeFormModal();

      if (isEditing && result.data) {
        setSuggestions((prev) =>
          prev.map((s) => (s._id === editingSuggestion?._id ? result.data : s))
        );
      } else if (result.data) {
        setSuggestions((prev) => [result.data, ...prev]);
      } else {
        await fetchSuggestions(true);
      }
    } catch (error) {
      console.error("Failed to save suggestion:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save suggestion"
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------
  // DELETE
  // -----------------------------------------
  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/suggestions?id=${deletingId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete suggestion");
      }

      toast.success("Suggestion deleted successfully.");
      setSuggestions((prev) => prev.filter((item) => item._id !== deletingId));
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete suggestion:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete suggestion"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // -----------------------------------------
  // FILTERED LIST & STATS
  // -----------------------------------------
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const textMatch = item.suggestion.toLowerCase().includes(query);
        const feedbackMatch = (item.message || "").toLowerCase().includes(query);
        return textMatch || feedbackMatch;
      }

      return true;
    });
  }, [suggestions, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = suggestions.length;
    const pending = suggestions.filter((s) => s.status === "pending").length;
    const approved = suggestions.filter((s) => s.status === "approved").length;
    const rejected = suggestions.filter((s) => s.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [suggestions]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* PAGE HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            
            <div>
              <h1
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                My Suggestions & Ideas
              </h1>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  margin: "3px 0 0 0",
                }}
              >
                Submit workplace ideas, edit or remove suggestions, and read administrative feedback.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => fetchSuggestions(true)}
            disabled={loading || refreshing}
            className="btn btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "9px",
              fontSize: "0.82rem",
            }}
            title="Refresh list"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "8px 16px",
              borderRadius: "9px",
              fontWeight: 600,
              fontSize: "0.82rem",
              boxShadow: "0 2px 6px rgba(59, 130, 246, 0.25)",
            }}
          >
            <Plus size={16} />
            <span>New Suggestion</span>
          </button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {/* Total */}
        <div
          className="card"
          style={{
            padding: "16px 18px",
            borderRadius: "14px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              Total
            </span>
            <div
              style={{
                fontSize: "1.65rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginTop: "4px",
              }}
            >
              {stats.total}
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(79, 70, 229, 0.1)",
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lightbulb size={21} />
          </div>
        </div>

        {/* Pending */}
        <div
          className="card"
          style={{
            padding: "16px 18px",
            borderRadius: "14px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              Pending Review
            </span>
            <div
              style={{
                fontSize: "1.65rem",
                fontWeight: 700,
                color: "#d97706",
                marginTop: "4px",
              }}
            >
              {stats.pending}
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.12)",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={21} />
          </div>
        </div>

        {/* Approved */}
        <div
          className="card"
          style={{
            padding: "16px 18px",
            borderRadius: "14px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              Approved
            </span>
            <div
              style={{
                fontSize: "1.65rem",
                fontWeight: 700,
                color: "#16a34a",
                marginTop: "4px",
              }}
            >
              {stats.approved}
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(34, 197, 94, 0.12)",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={21} />
          </div>
        </div>

        {/* Rejected */}
        <div
          className="card"
          style={{
            padding: "16px 18px",
            borderRadius: "14px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              Rejected
            </span>
            <div
              style={{
                fontSize: "1.65rem",
                fontWeight: 700,
                color: "#dc2626",
                marginTop: "4px",
              }}
            >
              {stats.rejected}
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XCircle size={21} />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div
        className="card"
        style={{
          padding: "12px 16px",
          borderRadius: "12px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => setStatusFilter("all")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background:
                statusFilter === "all"
                  ? "var(--accent-primary)"
                  : "transparent",
              color: statusFilter === "all" ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            All ({stats.total})
          </button>

          <button
            onClick={() => setStatusFilter("pending")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background:
                statusFilter === "pending"
                  ? "rgba(245, 158, 11, 0.15)"
                  : "transparent",
              color: statusFilter === "pending" ? "#b45309" : "var(--text-secondary)",
            }}
          >
            Pending ({stats.pending})
          </button>

          <button
            onClick={() => setStatusFilter("approved")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background:
                statusFilter === "approved"
                  ? "rgba(34, 197, 94, 0.15)"
                  : "transparent",
              color: statusFilter === "approved" ? "#15803d" : "var(--text-secondary)",
            }}
          >
            Approved ({stats.approved})
          </button>

          <button
            onClick={() => setStatusFilter("rejected")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background:
                statusFilter === "rejected"
                  ? "rgba(239, 68, 68, 0.15)"
                  : "transparent",
              color: statusFilter === "rejected" ? "#b91c1c" : "var(--text-secondary)",
            }}
          >
            Rejected ({stats.rejected})
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            position: "relative",
            minWidth: "260px",
            flex: "1",
            maxWidth: "380px",
          }}
        >
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
            placeholder="Search your suggestions or admin feedback..."
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
      </div>

      {/* SUGGESTIONS LIST */}
      {loading ? (
        <div
          className="card"
          style={{
            minHeight: "320px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            borderRadius: "14px",
            background: "var(--bg-secondary)",
          }}
        >
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "0.86rem" }}>
            Loading your suggestions...
          </p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div
          className="card"
          style={{
            minHeight: "340px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "40px 20px",
            borderRadius: "14px",
            background: "var(--bg-secondary)",
            border: "1px dashed var(--border-color)",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "var(--bg-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              marginBottom: "16px",
            }}
          >
            <Lightbulb size={28} style={{ opacity: 0.6 }} />
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            {searchQuery
              ? "No matching suggestions"
              : statusFilter !== "all"
              ? `No ${statusFilter} suggestions`
              : "No suggestions yet"}
          </h3>
          <p
            style={{
              marginTop: "6px",
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              maxWidth: "360px",
            }}
          >
            {searchQuery
              ? `No suggestions found matching "${searchQuery}"`
              : "Have an idea to improve workflows or solve a problem? Submit your suggestion!"}
          </p>

          {!searchQuery && (
            <button
              onClick={openCreateModal}
              className="btn btn-primary"
              style={{
                marginTop: "16px",
                padding: "8px 16px",
                borderRadius: "9px",
                fontSize: "0.82rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Plus size={15} />
              <span>Create Your First Suggestion</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredSuggestions.map((item) => {
            const isApproved = item.status === "approved";
            const isRejected = item.status === "rejected";
            const isPending = item.status === "pending";

            return (
              <div
                key={item._id}
                className="card"
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  background: "var(--bg-secondary)",
                  border: isApproved
                    ? "1px solid rgba(34, 197, 94, 0.25)"
                    : isRejected
                    ? "1px solid rgba(239, 68, 68, 0.25)"
                    : "1px solid var(--border-color)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* HEADER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isApproved
                          ? "rgba(34, 197, 94, 0.12)"
                          : isRejected
                          ? "rgba(239, 68, 68, 0.12)"
                          : "rgba(245, 158, 11, 0.12)",
                        color: isApproved
                          ? "#16a34a"
                          : isRejected
                          ? "#dc2626"
                          : "#d97706",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Lightbulb size={18} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isApproved ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: "rgba(34, 197, 94, 0.12)",
                              color: "#16a34a",
                              border: "1px solid rgba(34, 197, 94, 0.25)",
                            }}
                          >
                            <CheckCircle2 size={12} />
                            Approved
                          </span>
                        ) : isRejected ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: "rgba(239, 68, 68, 0.12)",
                              color: "#dc2626",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                            }}
                          >
                            <XCircle size={12} />
                            Rejected
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: "rgba(245, 158, 11, 0.12)",
                              color: "#d97706",
                              border: "1px solid rgba(245, 158, 11, 0.25)",
                            }}
                          >
                            <Clock size={12} />
                            Pending Review
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          marginTop: "3px",
                          fontSize: "0.74rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Calendar size={11} />
                        <span>Submitted on {formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS (EDIT & DELETE) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => openEditModal(item)}
                      className="btn btn-secondary"
                      style={{
                        padding: "6px 11px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      title="Edit this suggestion"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setDeletingId(item._id)}
                      className="btn btn-danger"
                      style={{
                        padding: "6px 11px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      title="Delete this suggestion"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* SUGGESTION BODY */}
                <div
                  style={{
                    marginTop: "16px",
                    padding: "16px 18px",
                    borderRadius: "12px",
                    background: "var(--bg-tertiary)",
                    fontSize: "0.9rem",
                    lineHeight: "1.6",
                    color: "var(--text-primary)",
                    borderLeft: `3px solid ${
                      isApproved ? "#16a34a" : isRejected ? "#dc2626" : "var(--accent-primary)"
                    }`,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {item.suggestion}
                </div>

                {/* ADMIN FEEDBACK SECTION */}
                {isApproved && item.message ? (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "16px 18px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)",
                      border: "1px solid rgba(34, 197, 94, 0.25)",
                      boxShadow: "0 2px 8px rgba(34, 197, 94, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "#15803d",
                        }}
                      >
                        <MessageSquare size={15} />
                        <span>Admin Approval & Feedback</span>
                        
                      </div>
                      {item.approved_at && (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Approved {formatDate(item.approved_at)}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.88rem",
                        color: "var(--text-primary)",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontWeight: 500,
                      }}
                    >
                      {item.message}
                    </p>
                  </div>
                ) : isRejected && item.message ? (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "16px 18px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "#b91c1c",
                        }}
                      >
                        <AlertCircle size={15} />
                        <span>Admin Rejection Reason & Feedback</span>
                      </div>
                      {item.approved_at && (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Reviewed {formatDate(item.approved_at)}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.88rem",
                        color: "var(--text-primary)",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontWeight: 500,
                      }}
                    >
                      {item.message}
                    </p>
                  </div>
                ) : isPending ? (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(245, 158, 11, 0.06)",
                      border: "1px dashed rgba(245, 158, 11, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.78rem",
                      color: "#b45309",
                    }}
                  >
                    <Clock size={14} />
                    <span>Awaiting review by admin. Feedback will appear here once reviewed.</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isFormModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeFormModal();
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "24px",
              borderRadius: "16px",
              background: "var(--bg-secondary)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--border-color)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(79, 70, 229, 0.12)",
                    color: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {editingSuggestion ? <Edit3 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {editingSuggestion ? "Edit Suggestion" : "Submit a Suggestion"}
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    {editingSuggestion
                      ? "Update your idea or recommendation"
                      : "Share your idea, improvement, or feedback"}
                  </p>
                </div>
              </div>

              <button
                onClick={closeFormModal}
                disabled={saving}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "6px",
                  }}
                >
                  Your Suggestion <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  placeholder="Describe your idea or suggestion in detail. What problem does it solve, and how would it improve work?"
                  rows={6}
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    resize: "vertical",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "12px",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    outline: "none",
                    lineHeight: 1.5,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="btn btn-secondary"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !suggestionText.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: saving || !suggestionText.trim() ? 0.6 : 1,
                    cursor: saving || !suggestionText.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingSuggestion ? "Save Changes" : "Submit Suggestion"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingId(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              borderRadius: "16px",
              background: "var(--bg-secondary)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: "0 0 6px 0",
              }}
            >
              Delete Suggestion?
            </h3>

            <p
              style={{
                fontSize: "0.84rem",
                color: "var(--text-muted)",
                margin: "0 0 20px 0",
                lineHeight: 1.45,
              }}
            >
              Are you sure you want to delete this suggestion? This action cannot be undone.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="btn btn-secondary"
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="btn btn-danger"
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}