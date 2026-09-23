"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity, Filter, Loader2, RefreshCw, Search, UserRound, X
} from "lucide-react";

type Log = {
    _id: string;
    task_id?: { _id?: string; title?: string; task_id?: string } | string | null;
    user_id?: { _id?: string; full_name?: string; name?: string; email?: string } | string | null;
    status: string;
    action: string;
    timestamp: string;
};

type TaskOption = {
    _id: string;
    task_id?: string;
    title: string;
};

type EmployeeOption = {
    _id: string;
    full_name?: string;
    name?: string;
    email?: string;
};

const actions = ["All", "Created", "Started", "Paused", "Resumed", "Completed", "Updated"];
const statuses = ["All", "To Do", "In Progress", "Paused", "Partially Done", "Completed"];

export default function LogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [tasks, setTasks] = useState<TaskOption[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("All");
    const [status, setStatus] = useState("All");
    const [selectedTaskId, setSelectedTaskId] = useState("All");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("All");
    const [isAdmin, setIsAdmin] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Fetch initial task & employee options for filters
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const [tasksRes, empRes] = await Promise.all([
                    fetch("/api/tasks?task_status=all", { credentials: "include", cache: "no-store" }),
                    fetch("/api/users/employees", { credentials: "include", cache: "no-store" }),
                ]);
                const tasksData = await tasksRes.json();
                const empData = await empRes.json();

                if (tasksData.success && Array.isArray(tasksData.data)) {
                    setTasks(tasksData.data);
                }
                if (empData.success && Array.isArray(empData.data)) {
                    setEmployees(empData.data);
                }
            } catch (err) {
                console.error("Failed to load filter options:", err);
            }
        };

        fetchFilterOptions();
    }, []);

    const load = useCallback(async () => {
        try {
            setRefreshing(true);
            const me = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
            const meData = await me.json();
            if (meData.success) setIsAdmin(Number(meData.user?.user_role) === 1);

            const p = new URLSearchParams({ limit: "500" });
            if (action !== "All") p.set("action", action);
            if (status !== "All") p.set("status", status);
            if (selectedTaskId !== "All") p.set("taskId", selectedTaskId);
            if (selectedEmployeeId !== "All") p.set("employeeId", selectedEmployeeId);

            const res = await fetch(`/api/task-logs?${p.toString()}`, {
                credentials: "include",
                cache: "no-store",
            });

            const contentType = res.headers.get("content-type") || "";
            const raw = await res.text();

            if (!contentType.includes("application/json")) {
                console.error("Task Logs API returned non-JSON:", raw);
                throw new Error(`Task Logs API returned ${res.status} ${res.statusText}`);
            }

            const data = JSON.parse(raw);

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load logs");
            }

            setLogs(Array.isArray(data.data) ? data.data : []);
        } catch (e) {
            console.error(e);
            setLogs([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [action, status, selectedTaskId, selectedEmployeeId]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return logs;
        return logs.filter(l => {
            const taskObj = typeof l.task_id === "object" && l.task_id ? l.task_id : null;
            const taskTitle = taskObj?.title || (typeof l.task_id === "string" ? l.task_id : "");
            const taskIdStr = taskObj?.task_id || "";
            const userObj = typeof l.user_id === "object" && l.user_id ? l.user_id : null;
            const userName = userObj?.full_name || userObj?.name || (typeof l.user_id === "string" ? l.user_id : "");
            const userEmail = userObj?.email || "";
            return [taskTitle, taskIdStr, userName, userEmail, l.action, l.status].some(x => x.toLowerCase().includes(q));
        });
    }, [logs, search]);

    const clear = () => {
        setSearch("");
        setAction("All");
        setStatus("All");
        setSelectedTaskId("All");
        setSelectedEmployeeId("All");
    };

    const hasActiveFilters = Boolean(
        search || action !== "All" || status !== "All" || selectedTaskId !== "All" || selectedEmployeeId !== "All"
    );

    const getActionBadgeStyles = (actionName: string) => {
        switch (actionName) {
            case "Started":
                return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
            case "Paused":
                return { background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
            case "Resumed":
                return { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" };
            case "Completed":
                return { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" };
            case "Created":
                return { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" };
            default:
                return { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
        }
    };

    const getStatusBadgeStyles = (statusName: string) => {
        switch (statusName) {
            case "Completed":
                return { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" };
            case "In Progress":
                return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
            case "Paused":
                return { background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
            case "Partially Done":
            case "Partially Completed":
                return { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" };
            case "Review":
                return { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" };
            case "To Do":
            default:
                return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
        }
    };

    return (
        <div style={{ padding: 24, minHeight: "100%", background: "var(--bg-primary)" }}>
            <div style={{ maxWidth: 1500, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        <h1 style={{ margin: "0 0 5px", fontSize: "1.45rem", fontWeight: 750, display: "flex", alignItems: "center", gap: 9 }}>
                            <Activity size={23} /> Activity Logs
                        </h1>
                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".84rem" }}>
                            {isAdmin ? "Track live task activities, starts, pauses, and completions across your team." : "Your task activity and work history."}
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={load} disabled={refreshing} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                <div className="card" style={{ padding: 12, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: "1 1 300px" }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                            className="form-control"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by Task ID (e.g. QT-2), title, employee, action..."
                            style={{ paddingLeft: 38, height: 40 }}
                        />
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowFilters(v => !v)}
                        style={{
                            height: 40,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            background: showFilters ? "var(--bg-secondary)" : undefined,
                            borderColor: showFilters ? "var(--accent-primary)" : undefined
                        }}
                    >
                        <Filter size={15} /> Filters {hasActiveFilters && "(Active)"}
                    </button>
                    {hasActiveFilters && (
                        <button className="btn" onClick={clear} style={{ height: 40, display: "inline-flex", alignItems: "center", gap: 5, color: "#ef4444" }}>
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>

                {showFilters && (
                    <div className="card" style={{ padding: 16, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                        <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 5 }}>
                            TASK
                            <select
                                className="form-control"
                                value={selectedTaskId}
                                onChange={e => setSelectedTaskId(e.target.value)}
                                style={{ height: 38 }}
                            >
                                <option value="All">All Tasks</option>
                                {tasks.map(t => (
                                    <option key={t._id} value={t._id}>
                                        {t.task_id ? `[${t.task_id}] ${t.title}` : t.title}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {isAdmin && (
                            <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 5 }}>
                                EMPLOYEE
                                <select
                                    className="form-control"
                                    value={selectedEmployeeId}
                                    onChange={e => setSelectedEmployeeId(e.target.value)}
                                    style={{ height: 38 }}
                                >
                                    <option value="All">All Employees</option>
                                    {employees.map(e => (
                                        <option key={e._id} value={e._id}>
                                            {e.full_name || e.name || e.email}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 5 }}>
                            ACTION
                            <select
                                className="form-control"
                                value={action}
                                onChange={e => setAction(e.target.value)}
                                style={{ height: 38 }}
                            >
                                {actions.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </label>

                        <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 5 }}>
                            STATUS
                            <select
                                className="form-control"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                style={{ height: 38 }}
                            >
                                {statuses.map(x => <option key={x} value={x}>{x}</option>)}
                            </select>
                        </label>
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 14 }}>
                    {[
                        ["TOTAL", filtered.length],
                        ["STARTED", filtered.filter(x => x.action === "Started" || x.action === "Resumed").length],
                        ["PAUSED", filtered.filter(x => x.action === "Paused").length],
                        ["COMPLETED", filtered.filter(x => x.action === "Completed").length]
                    ].map(([label, count]) => (
                        <div className="card" key={String(label)} style={{ padding: 15 }}>
                            <div style={{ fontSize: ".7rem", color: "var(--text-muted)", marginBottom: 5 }}>{label}</div>
                            <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>{count}</div>
                        </div>
                    ))}
                </div>

                <div className="card" style={{ overflow: "hidden" }}>
                    {loading ? (
                        <div style={{ height: 300, display: "grid", placeItems: "center" }}><Loader2 className="animate-spin" /></div>
                    ) : filtered.length === 0 ? (
                        <div style={{ height: 300, display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
                            <div style={{ textAlign: "center" }}>
                                <Activity size={30} />
                                <div style={{ fontWeight: 700, marginTop: 8 }}>No activity found</div>
                                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                                    {hasActiveFilters ? "Try clearing or changing your filters" : "Activities will appear here when employees work on tasks"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                                <thead>
                                    <tr style={{ background: "var(--bg-secondary)" }}>
                                        {["TIME", "TASK ID", "TASK TITLE", ...(isAdmin ? ["EMPLOYEE"] : []), "ACTION", "STATUS"].map(x => (
                                            <th key={x} style={{ padding: "11px 14px", textAlign: "left", fontSize: ".68rem", color: "var(--text-muted)", letterSpacing: "0.5px" }}>{x}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(log => {
                                        const taskObj = typeof log.task_id === "object" && log.task_id ? log.task_id : null;
                                        const taskId = taskObj?.task_id || "—";
                                        const taskTitle = taskObj?.title || (typeof log.task_id === "string" ? log.task_id : "Unknown Task");
                                        const userObj = typeof log.user_id === "object" && log.user_id ? log.user_id : null;
                                        const userName = userObj?.full_name || userObj?.name || (typeof log.user_id === "string" ? "Unknown User" : "Unknown User");
                                        const userEmail = userObj?.email || "";
                                        const d = new Date(log.timestamp);

                                        return (
                                            <tr key={log._id} style={{ borderTop: "1px solid var(--border-color)" }}>
                                                <td style={td}>
                                                    <b>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b>
                                                    <div style={{ fontSize: ".68rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{d.toLocaleTimeString("en-IN")}</div>
                                                </td>
                                                <td style={td}>
                                                    <span style={{
                                                        fontSize: "0.74rem",
                                                        fontWeight: 750,
                                                        color: "var(--accent-primary)",
                                                        background: "var(--bg-secondary)",
                                                        padding: "2px 7px",
                                                        borderRadius: "4px",
                                                        border: "1px solid var(--border-color)",
                                                        display: "inline-block",
                                                        fontFamily: "monospace"
                                                    }}>
                                                        {taskId}
                                                    </span>
                                                </td>
                                                <td style={td}>
                                                    <b style={{ color: "var(--text-primary)" }}>{taskTitle}</b>
                                                    <div style={{ fontSize: ".68rem", color: "var(--text-muted)", marginTop: 2 }}>Task activity</div>
                                                </td>
                                                {isAdmin && (
                                                    <td style={td}>
                                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 650 }}>
                                                                <UserRound size={13} style={{ color: "var(--accent-primary)" }} />
                                                                {userName}
                                                            </span>
                                                            {userEmail && <span style={{ fontSize: ".68rem", color: "var(--text-muted)" }}>{userEmail}</span>}
                                                        </div>
                                                    </td>
                                                )}
                                                <td style={td}>
                                                    <span style={{
                                                        ...getActionBadgeStyles(log.action),
                                                        padding: "2px 8px",
                                                        borderRadius: "4px",
                                                        fontWeight: 700,
                                                        fontSize: "0.72rem",
                                                        display: "inline-block"
                                                    }}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td style={td}>
                                                    <span style={{
                                                        ...getStatusBadgeStyles(log.status),
                                                        padding: "2px 8px",
                                                        borderRadius: "4px",
                                                        fontWeight: 700,
                                                        fontSize: "0.72rem",
                                                        display: "inline-block"
                                                    }}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const td: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: ".78rem",
    color: "var(--text-primary)",
    verticalAlign: "middle"
};
