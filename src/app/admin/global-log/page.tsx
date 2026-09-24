"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Calendar,
  Eye,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
   ========================================================= */

type GlobalLog = {
  _id: string;

  actor_id?: {
    _id: string;
    full_name?: string;
    email?: string;
  } | null;

  action: string;

  entity_type: string;

  entity_id?: {
    _id: string;
    name?: string;
    title?: string;
    full_name?: string;
  } | null;

  target_user_id?: {
    _id: string;
    full_name?: string;
    email?: string;
  } | null;

  description: string;

  information?: string | null;

  status: boolean;

  created_at: string;
};

type DirectoryUser = {
  _id: string;
  full_name?: string;
  name?: string;
  email?: string;
};

type DirectoryItem = {
  _id: string;
  name?: string;
  title?: string;
};

/* =========================================================
   CONSTANTS
   ========================================================= */

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ADD",
  "REMOVE",
  "ASSIGN",
  "UNASSIGN",
  "APPROVE",
  "REJECT",
  "REVIEW",
  "PUNCH_IN",
  "PUNCH_OUT",
  "LOGIN",
  "LOGOUT",
  "REQUEST",
  "START",
  "PAUSE",
  "RESUME",
  "COMPLETE",
];

const ENTITY_TYPES = [
  "User",
  "Task",
  "Project",
  "Client",
  "Role",
  "Designation",
  "Attendance",
  "AttendanceRequest",
  "TaskWork",
  "Settings",
];

/* =========================================================
   HELPERS
   ========================================================= */

function getInitials(name?: string) {
  if (!name) return "?";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

/* =========================================================
   AVATAR COLORS
   ========================================================= */

const AVATAR_PALETTE = [
  {
    bg: "#EEF2FF",
    fg: "#4F46E5",
  },
  {
    bg: "#ECFDF5",
    fg: "#059669",
  },
  {
    bg: "#FFF7ED",
    fg: "#EA580C",
  },
  {
    bg: "#FDF2F8",
    fg: "#DB2777",
  },
  {
    bg: "#F0F9FF",
    fg: "#0284C7",
  },
  {
    bg: "#FEFCE8",
    fg: "#CA8A04",
  },
  {
    bg: "#F5F3FF",
    fg: "#7C3AED",
  },
];

function getAvatarStyle(seed: string) {
  const str = seed || "?";

  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash =
      str.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  return AVATAR_PALETTE[
    Math.abs(hash) %
    AVATAR_PALETTE.length
  ];
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function GlobalLogsPage() {
  const [logs, setLogs] = useState<
    GlobalLog[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [activeSearch, setActiveSearch] =
    useState("");

  const [action, setAction] =
    useState("");

  const [entityType, setEntityType] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  /* =======================================================
     10 RECORDS PER PAGE
  ======================================================= */

  const limit = 10;

  /* =======================================================
     DETAILS MODAL
  ======================================================= */

  const [selectedLog, setSelectedLog] =
    useState<GlobalLog | null>(null);

  /*
   * Employee directory is used only to convert stored
   * ObjectIds inside Additional Details into readable names.
   */
  const [userDirectory, setUserDirectory] =
    useState<Record<string, DirectoryUser>>({});

  const [nameDirectory, setNameDirectory] =
    useState<Record<string, DirectoryItem>>({});

  /* =======================================================
     LOAD NAME DIRECTORY
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadNameDirectory() {
      try {
        const [
          employeesResponse,
          projectsResponse,
          clientsResponse,
        ] = await Promise.all([
          fetch("/api/users/employees", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/projects", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/clients", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const [
          employeesData,
          projectsData,
          clientsData,
        ] = await Promise.all([
          employeesResponse.json(),
          projectsResponse.json(),
          clientsResponse.json(),
        ]);

        if (cancelled) return;

        const users: Record<string, DirectoryUser> = {};
        const names: Record<string, DirectoryItem> = {};

        if (employeesResponse.ok && employeesData?.success) {
          const employees = Array.isArray(
            employeesData?.data
          )
            ? employeesData.data
            : [];

          employees.forEach((employee: DirectoryUser) => {
            if (!employee?._id) return;

            const id = String(employee._id);
            users[id] = employee;
            names[id] = {
              _id: id,
              name:
                employee.full_name ||
                employee.name ||
                employee.email ||
                "User",
            };
          });
        }

        if (projectsResponse.ok && projectsData?.success) {
          const projects = Array.isArray(
            projectsData?.data
          )
            ? projectsData.data
            : [];

          projects.forEach((project: any) => {
            const id = String(
              project?._id ??
              project?.id ??
              ""
            );

            if (!id) return;

            names[id] = {
              _id: id,
              name:
                project?.name ||
                project?.project_name ||
                project?.title ||
                "Project",
            };
          });
        }

        if (clientsResponse.ok && clientsData?.success) {
          const clients = Array.isArray(
            clientsData?.data
          )
            ? clientsData.data
            : [];

          clients.forEach((client: any) => {
            const id = String(
              client?._id ??
              client?.id ??
              ""
            );

            if (!id) return;

            names[id] = {
              _id: id,
              name: client?.name || "Client",
            };
          });
        }

        setUserDirectory(users);
        setNameDirectory(names);
      } catch (error) {
        console.error(
          "LOAD NAME DIRECTORY ERROR:",
          error
        );
      }
    }

    loadNameDirectory();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     FETCH LOGS
  ======================================================= */

  const fetchLogs =
    useCallback(async () => {
      try {
        setLoading(true);

        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(page)
        );

        params.set(
          "limit",
          String(limit)
        );

        if (action) {
          params.set(
            "action",
            action
          );
        }

        if (entityType) {
          params.set(
            "entity_type",
            entityType
          );
        }

        if (
          activeSearch.trim()
        ) {
          params.set(
            "search",
            activeSearch.trim()
          );
        }

        const response =
          await fetch(
            `/api/global-logs?${params.toString()}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        console.log(
          "GLOBAL LOG API RESPONSE:",
          data
        );

        if (!response.ok) {
          throw new Error(
            data?.error ||
            data?.message ||
            "Failed to fetch logs"
          );
        }

        /*
         * Support:
         *
         * {
         *   logs: []
         * }
         *
         * OR
         *
         * {
         *   data: []
         * }
         *
         * OR
         *
         * {
         *   data: {
         *     logs: []
         *   }
         * }
         */

        const receivedLogs =
          Array.isArray(
            data?.logs
          )
            ? data.logs
            : Array.isArray(
              data?.data
            )
              ? data.data
              : Array.isArray(
                data?.data?.logs
              )
                ? data.data.logs
                : [];

        setLogs(
          receivedLogs
        );

        setTotal(
          Number(
            data?.total ??
            data?.data?.total ??
            receivedLogs.length
          )
        );

        setTotalPages(
          Number(
            data?.totalPages ??
            data?.data?.totalPages ??
            1
          )
        );
      } catch (error) {
        console.error(
          "FETCH GLOBAL LOGS ERROR:",
          error
        );

        setLogs([]);

        setTotal(0);

        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }, [
      page,
      action,
      entityType,
      activeSearch,
    ]);

  /* =======================================================
     SEARCH DEBOUNCE
  ======================================================= */

  useEffect(() => {
    const timer =
      setTimeout(() => {
        setActiveSearch(
          search
        );

        setPage(1);
      }, 350);

    return () =>
      clearTimeout(timer);
  }, [search]);

  /* =======================================================
     LOAD LOGS
  ======================================================= */

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearAllFilters() {
    setSearch("");

    setActiveSearch("");

    setAction("");

    setEntityType("");

    setPage(1);
  }

  /* =======================================================
     ACTIVE FILTERS
  ======================================================= */

  const hasActiveFilters =
    Boolean(
      search ||
      action ||
      entityType
    );

  /* =======================================================
     SUMMARY STATS
  ======================================================= */

  const stats = useMemo(() => {
    const uniqueActors =
      new Set(
        logs
          .map(
            (log) =>
              log.actor_id
                ?.full_name ||
              log.actor_id
                ?.email
          )
          .filter(Boolean)
      ).size;

    const actionCounts: Record<
      string,
      number
    > = {};

    logs.forEach((log) => {
      actionCounts[log.action] =
        (actionCounts[
          log.action
        ] || 0) + 1;
    });

    let topAction =
      "None";

    let maxCount = 0;

    Object.entries(
      actionCounts
    ).forEach(
      ([act, count]) => {
        if (
          count >
          maxCount
        ) {
          maxCount =
            count;

          topAction = act;
        }
      }
    );

    return {
      total,

      uniqueActors,

      topAction:
        maxCount > 0
          ? topAction
          : "—",
    };
  }, [logs, total]);

  /* =======================================================
     DATE FORMAT
  ======================================================= */

  function formatDate(
    date: string
  ) {
    try {
      return new Date(
        date
      ).toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }
      );
    } catch {
      return date;
    }
  }

  /* =======================================================
     ENTITY NAME
  ======================================================= */

  function getEntityDetails(
    log: GlobalLog
  ) {
    if (!log.entity_id) {
      return null;
    }

    if (
      typeof log.entity_id ===
      "object"
    ) {
      const name =
        log.entity_id.name ||
        log.entity_id.title ||
        log.entity_id.full_name;

      return name &&
        name.trim()
        ? name
        : null;
    }

    return null;
  }

  /* =======================================================
     PARSE INFORMATION JSON
  ======================================================= */

  function parseInformation(
    information?: string | null
  ): Record<
    string,
    any
  > | null {
    if (!information) {
      return null;
    }

    try {
      const parsed =
        JSON.parse(
          information
        );

      if (
        parsed &&
        typeof parsed ===
        "object"
      ) {
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }

  /* =======================================================
     FORMAT DETAIL VALUE
  ======================================================= */

  function getFriendlyNameById(id: string) {
    const normalizedId = String(id);

    const user = userDirectory[normalizedId];

    if (user) {
      return (
        user.full_name ||
        user.name ||
        user.email ||
        "User"
      );
    }

    const namedItem = nameDirectory[normalizedId];

    if (namedItem) {
      return (
        namedItem.name ||
        namedItem.title ||
        "—"
      );
    }

    if (selectedLog?.actor_id?._id === normalizedId) {
      return (
        selectedLog.actor_id.full_name ||
        selectedLog.actor_id.email ||
        "User"
      );
    }

    if (selectedLog?.target_user_id?._id === normalizedId) {
      return (
        selectedLog.target_user_id.full_name ||
        selectedLog.target_user_id.email ||
        "User"
      );
    }

    if (selectedLog?.entity_id?._id === normalizedId) {
      return (
        selectedLog.entity_id.name ||
        selectedLog.entity_id.title ||
        selectedLog.entity_id.full_name ||
        selectedLog.entity_type
      );
    }

    // Never expose raw Mongo/Object IDs in the UI.
    return "—";
  }

  function formatDetailValue(
    value: any,
    key = ""
  ): string {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "—";
      }

      const values = value
        .map((item) =>
          formatDetailValue(item, key)
        )
        .filter((item) => item !== "—");

      return values.length
        ? values.join(", ")
        : "—";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "object") {
      // User/object reference
      if (
        value.full_name ||
        value.name ||
        value.title ||
        value.email
      ) {
        return (
          value.full_name ||
          value.name ||
          value.title ||
          value.email
        );
      }

      // Mongo-style object containing only an _id
      if (value._id) {
        return getFriendlyNameById(
          String(value._id)
        );
      }

      const formattedObject: Record<string, string> = {};

      Object.entries(value).forEach(
        ([childKey, childValue]) => {
          const friendlyValue =
            formatDetailValue(
              childValue,
              childKey
            );

          if (friendlyValue !== "—") {
            formattedObject[childKey] =
              friendlyValue;
          }
        }
      );

      if (Object.keys(formattedObject).length === 0) {
        return "—";
      }

      return Object.entries(formattedObject)
        .map(
          ([childKey, childValue]) =>
            `${childKey
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) =>
                char.toUpperCase()
              )}: ${childValue}`
        )
        .join("\n");
    }

    const stringValue = String(value).trim();

    // Hide MongoDB ObjectIds and replace them with names.
    const looksLikeObjectId =
      /^[a-fA-F0-9]{24}$/.test(
        stringValue
      );

    if (looksLikeObjectId) {
      return getFriendlyNameById(
        stringValue
      );
    }

    // ID-like fields should never display their raw value.
    if (/_id$/i.test(key)) {
      return getFriendlyNameById(
        stringValue
      );
    }

    // Make common date/time fields readable.
    if (
      /(?:date|time|at)$/i.test(key) &&
      !Number.isNaN(
        Date.parse(stringValue)
      )
    ) {
      return formatDate(stringValue);
    }

    return stringValue;
  }

  /* =======================================================
     ACTION BADGE
  ======================================================= */

  function getActionBadgeStyles(
    actionName: string
  ) {
    switch (
    actionName
    ) {
      case "CREATE":
      case "ADD":
        return {
          background:
            "#ecfdf5",
          color:
            "#059669",
          border:
            "1px solid #a7f3d0",
        };

      case "UPDATE":
        return {
          background:
            "#eff6ff",
          color:
            "#2563eb",
          border:
            "1px solid #bfdbfe",
        };

      case "DELETE":
      case "REMOVE":
        return {
          background:
            "#fef2f2",
          color:
            "#dc2626",
          border:
            "1px solid #fecaca",
        };

      case "ASSIGN":
      case "UNASSIGN":
        return {
          background:
            "#f5f3ff",
          color:
            "#7c3aed",
          border:
            "1px solid #ddd6fe",
        };

      case "APPROVE":
        return {
          background:
            "#ecfdf5",
          color:
            "#047857",
          border:
            "1px solid #a7f3d0",
        };

      case "REJECT":
        return {
          background:
            "#fff7ed",
          color:
            "#c2410c",
          border:
            "1px solid #fed7aa",
        };

      case "REVIEW":
        return {
          background:
            "#f5f3ff",
          color:
            "#6d28d9",
          border:
            "1px solid #ddd6fe",
        };

      case "PUNCH_IN":
      case "PUNCH_OUT":
        return {
          background:
            "#eef2ff",
          color:
            "#4338ca",
          border:
            "1px solid #c7d2fe",
        };

      default:
        return {
          background:
            "#f8fafc",
          color:
            "#475569",
          border:
            "1px solid #e2e8f0",
        };
    }
  }

  /* =======================================================
     DETAILS MODAL
  ======================================================= */

  function renderDetailsModal() {
    if (!selectedLog) {
      return null;
    }

    const information =
      parseInformation(
        selectedLog.information
      );

    return (
      <div
        onClick={() =>
          setSelectedLog(null)
        }
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background:
            "rgba(15, 23, 42, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          onClick={(event) =>
            event.stopPropagation()
          }
          style={{
            width: "100%",
            maxWidth: "760px",
            maxHeight: "85vh",
            overflowY: "auto",
            background:
              "var(--bg-primary, #ffffff)",
            borderRadius: "12px",
            border:
              "1px solid var(--border-color, #e5e7eb)",
            boxShadow:
              "0 25px 60px rgba(0,0,0,0.18)",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom:
                "1px solid var(--border-color)",
              position: "sticky",
              top: 0,
              background:
                "var(--bg-primary, #ffffff)",
              zIndex: 2,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 750,
                  color:
                    "var(--text-primary)",
                }}
              >
                Additional Details
              </div>

              <div
                style={{
                  fontSize: "0.75rem",
                  color:
                    "var(--text-muted)",
                  marginTop: "3px",
                }}
              >
                Detailed information about this activity
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedLog(null)
              }
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                border:
                  "1px solid var(--border-color)",
                background:
                  "var(--bg-secondary)",
                color:
                  "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={17} />
            </button>
          </div>

          {/* ONLY ADDITIONAL DETAILS */}
          <div
            style={{
              padding: "20px",
            }}
          >
            {information &&
            Object.keys(information).length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {Object.entries(
                  information
                ).map(([key, value]) => {
                  const formattedValue =
                    formatDetailValue(
                      value,
                      key
                    );

                  if (formattedValue === "—") {
                    return null;
                  }

                  return (
                    <div
                      key={key}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "180px minmax(0, 1fr)",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "7px",
                        background:
                          "var(--bg-secondary)",
                        border:
                          "1px solid var(--border-color)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 650,
                          color:
                            "var(--text-primary)",
                          wordBreak: "break-word",
                        }}
                      >
                        {key
                          .replace(/_/g, " ")
                          .replace(
                            /\b\w/g,
                            (char) =>
                              char.toUpperCase()
                          )}
                      </div>

                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: "inherit",
                          fontSize: "0.75rem",
                          lineHeight: 1.5,
                          color:
                            "var(--text-secondary)",
                        }}
                      >
                        {formattedValue}
                      </pre>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "30px 15px",
                  textAlign: "center",
                  fontSize: "0.8rem",
                  color:
                    "var(--text-muted)",
                  border:
                    "1px dashed var(--border-color)",
                  borderRadius: "8px",
                }}
              >
                No additional details available.
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div
            style={{
              padding: "12px 20px",
              borderTop:
                "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setSelectedLog(null)
              }
              className="btn btn-secondary"
              style={{
                fontSize: "0.8rem",
                padding: "7px 14px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <>
      <div
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          paddingBottom:
            "24px",
        }}
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            marginBottom:
              "16px",
            flexWrap:
              "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize:
                  "1.35rem",
                fontWeight: 750,
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "8px",
                color:
                  "var(--text-primary)",
              }}
            >
              <Activity
                size={22}
                style={{
                  color:
                    "var(--accent-primary)",
                }}
              />

              Global Logs
            </h1>

            <p
              style={{
                margin:
                  "4px 0 0",
                fontSize:
                  "0.82rem",
                color:
                  "var(--text-secondary)",
              }}
            >
              Track all activities
              performed in the
              application.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() =>
              fetchLogs()
            }
            disabled={loading}
            type="button"
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap: "6px",
              height: "36px",
              padding:
                "0 12px",
              fontSize:
                "0.8rem",
            }}
          >
            <RefreshCw
              size={14}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {/* ===================================================
            SUMMARY CARDS
        =================================================== */}


        {/* ===================================================
            FILTER BAR
        =================================================== */}

        <div
          className="card"
          style={{
            padding:
              "10px 14px",
            marginBottom:
              "14px",
            display:
              "flex",
            alignItems:
              "center",
            gap: "10px",
            flexWrap:
              "wrap",
          }}
        >
          {/* SEARCH */}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "8px",
              border:
                "1px solid var(--border-color)",
              borderRadius:
                "var(--border-radius-sm)",
              background:
                "var(--bg-secondary)",
              padding:
                "0 10px",
              height: "38px",
              flex:
                "1 1 280px",
            }}
          >
            <Search
              size={15}
              style={{
                color:
                  "var(--text-muted)",
                flexShrink: 0,
              }}
            />

            <input
              type="text"
              placeholder="Search activity description, user, action..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              style={{
                border: "none",
                outline: "none",
                background:
                  "transparent",
                width:
                  "100%",
                fontSize:
                  "0.82rem",
                color:
                  "var(--text-primary)",
                padding: 0,
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch(
                    ""
                  );

                  setActiveSearch(
                    ""
                  );

                  setPage(1);
                }}
                style={{
                  border:
                    "none",
                  background:
                    "transparent",
                  cursor:
                    "pointer",
                  padding: "2px",
                  color:
                    "var(--text-muted)",
                  display:
                    "flex",
                  alignItems:
                    "center",
                }}
                title="Clear search"
              >
                <X
                  size={14}
                />
              </button>
            )}
          </div>

          {/* ACTION */}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "6px",
              border:
                "1px solid var(--border-color)",
              borderRadius:
                "var(--border-radius-sm)",
              background:
                "var(--bg-secondary)",
              padding:
                "0 10px",
              height: "38px",
            }}
          >
            <select
              value={action}
              onChange={(e) => {
                setAction(
                  e.target.value
                );

                setPage(1);
              }}
              style={{
                border: "none",
                outline:
                  "none",
                background:
                  "transparent",
                fontSize:
                  "0.82rem",
                color:
                  "var(--text-primary)",
                cursor:
                  "pointer",
              }}
            >
              <option value="">
                All Actions
              </option>

              {ACTIONS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          {/* ENTITY */}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "6px",
              border:
                "1px solid var(--border-color)",
              borderRadius:
                "var(--border-radius-sm)",
              background:
                "var(--bg-secondary)",
              padding:
                "0 10px",
              height: "38px",
            }}
          >
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(
                  e.target.value
                );

                setPage(1);
              }}
              style={{
                border: "none",
                outline:
                  "none",
                background:
                  "transparent",
                fontSize:
                  "0.82rem",
                color:
                  "var(--text-primary)",
                cursor:
                  "pointer",
              }}
            >
              <option value="">
                All Entities
              </option>

              {ENTITY_TYPES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          {/* CLEAR */}

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={
                clearAllFilters
              }
              style={{
                height:
                  "38px",
                color:
                  "#ef4444",
                borderColor:
                  "#fca5a5",
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: "5px",
                fontSize:
                  "0.8rem",
              }}
            >
              <X size={14} />

              Clear
            </button>
          )}
        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        <div
          className="card"
          style={{
            padding: 0,
            overflow:
              "hidden",
            borderRadius:
              "8px",
            border:
              "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              overflowX:
                "auto",
            }}
          >
            <table
              style={{
                width:
                  "100%",
                borderCollapse:
                  "collapse",
                minWidth:
                  "1000px",
                fontSize:
                  "0.82rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "var(--bg-secondary)",
                    borderBottom:
                      "1px solid var(--border-color)",
                  }}
                >
                  <th
                    style={{
                      padding:
                        "11px 14px",
                      textAlign:
                        "left",
                      fontSize:
                        "0.7rem",
                      fontWeight: 700,
                      color:
                        "var(--text-muted)",
                      letterSpacing:
                        "0.5px",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Date & Time
                  </th>

                  <th
                    style={{
                      padding:
                        "11px 14px",
                      textAlign:
                        "left",
                      fontSize:
                        "0.7rem",
                      fontWeight: 700,
                      color:
                        "var(--text-muted)",
                      letterSpacing:
                        "0.5px",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    User
                  </th>

                  <th
                    style={{
                      padding:
                        "11px 14px",
                      textAlign:
                        "left",
                      fontSize:
                        "0.7rem",
                      fontWeight: 700,
                      color:
                        "var(--text-muted)",
                      letterSpacing:
                        "0.5px",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Activity
                  </th>

                  <th
                    style={{
                      padding:
                        "11px 14px",
                      textAlign:
                        "left",
                      fontSize:
                        "0.7rem",
                      fontWeight: 700,
                      color:
                        "var(--text-muted)",
                      letterSpacing:
                        "0.5px",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Entity
                  </th>

                  <th
                    style={{
                      padding:
                        "11px 14px",
                      textAlign:
                        "left",
                      fontSize:
                        "0.7rem",
                      fontWeight: 700,
                      color:
                        "var(--text-muted)",
                      letterSpacing:
                        "0.5px",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Target
                  </th>

                  <th
                    style={{
                      padding:
                        "11px 14px",
                      textAlign:
                        "left",
                      fontSize:
                        "0.7rem",
                      fontWeight: 700,
                      color:
                        "var(--text-muted)",
                      letterSpacing:
                        "0.5px",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Description
                  </th>

                  <th
                    style={{
                      padding:
                        "11px 14px",
                      textAlign:
                        "center",
                      fontSize:
                        "0.7rem",
                      fontWeight: 700,
                      color:
                        "var(--text-muted)",
                      letterSpacing:
                        "0.5px",
                      textTransform:
                        "uppercase",
                      width:
                        "60px",
                    }}
                  >
                    View
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* =================================================
                    LOADING
                ================================================= */}

                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding:
                          "48px 16px",
                        textAlign:
                          "center",
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                          gap: "8px",
                        }}
                      >
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />

                        <span>
                          Loading
                          logs...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length ===
                  0 ? (
                  /* ===============================================
                     EMPTY
                  =============================================== */

                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding:
                          "48px 16px",
                        textAlign:
                          "center",
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      <Activity
                        size={28}
                        style={{
                          margin:
                            "0 auto 8px",
                          opacity:
                            0.5,
                        }}
                      />

                      <div
                        style={{
                          fontWeight:
                            600,
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        No activities
                        found
                      </div>

                      <div
                        style={{
                          fontSize:
                            "0.78rem",
                          marginTop:
                            "4px",
                        }}
                      >
                        Try adjusting
                        your filters
                        or search
                        keywords.
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* ===============================================
                     LOGS
                  =============================================== */

                  logs.map(
                    (log) => {
                      const actorName =
                        log.actor_id
                          ?.full_name ||
                        "Unknown User";

                      const actorAvatar =
                        getAvatarStyle(
                          log.actor_id
                            ?.email ||
                          actorName
                        );

                      const actionStyle =
                        getActionBadgeStyles(
                          log.action
                        );

                      const entitySubtitle =
                        getEntityDetails(
                          log
                        );

                      const targetName =
                        log
                          .target_user_id
                          ?.full_name;

                      const targetEmail =
                        log
                          .target_user_id
                          ?.email;

                      return (
                        <tr
                          key={
                            log._id
                          }
                          style={{
                            borderTop:
                              "1px solid var(--border-color)",
                            transition:
                              "background 0.15s ease",
                          }}
                          className="hover:bg-slate-50/60"
                        >
                          {/* DATE */}

                          <td
                            style={{
                              padding:
                                "10px 14px",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "6px",
                                color:
                                  "var(--text-secondary)",
                              }}
                            >
                              <Calendar
                                size={
                                  14
                                }
                                style={{
                                  color:
                                    "var(--text-muted)",
                                }}
                              />

                              <span>
                                {formatDate(
                                  log.created_at
                                )}
                              </span>
                            </div>
                          </td>

                          {/* ACTOR */}

                          <td
                            style={{
                              padding:
                                "10px 14px",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  width:
                                    "28px",
                                  height:
                                    "28px",
                                  borderRadius:
                                    "50%",
                                  backgroundColor:
                                    actorAvatar.bg,
                                  color:
                                    actorAvatar.fg,
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  justifyContent:
                                    "center",
                                  fontSize:
                                    "0.72rem",
                                  fontWeight:
                                    700,
                                  flexShrink:
                                    0,
                                }}
                              >
                                {getInitials(
                                  actorName
                                )}
                              </div>

                              <div>
                                <div
                                  style={{
                                    fontWeight:
                                      600,
                                    color:
                                      "var(--text-primary)",
                                    lineHeight:
                                      1.25,
                                  }}
                                >
                                  {
                                    actorName
                                  }
                                </div>

                                {log
                                  .actor_id
                                  ?.email && (
                                    <div
                                      style={{
                                        fontSize:
                                          "0.72rem",
                                        color:
                                          "var(--text-muted)",
                                      }}
                                    >
                                      {
                                        log
                                          .actor_id
                                          .email
                                      }
                                    </div>
                                  )}
                              </div>
                            </div>
                          </td>

                          {/* ACTION */}

                          <td
                            style={{
                              padding:
                                "10px 14px",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            <span
                              style={{
                                display:
                                  "inline-block",
                                padding:
                                  "2px 7px",
                                borderRadius:
                                  "4px",
                                fontSize:
                                  "0.72rem",
                                fontWeight:
                                  700,
                                letterSpacing:
                                  "0.3px",
                                ...actionStyle,
                              }}
                            >
                              {
                                log.action
                              }
                            </span>
                          </td>

                          {/* ENTITY */}

                          <td
                            style={{
                              padding:
                                "10px 14px",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display:
                                    "inline-flex",
                                  alignItems:
                                    "center",
                                  gap: "4px",
                                  fontWeight:
                                    600,
                                  color:
                                    "var(--text-primary)",
                                }}
                              >
                                <Layers
                                  size={
                                    12
                                  }
                                  style={{
                                    color:
                                      "var(--text-muted)",
                                  }}
                                />

                                <span>
                                  {
                                    log.entity_type
                                  }
                                </span>
                              </div>

                              {entitySubtitle && (
                                <div
                                  style={{
                                    fontSize:
                                      "0.72rem",
                                    color:
                                      "var(--text-muted)",
                                    marginTop:
                                      "1px",
                                  }}
                                >
                                  {
                                    entitySubtitle
                                  }
                                </div>
                              )}
                            </div>
                          </td>

                          {/* TARGET */}

                          <td
                            style={{
                              padding:
                                "10px 14px",
                            }}
                          >
                            {log.target_user_id ? (
                              <div>
                                <div
                                  style={{
                                    fontWeight:
                                      600,
                                    color:
                                      "var(--text-primary)",
                                    lineHeight:
                                      1.25,
                                  }}
                                >
                                  {
                                    targetName ||
                                    "User"
                                  }
                                </div>

                                {targetEmail && (
                                  <div
                                    style={{
                                      fontSize:
                                        "0.72rem",
                                      color:
                                        "var(--text-muted)",
                                    }}
                                  >
                                    {
                                      targetEmail
                                    }
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span
                                style={{
                                  color:
                                    "var(--text-muted)",
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>

                          {/* DESCRIPTION */}

                          <td
                            style={{
                              padding:
                                "10px 14px",
                              color:
                                "var(--text-secondary)",
                              lineHeight:
                                1.4,
                              maxWidth:
                                "350px",
                            }}
                          >
                            {
                              log.description
                            }
                          </td>

                          {/* EYE */}

                          <td
                            style={{
                              padding:
                                "10px 14px",
                              textAlign:
                                "center",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedLog(
                                  log
                                )
                              }
                              title="View details"
                              aria-label="View log details"
                              style={{
                                width:
                                  "32px",
                                height:
                                  "32px",
                                borderRadius:
                                  "7px",
                                border:
                                  "1px solid var(--border-color)",
                                background:
                                  "var(--bg-secondary)",
                                color:
                                  "var(--text-secondary)",
                                display:
                                  "inline-flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                cursor:
                                  "pointer",
                                transition:
                                  "all 0.15s ease",
                              }}
                              className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                            >
                              <Eye
                                size={
                                  16
                                }
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* ===================================================
              PAGINATION
          =================================================== */}

          {!loading &&
            logs.length > 0 && (
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  padding:
                    "12px 16px",
                  background:
                    "var(--bg-secondary)",
                  borderTop:
                    "1px solid var(--border-color)",
                  fontSize:
                    "0.8rem",
                  color:
                    "var(--text-secondary)",
                  flexWrap:
                    "wrap",
                  gap: "8px",
                }}
              >
                {/* COUNT */}

                <div>
                  Showing{" "}
                  <strong>
                    {Math.min(
                      (page -
                        1) *
                      limit +
                      1,
                      total
                    )}
                    -
                    {Math.min(
                      page *
                      limit,
                      total
                    )}
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {total}
                  </strong>{" "}
                  entries
                </div>

                {/* PAGINATION */}

                <div
                  style={{
                    display:
                      "flex",
                    gap: "6px",
                    alignItems:
                      "center",
                  }}
                >
                  {/* PREVIOUS */}

                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setPage(
                        (p) =>
                          Math.max(
                            1,
                            p - 1
                          )
                      )
                    }
                    disabled={
                      page <= 1
                    }
                    style={{
                      padding:
                        "4px 10px",
                      fontSize:
                        "0.75rem",
                      opacity:
                        page <=
                          1
                          ? 0.5
                          : 1,
                      cursor:
                        page <=
                          1
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    Previous
                  </button>

                  {/* PAGE NUMBERS */}

                  {Array.from({
                    length:
                      totalPages,
                  }).map(
                    (
                      _,
                      i
                    ) => {
                      const pageNum =
                        i + 1;

                      if (
                        pageNum ===
                        1 ||
                        pageNum ===
                        totalPages ||
                        Math.abs(
                          pageNum -
                          page
                        ) <= 1
                      ) {
                        return (
                          <button
                            key={
                              pageNum
                            }
                            className={
                              page ===
                                pageNum
                                ? "btn btn-primary"
                                : "btn btn-secondary"
                            }
                            onClick={() =>
                              setPage(
                                pageNum
                              )
                            }
                            style={{
                              padding:
                                "4px 10px",
                              fontSize:
                                "0.75rem",
                            }}
                          >
                            {
                              pageNum
                            }
                          </button>
                        );
                      }

                      if (
                        pageNum ===
                        2 ||
                        pageNum ===
                        totalPages -
                        1
                      ) {
                        return (
                          <span
                            key={
                              pageNum
                            }
                            style={{
                              color:
                                "var(--text-muted)",
                              alignSelf:
                                "center",
                              padding:
                                "0 4px",
                            }}
                          >
                            ...
                          </span>
                        );
                      }

                      return null;
                    }
                  )}

                  {/* NEXT */}

                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setPage(
                        (p) =>
                          Math.min(
                            totalPages,
                            p + 1
                          )
                      )
                    }
                    disabled={
                      page >=
                      totalPages
                    }
                    style={{
                      padding:
                        "4px 10px",
                      fontSize:
                        "0.75rem",
                      opacity:
                        page >=
                          totalPages
                          ? 0.5
                          : 1,
                      cursor:
                        page >=
                          totalPages
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {renderDetailsModal()}
    </>
  );
}