"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity, Clock, Filter, Loader2, RefreshCw, Search, UserRound, X
} from "lucide-react";

type Log = {
    _id: string;
    task_id?: { _id?: string; title?: string } | string | null;
    user_id?: { _id?: string; full_name?: string } | string | null;
    status: string;
    action: string;
    timestamp: string;
};

const actions = ["All", "Created", "Started", "Paused", "Resumed", "Completed", "Updated"];
const statuses = ["All", "To Do", "In Progress", "Partially Done", "Completed"];

export default function LogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("All");
    const [status, setStatus] = useState("All");
    const [isAdmin, setIsAdmin] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const load = useCallback(async () => {
        try {
            setRefreshing(true);
            const me = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
            const meData = await me.json();
            if (meData.success) setIsAdmin(Number(meData.user?.user_role) === 1);

            const p = new URLSearchParams({ limit: "500" });
            if (action !== "All") p.set("action", action);
            if (status !== "All") p.set("status", status);

            const res = await fetch(`/api/task-logs?${p.toString()}`, {
                credentials: "include",
                cache: "no-store",
            });

            const contentType = res.headers.get("content-type") || "";
            const raw = await res.text();

            if (!contentType.includes("application/json")) {
                console.error("Task Logs API returned non-JSON:", raw);

                throw new Error(
                    `Task Logs API returned ${res.status} ${res.statusText}`
                );
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
    }, [action, status]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return logs;
        return logs.filter(l => {
            const task = typeof l.task_id === "string" ? l.task_id : l.task_id?.title || "";
            const user = typeof l.user_id === "string" ? l.user_id : l.user_id?.full_name || "";
            return [task, user, l.action, l.status].some(x => x.toLowerCase().includes(q));
        });
    }, [logs, search]);

    const clear = () => { setSearch(""); setAction("All"); setStatus("All") };

    return (
        <div style={{ padding: 24, minHeight: "100%", background: "var(--bg-primary)" }}>
            <div style={{ maxWidth: 1500, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        <h1 style={{ margin: "0 0 5px", fontSize: "1.45rem", fontWeight: 750, display: "flex", alignItems: "center", gap: 9 }}>
                            <Activity size={23} /> Activity Logs
                        </h1>
                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: ".84rem" }}>
                            "Your task activity and work history."
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={load} disabled={refreshing} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                <div className="card" style={{ padding: 12, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: "1 1 300px" }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input className="form-control" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search task, employee, action..." style={{ paddingLeft: 38, height: 40 }} />
                    </div>
                    <button className="btn btn-secondary" onClick={() => setShowFilters(v => !v)} style={{ height: 40, display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <Filter size={15} /> Filters
                    </button>
                    {(search || action !== "All" || status !== "All") &&
                        <button className="btn" onClick={clear} style={{ height: 40, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <X size={14} /> Clear
                        </button>}
                </div>

                {showFilters && <div className="card" style={{ padding: 14, marginBottom: 14, display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <label style={{ fontSize: ".72rem", fontWeight: 700 }}>
                        ACTION
                        <select className="form-control" value={action} onChange={e => setAction(e.target.value)} style={{ marginTop: 6, minWidth: 190 }}>
                            {actions.map(x => <option key={x}>{x}</option>)}
                        </select>
                    </label>
                    <label style={{ fontSize: ".72rem", fontWeight: 700 }}>
                        STATUS
                        <select className="form-control" value={status} onChange={e => setStatus(e.target.value)} style={{ marginTop: 6, minWidth: 190 }}>
                            {statuses.map(x => <option key={x}>{x}</option>)}
                        </select>
                    </label>
                </div>}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 14 }}>
                    {[
                        ["TOTAL", filtered.length],
                        ["STARTED", filtered.filter(x => x.action === "Started" || x.action === "Resumed").length],
                        ["PAUSED", filtered.filter(x => x.action === "Paused").length],
                        ["COMPLETED", filtered.filter(x => x.action === "Completed").length]
                    ].map(([label, count]) => <div className="card" key={String(label)} style={{ padding: 15 }}>
                        <div style={{ fontSize: ".7rem", color: "var(--text-muted)", marginBottom: 5 }}>{label}</div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>{count}</div>
                    </div>)}
                </div>

                <div className="card" style={{ overflow: "hidden" }}>
                    {loading ? <div style={{ height: 300, display: "grid", placeItems: "center" }}><Loader2 className="animate-spin" /></div> :
                        filtered.length === 0 ? <div style={{ height: 300, display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
                            <div style={{ textAlign: "center" }}><Activity size={30} /><div style={{ fontWeight: 700, marginTop: 8 }}>No activity found</div></div>
                        </div> :
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                                    <thead><tr style={{ background: "var(--bg-secondary)" }}>
                                        {["TIME", "TASK", ...(isAdmin ? ["EMPLOYEE"] : []), "ACTION", "STATUS"].map(x =>
                                            <th key={x} style={{ padding: "11px 14px", textAlign: "left", fontSize: ".68rem", color: "var(--text-muted)" }}>{x}</th>)}
                                    </tr></thead>
                                    <tbody>{filtered.map(log => {
                                        const task = typeof log.task_id === "string" ? log.task_id : log.task_id?.title || "Unknown Task";
                                        const user = typeof log.user_id === "string" ? "Unknown User" : log.user_id?.full_name || "Unknown User";
                                        const d = new Date(log.timestamp);
                                        return <tr key={log._id} style={{ borderTop: "1px solid var(--border-color)" }}>
                                            <td style={td}><b>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b>
                                                <div style={{ fontSize: ".68rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{d.toLocaleTimeString("en-IN")}</div></td>
                                            <td style={td}><b>{task}</b><div style={{ fontSize: ".68rem", color: "var(--text-muted)" }}>Task activity</div></td>
                                            {isAdmin && <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><UserRound size={14} />{user}</span></td>}
                                            <td style={td}>{log.action}</td>
                                            <td style={td}>{log.status}</td>
                                        </tr>
                                    })}</tbody>
                                </table>
                            </div>}
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
