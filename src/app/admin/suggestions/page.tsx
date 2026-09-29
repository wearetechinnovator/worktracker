"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Lightbulb,
  CheckCircle2,
  Clock,
  Search,
  MessageSquare,
  Sparkles,
  Loader2,
  RefreshCw,
  User,
  Calendar,
  X,
  Check,
  Edit2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface UserInfo {
  _id: string;
  full_name?: string;
  email?: string;
  designation?: string;
  profile_picture?: string;
  profile?: {
    profile_picture?: string;
  };
}

interface Suggestion {
  _id: string;
  user_id: string | UserInfo;
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

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Action Modal State (Approve, Reject, or Edit Message)
  const [activeModalItem, setActiveModalItem] = useState<Suggestion | null>(null);
  const [modalActionType, setModalActionType] = useState<"approve" | "reject" | "edit">("approve");
  const [adminMessage, setAdminMessage] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // --------------------------------------------------
  // FETCH SUGGESTIONS
  // --------------------------------------------------
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

  // --------------------------------------------------
  // OPEN ACTION MODAL
  // --------------------------------------------------
  const openActionModal = (item: Suggestion, type: "approve" | "reject" | "edit") => {
    setActiveModalItem(item);
    setModalActionType(type);
    setAdminMessage(item.message || "");
  };

  const closeActionModal = () => {
    if (submittingAction) return;
    setActiveModalItem(null);
    setAdminMessage("");
  };

  // --------------------------------------------------
  // SUBMIT APPROVAL / REJECTION / EDIT
  // --------------------------------------------------
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeModalItem) return;

    const trimmedMsg = adminMessage.trim();
    if (!trimmedMsg) {
      toast.warning(
        modalActionType === "approve"
          ? "Please provide an approval message to the employee."
          : modalActionType === "reject"
          ? "Please provide a reason or feedback message for rejecting the suggestion."
          : "Please provide a feedback message."
      );
      return;
    }

    try {
      setSubmittingAction(true);

      const targetStatus =
        modalActionType === "approve"
          ? "approved"
          : modalActionType === "reject"
          ? "rejected"
          : activeModalItem.status;

      const response = await fetch(`/api/suggestions?id=${activeModalItem._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: targetStatus,
          message: trimmedMsg,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update suggestion");
      }

      toast.success(
        modalActionType === "approve"
          ? "Suggestion approved and message sent to employee."
          : modalActionType === "reject"
          ? "Suggestion rejected and feedback message sent."
          : "Admin message updated successfully."
      );

      // Update in local state
      setSuggestions((prev) =>
        prev.map((s) => (s._id === activeModalItem._id ? result.data : s))
      );

      closeActionModal();
    } catch (error) {
      console.error("Action submit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process request"
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  // --------------------------------------------------
  // FILTERED LIST & STATS
  // --------------------------------------------------
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

        let userMatch = false;
        if (typeof item.user_id === "object" && item.user_id !== null) {
          const name = item.user_id.full_name?.toLowerCase() || "";
          const email = item.user_id.email?.toLowerCase() || "";
          const desig = item.user_id.designation?.toLowerCase() || "";
          userMatch = name.includes(query) || email.includes(query) || desig.includes(query);
        }

        return textMatch || feedbackMatch || userMatch;
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

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  const getUserData = (item: Suggestion) => {
    if (typeof item.user_id === "object" && item.user_id !== null) {
      return {
        name: item.user_id.full_name || "Employee",
        email: item.user_id.email || "",
        designation: item.user_id.designation || "Team Member",
        avatar:
          item.user_id.profile?.profile_picture ||
          item.user_id.profile_picture ||
          null,
      };
    }
    return {
      name: "Employee",
      email: "",
      designation: "Team Member",
      avatar: null,
    };
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "EM";
  };

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
                Employee Suggestions
              </h1>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  margin: "3px 0 0 0",
                }}
              >
                Review employee ideas, write feedback messages, and approve or reject suggestions.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchSuggestions(true)}
          disabled={loading || refreshing}
          className="btn btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "8px 14px",
            borderRadius: "9px",
            fontWeight: 500,
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
              background: "rgba(59, 130, 246, 0.1)",
              color: "#2563eb",
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
            placeholder="Search by employee, idea or note..."
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
            Loading employee suggestions...
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
            No suggestions found
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
              ? `No suggestions matching "${searchQuery}"`
              : statusFilter !== "all"
              ? `There are currently no ${statusFilter} suggestions.`
              : "When employees submit ideas or feedback, they will appear here."}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="btn btn-secondary"
              style={{ marginTop: "14px", fontSize: "0.8rem" }}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredSuggestions.map((item) => {
            const user = getUserData(item);
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
                {/* CARD HEADER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* User Profile */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          objectFit: "cover",
                          border: "1px solid var(--border-color)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(79, 70, 229, 0.2)",
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                    )}

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "0.96rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {user.name}
                        </span>
                        {user.designation && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "var(--bg-tertiary)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {user.designation}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          marginTop: "3px",
                          fontSize: "0.76rem",
                          color: "var(--text-muted)",
                          flexWrap: "wrap",
                        }}
                      >
                        {user.email && <span>{user.email}</span>}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={12} />
                          Submitted {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {isApproved ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 12px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "rgba(34, 197, 94, 0.12)",
                          color: "#16a34a",
                          border: "1px solid rgba(34, 197, 94, 0.25)",
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Approved
                      </span>
                    ) : isRejected ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 12px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#dc2626",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                        }}
                      >
                        <XCircle size={13} />
                        Rejected
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 12px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "rgba(245, 158, 11, 0.12)",
                          color: "#d97706",
                          border: "1px solid rgba(245, 158, 11, 0.25)",
                        }}
                      >
                        <Clock size={13} />
                        Pending Review
                      </span>
                    )}

                    {isPending ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Approve Button */}
                        <button
                          onClick={() => openActionModal(item, "approve")}
                          className="btn"
                          style={{
                            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                            color: "#ffffff",
                            padding: "7px 14px",
                            borderRadius: "9px",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
                            border: "none",
                          }}
                        >
                          <Check size={14} />
                          Approve
                        </button>

                        {/* Reject Button */}
                        <button
                          onClick={() => openActionModal(item, "reject")}
                          className="btn"
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#dc2626",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            padding: "7px 14px",
                            borderRadius: "9px",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openActionModal(item, "edit")}
                        className="btn btn-secondary"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "0.76rem",
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                        title="Update admin message"
                      >
                        <Edit2 size={12} />
                        Edit Message
                      </button>
                    )}
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

                {/* ADMIN RESPONSE BOX */}
                {(isApproved || isRejected) && item.message && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "14px 16px",
                      borderRadius: "10px",
                      background: isApproved
                        ? "rgba(34, 197, 94, 0.05)"
                        : "rgba(239, 68, 68, 0.05)",
                      border: isApproved
                        ? "1px solid rgba(34, 197, 94, 0.2)"
                        : "1px solid rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: isApproved ? "#15803d" : "#b91c1c",
                        }}
                      >
                        <MessageSquare size={13} />
                        <span>
                          {isApproved
                            ? "Admin Approval Message:"
                            : "Admin Rejection Reason & Feedback:"}
                        </span>
                      </div>
                      {item.approved_at && (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {isApproved ? "Approved" : "Reviewed"} on {formatDate(item.approved_at)}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.message}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ACTION MODAL (APPROVE / REJECT / EDIT MESSAGE) */}
      {activeModalItem && (
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
            if (e.target === e.currentTarget) closeActionModal();
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "540px",
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
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background:
                      modalActionType === "approve"
                        ? "rgba(34, 197, 94, 0.12)"
                        : modalActionType === "reject"
                        ? "rgba(239, 68, 68, 0.12)"
                        : "rgba(59, 130, 246, 0.12)",
                    color:
                      modalActionType === "approve"
                        ? "#16a34a"
                        : modalActionType === "reject"
                        ? "#dc2626"
                        : "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {modalActionType === "approve" ? (
                    <CheckCircle2 size={20} />
                  ) : modalActionType === "reject" ? (
                    <XCircle size={20} />
                  ) : (
                    <Edit2 size={20} />
                  )}
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
                    {modalActionType === "approve"
                      ? "Approve Suggestion"
                      : modalActionType === "reject"
                      ? "Reject Suggestion"
                      : "Edit Feedback Message"}
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    {modalActionType === "approve"
                      ? "Provide an appreciation and feedback message to approve"
                      : modalActionType === "reject"
                      ? "Explain the reason or constructive feedback to reject"
                      : "Update your response to the employee"}
                  </p>
                </div>
              </div>

              <button
                onClick={closeActionModal}
                disabled={submittingAction}
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

            {/* Original Suggestion Snippet */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--bg-tertiary)",
                marginBottom: "18px",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <User size={11} />
                <span>Submitted by {getUserData(activeModalItem).name}:</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.84rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.45,
                  maxHeight: "90px",
                  overflowY: "auto",
                }}
              >
                "{activeModalItem.suggestion}"
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleActionSubmit}>
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
                  {modalActionType === "approve"
                    ? "Approval Feedback Message"
                    : modalActionType === "reject"
                    ? "Rejection Reason / Message"
                    : "Feedback Message"}{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder={
                    modalActionType === "approve"
                      ? "e.g., Great suggestion! We will prioritize this in the upcoming workflow update..."
                      : modalActionType === "reject"
                      ? "e.g., Thank you for the idea. Unfortunately, this does not align with our current infrastructure because..."
                      : "Write your feedback message..."
                  }
                  rows={4}
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
                <p
                  style={{
                    marginTop: "6px",
                    fontSize: "0.74rem",
                    color: "var(--text-muted)",
                  }}
                >
                  💡 This message will be sent directly to {getUserData(activeModalItem).name} and displayed on their suggestions page.
                </p>
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
                  onClick={closeActionModal}
                  disabled={submittingAction}
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
                  disabled={submittingAction || !adminMessage.trim()}
                  className="btn"
                  style={{
                    background:
                      modalActionType === "approve"
                        ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
                        : modalActionType === "reject"
                        ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                        : "var(--accent-primary)",
                    color: "#ffffff",
                    padding: "8px 18px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    border: "none",
                    opacity: submittingAction || !adminMessage.trim() ? 0.6 : 1,
                    cursor: submittingAction || !adminMessage.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {submittingAction ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : modalActionType === "approve" ? (
                    <>
                      <Check size={14} />
                      <span>Approve & Send Message</span>
                    </>
                  ) : modalActionType === "reject" ? (
                    <>
                      <X size={14} />
                      <span>Reject & Send Reason</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Update Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
