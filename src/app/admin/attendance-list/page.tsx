"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";

type RequestStatus = "Pending" | "Approved" | "Rejected";

interface AttendanceRequest {
  _id: string;
  request_type: "punchIn" | "punchOut";
  reason: string | null;
  status: RequestStatus;
  requested_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  used_at: string | null;
  reviewed_by?: {
    _id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  ip?: string | null;
  browser?: string | null;
  systemid?: string | null;
}

interface AttendanceRow {
  _id: string;
  employee: {
    _id: string;
    full_name: string;
    email: string | null;
    designation: string | null;
    profile_picture: string | null;
  } | null;
  attendance_date: string;
  punch_in_on: string | null;
  punch_out_on: string | null;
  punch_in_mode: string | null;
  punch_out_mode: string | null;
  punch_out_source: "manual" | "system" | null;
  punch_in_reason: string | null;
  punch_out_reason: string | null;
  punch_in_ip: string | null;
  punch_out_ip: string | null;
  punch_in_browser: string | null;
  punch_out_browser: string | null;
  punch_in_systemid: string | null;
  punch_out_systemid: string | null;
  requests: AttendanceRequest[];
  latest_request: AttendanceRequest | null;
  punch_in_request: {
    status: RequestStatus;
    reason: string | null;
    requested_at: string | null;
  } | null;
  punch_out_request: {
    status: RequestStatus;
    reason: string | null;
    requested_at: string | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ITEMS_PER_PAGE = 10;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  // attendance_date is stored as YYYY-MM-DD. Parse it manually instead of
  // passing a constructed date string to Safari's Date parser.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const monthIndex = Number(month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusBadge({ status }: { status: RequestStatus | null }) {
  if (!status) {
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "4px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          background: "var(--bg-secondary)",
          color: "var(--text-muted)",
        }}
      >
        No Request
      </span>
    );
  }

  const styles: Record<RequestStatus, React.CSSProperties> = {
    Pending: {
      background: "#fffbeb",
      color: "#b45309",
    },
    Approved: {
      background: "#ecfdf5",
      color: "#047857",
    },
    Rejected: {
      background: "#fef2f2",
      color: "#dc2626",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        ...styles[status],
      }}
    >
      {status}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string | null }) {
  if (!mode) return <span style={{ color: "var(--text-muted)" }}>—</span>;

  const isSystem = mode.toLowerCase().includes("system");
  const isForce = mode.toLowerCase().includes("force");

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        background: isSystem
          ? "#eff6ff"
          : isForce
            ? "#fff7ed"
            : "var(--bg-secondary)",
        color: isSystem
          ? "#2563eb"
          : isForce
            ? "#c2410c"
            : "var(--text-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      {mode}
    </span>
  );
}

export default function AttendanceListPage() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [requestStatus, setRequestStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRow, setSelectedRow] =
    useState<AttendanceRow | null>(null);

  const loadAttendance = useCallback(
    async (page = 1, showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        const params = new URLSearchParams({
          page: String(page),
          limit: String(ITEMS_PER_PAGE),
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (date) {
          params.set("date", date);
        }

        if (requestStatus) {
          params.set("requestStatus", requestStatus);
        }

        const response = await fetch(
          `/api/attendance-list?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(
            json.message || "Failed to load attendance list."
          );
        }

        setRows(Array.isArray(json.data) ? json.data : []);
        setPagination(
          json.pagination || {
            page,
            limit: ITEMS_PER_PAGE,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (error) {
        console.error("Attendance list error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load attendance list."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, date, requestStatus]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAttendance(1);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search, date, requestStatus, loadAttendance]);

  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages;
    const current = pagination.page;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const values = new Set<number>([
      1,
      total,
      current,
      current - 1,
      current + 1,
    ]);

    return Array.from(values)
      .filter((page) => page >= 1 && page <= total)
      .sort((a, b) => a - b);
  }, [pagination]);

  const goToPage = (page: number) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.page
    ) {
      return;
    }

    loadAttendance(page);
  };

  const clearFilters = () => {
    setSearch("");
    setDate("");
    setRequestStatus("");
  };

  const hasFilters =
    Boolean(search.trim()) || Boolean(date) || Boolean(requestStatus);

  return (
    <div style={{ width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.45rem",
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            Attendance List
          </h1>
          <p
            style={{
              margin: "5px 0 0",
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
            }}
          >
            View punch in/out activity and attendance request history of
            employees added by you.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => loadAttendance(pagination.page, true)}
          disabled={loading || refreshing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <RefreshCw
            size={15}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div className="card" style={{ padding: 15 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-muted)",
              fontSize: ".7rem",
            }}
          >
            <Users size={15} />
            RECORDS
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: "1.35rem",
              fontWeight: 800,
            }}
          >
            {pagination.total}
          </div>
        </div>

        <div className="card" style={{ padding: 15 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-muted)",
              fontSize: ".7rem",
            }}
          >
            <Clock3 size={15} />
            CURRENT PAGE
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: "1.35rem",
              fontWeight: 800,
            }}
          >
            {pagination.page} / {Math.max(pagination.totalPages, 1)}
          </div>
        </div>

        <div className="card" style={{ padding: 15 }}>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: ".7rem",
            }}
          >
            PENDING REQUESTS
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: "1.35rem",
              fontWeight: 800,
            }}
          >
            {rows.filter(
              (row) =>
                row.punch_in_request?.status === "Pending" ||
                row.punch_out_request?.status === "Pending"
            ).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(220px, 1.5fr) minmax(160px, .7fr) minmax(160px, .7fr) auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: 5,
              }}
            >
              SEARCH EMPLOYEE
            </label>
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                className="form-control"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or email..."
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: 5,
              }}
            >
              DATE
            </label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: 5,
              }}
            >
              REQUEST STATUS
            </label>
            <select
              className="form-control"
              value={requestStatus}
              onChange={(event) =>
                setRequestStatus(event.target.value)
              }
            >
              <option value="">All requests</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {hasFilters ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <X size={14} />
              Clear
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div
            style={{
              minHeight: 360,
              display: "grid",
              placeItems: "center",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Loader2
                size={28}
                className="animate-spin"
                style={{ margin: "0 auto 8px" }}
              />
              Loading attendance...
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              minHeight: 320,
              display: "grid",
              placeItems: "center",
              color: "var(--text-muted)",
              padding: 30,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <CalendarDays
                size={32}
                style={{ margin: "0 auto 8px" }}
              />
              <div
                style={{
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                No attendance records found
              </div>
              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: ".78rem",
                }}
              >
                {hasFilters
                  ? "Try clearing your filters."
                  : "Attendance records will appear here when employees punch in or submit attendance requests."}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 1450,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--bg-secondary)",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  {[
                    "EMPLOYEE",
                    "DATE",
                    "PUNCH IN",
                    "IN TYPE",
                    "PUNCH IN REASON",
                    "PUNCH OUT",
                    "OUT TYPE",
                    "PUNCH OUT REASON",
                    "REQUEST",
                    "ACTION",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "11px 13px",
                        textAlign: "left",
                        fontSize: ".66rem",
                        color: "var(--text-muted)",
                        letterSpacing: ".45px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row._id}
                    style={{
                      borderBottom:
                        "1px solid var(--border-color)",
                    }}
                  >
                    <td style={{ padding: "12px 13px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          minWidth: 170,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            overflow: "hidden",
                            display: "grid",
                            placeItems: "center",
                            background:
                              "var(--bg-secondary)",
                            color: "var(--text-secondary)",
                            fontWeight: 800,
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {row.employee?.profile_picture ? (
                            <img
                              src={row.employee.profile_picture}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            (
                              row.employee?.full_name || "E"
                            )
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>

                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "var(--text-primary)",
                              fontSize: ".8rem",
                            }}
                          >
                            {row.employee?.full_name ||
                              "Unknown Employee"}
                          </div>
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: ".68rem",
                              marginTop: 2,
                            }}
                          >
                            {row.employee?.designation ||
                              row.employee?.email ||
                              "Employee"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={cellStyle}>
                      {formatDate(row.attendance_date)}
                    </td>

                    <td style={cellStyle}>
                      <strong>
                        {formatTime(row.punch_in_on)}
                      </strong>
                    </td>

                    <td style={cellStyle}>
                      <ModeBadge mode={row.punch_in_mode} />
                    </td>

                    <td style={reasonCellStyle}>
                      {row.punch_in_reason || "—"}
                    </td>

                    <td style={cellStyle}>
                      <strong>
                        {formatTime(row.punch_out_on)}
                      </strong>
                      {row.punch_out_source === "system" && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 10,
                            color: "#2563eb",
                            fontWeight: 700,
                          }}
                        >
                          AUTO 11:59 PM
                        </div>
                      )}
                    </td>

                    <td style={cellStyle}>
                      <ModeBadge mode={row.punch_out_mode} />
                    </td>

                    <td style={reasonCellStyle}>
                      {row.punch_out_reason || "—"}
                    </td>

                    <td style={cellStyle}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                          minWidth: 125,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--text-muted)",
                            }}
                          >
                            IN
                          </span>
                          <StatusBadge
                            status={
                              row.punch_in_request?.status ||
                              null
                            }
                          />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--text-muted)",
                            }}
                          >
                            OUT
                          </span>
                          <StatusBadge
                            status={
                              row.punch_out_request?.status ||
                              null
                            }
                          />
                        </div>
                      </div>
                    </td>

                    <td style={cellStyle}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSelectedRow(row)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 9px",
                          fontSize: ".7rem",
                        }}
                      >
                        <FileText size={13} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginTop: 14,
            padding: "11px 14px",
            border: "1px solid var(--border-color)",
            borderRadius: 9,
            background: "var(--bg-secondary)",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: ".76rem",
              color: "var(--text-secondary)",
            }}
          >
            Showing{" "}
            <strong>
              {(pagination.page - 1) * pagination.limit + 1}
              {"–"}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total
              )}
            </strong>{" "}
            of <strong>{pagination.total}</strong> records
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
              style={{ padding: "6px 8px" }}
            >
              <ChevronLeft size={15} />
            </button>

            {pageNumbers.map((pageNumber, index) => {
              const previous = pageNumbers[index - 1];
              const needsGap =
                previous !== undefined &&
                pageNumber - previous > 1;

              return (
                <span key={pageNumber} style={{ display: "contents" }}>
                  {needsGap && (
                    <span
                      style={{
                        padding: "0 3px",
                        color: "var(--text-muted)",
                      }}
                    >
                      …
                    </span>
                  )}

                  <button
                    type="button"
                    className={
                      pageNumber === pagination.page
                        ? "btn btn-primary"
                        : "btn btn-secondary"
                    }
                    onClick={() => goToPage(pageNumber)}
                    style={{
                      minWidth: 31,
                      padding: "6px 8px",
                      fontSize: ".72rem",
                    }}
                  >
                    {pageNumber}
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              className="btn btn-secondary"
              disabled={
                pagination.page >= pagination.totalPages
              }
              onClick={() => goToPage(pagination.page + 1)}
              style={{ padding: "6px 8px" }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selectedRow && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedRow(null)}
          style={{ zIndex: 1500 }}
        >
          <div
            className="modal-container"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(850px, 94vw)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              className="modal-header"
              style={{
                borderBottom:
                  "1px solid var(--border-color)",
                paddingBottom: 13,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: 800,
                  }}
                >
                  Attendance Details
                </h2>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: ".75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {selectedRow.employee?.full_name ||
                    "Employee"}{" "}
                  · {selectedRow.attendance_date}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedRow(null)}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(230px, 1fr))",
                gap: 12,
                marginTop: 15,
              }}
            >
              <DetailCard
                title="Punch In"
                items={[
                  ["Time", formatDateTime(selectedRow.punch_in_on)],
                  ["Mode", selectedRow.punch_in_mode || "—"],
                  ["Reason", selectedRow.punch_in_reason || "—"],
                  ["IP", selectedRow.punch_in_ip || "—"],
                  ["Browser", selectedRow.punch_in_browser || "—"],
                  ["System ID", selectedRow.punch_in_systemid || "—"],
                ]}
              />

              <DetailCard
                title="Punch Out"
                items={[
                  ["Time", formatDateTime(selectedRow.punch_out_on)],
                  ["Mode", selectedRow.punch_out_mode || "—"],
                  [
                    "Source",
                    selectedRow.punch_out_source === "system"
                      ? "System / Automatic"
                      : "Manual",
                  ],
                  [
                    "Reason",
                    selectedRow.punch_out_reason || "—",
                  ],
                  ["IP", selectedRow.punch_out_ip || "—"],
                  ["Browser", selectedRow.punch_out_browser || "—"],
                  ["System ID", selectedRow.punch_out_systemid || "—"],
                ]}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: ".85rem",
                  marginBottom: 9,
                }}
              >
                Attendance Requests
              </div>

              {selectedRow.requests.length === 0 ? (
                <div
                  style={{
                    padding: 15,
                    borderRadius: 9,
                    background: "var(--bg-secondary)",
                    color: "var(--text-muted)",
                    fontSize: ".78rem",
                  }}
                >
                  No Punch In / Punch Out request was submitted for
                  this attendance date.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                  }}
                >
                  {selectedRow.requests.map((request) => (
                    <div
                      key={request._id}
                      style={{
                        padding: 12,
                        border: "1px solid var(--border-color)",
                        borderRadius: 9,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong>
                            {request.request_type === "punchIn"
                              ? "Punch In Request"
                              : "Punch Out Request"}
                          </strong>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: ".72rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Requested:{" "}
                            {formatDateTime(
                              request.requested_at
                            )}
                          </div>
                        </div>

                        <StatusBadge status={request.status} />
                      </div>

                      <div
                        style={{
                          marginTop: 9,
                          fontSize: ".76rem",
                          color: "var(--text-secondary)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        <strong>Reason:</strong>{" "}
                        {request.reason || "—"}
                      </div>

                      {request.reviewed_at && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: ".72rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Reviewed:{" "}
                          {formatDateTime(
                            request.reviewed_at
                          )}
                        </div>
                      )}

                      {request.reviewed_by && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: ".72rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Reviewed by: {request.reviewed_by.full_name || request.reviewed_by.email || "Admin"}
                        </div>
                      )}

                      {request.ip && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: ".72rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Request IP: {request.ip}
                        </div>
                      )}

                      {request.rejection_reason && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: 8,
                            borderRadius: 7,
                            background: "#fef2f2",
                            color: "#b91c1c",
                            fontSize: ".72rem",
                          }}
                        >
                          <strong>Rejection reason:</strong>{" "}
                          {request.rejection_reason}
                        </div>
                      )}

                      {request.used_at && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: ".72rem",
                            color: "#047857",
                          }}
                        >
                          Approval used at{" "}
                          {formatDateTime(request.used_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "11px 13px",
  fontSize: ".76rem",
  color: "var(--text-secondary)",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const reasonCellStyle: React.CSSProperties = {
  ...cellStyle,
  whiteSpace: "normal",
  minWidth: 180,
  maxWidth: 260,
  lineHeight: 1.4,
};

function DetailCard({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string]>;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: 10,
        padding: 13,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: ".8rem",
          marginBottom: 9,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}
      >
        {items.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr",
              gap: 8,
              fontSize: ".74rem",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>
              {label}
            </span>
            <span
              style={{
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
