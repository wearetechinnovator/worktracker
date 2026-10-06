"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Hash,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Sparkles,
} from "lucide-react";

import PageShimmer from "@/components/PageShimmer";
import type { SettingsData } from "@/types/SettingsData";
// import SettingsNavTabs from "@/components/SettingsNavTabs";
import "../style.css";

const defaultSettings: SettingsData = {
  punchInStartTime: "",
  punchInEndTime: "",
  punchInGeoRequired: false,
  punchInIpRequired: false,
  punchInBrowserRequired: false,
  punchInSystemIdRequired: false,
  punchOutStartTime: "",
  punchOutEndTime: "",
  punchOutGeoRequired: false,
  punchOutIpRequired: false,
  punchOutBrowserRequired: false,
  punchOutSystemIdRequired: false,
  taskIdPrefix: "QT",
  nextTaskNumber: 1,
};

export default function TaskSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage("");
    }, 2500);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/settings", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          router.replace("/admin/dashboard");
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load settings");
        }

        if (result.data) {
          setSettings((prev) => ({
            ...prev,
            taskIdPrefix: result.data.taskIdPrefix || "QT",
            nextTaskNumber: Number(result.data.nextTaskNumber || 1),
          }));
        }
      } catch (err: any) {
        console.error("Task Settings load error:", err);
        const message = err?.message || "Error loading settings";
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const prefix = (settings.taskIdPrefix || "QT").trim().toUpperCase();
      const num = Math.max(1, Number(settings.nextTaskNumber) || 1);

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          taskIdPrefix: prefix,
          nextTaskNumber: num,
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        showToast(result.message || "Only admins can manage settings", "error");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update task settings");
      }

      if (result.data) {
        setSettings((prev) => ({
          ...prev,
          taskIdPrefix: result.data.taskIdPrefix || prefix,
          nextTaskNumber: Number(result.data.nextTaskNumber || num),
        }));
      }

      showToast(result.message || "Task settings updated successfully", "success");
      setSuccessMsg("Task settings updated successfully!");
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      console.error("Task Settings save error:", err);
      const message = err?.message || "Error saving task settings";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageShimmer variant="settings" />;
  }

  const previewId = `${settings.taskIdPrefix || "QT"}-${settings.nextTaskNumber || 1}`;

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        paddingBottom: "40px",
      }}
    >


      {/* TOAST */}
      {toastMessage && (
        <div
          className={`settings-toast ${toastType === "success" ? "settings-toast-success" : "settings-toast-error"
            }`}
        >
          <div className="settings-toast-icon">
            {toastType === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <span className="settings-toast-message">{toastMessage}</span>
          <button
            type="button"
            className="settings-toast-close"
            onClick={() => setToastMessage("")}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ALERTS */}
      {error && (
        <div
          className="alert alert-error"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="alert alert-success"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3
            className="card-title"
            style={{
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* <Hash size={20} style={{ color: "var(--accent-primary)" }} /> */}
            Task ID
          </h3>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              margin: "0 0 20px",
            }}
          >
            Configure the prefix and starting sequence number for newly created tasks in your organization.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            <div>
              <label className="form-label" htmlFor="task-id-prefix" style={{ fontWeight: 600 }}>
                Task ID Prefix
              </label>
              <input
                id="task-id-prefix"
                className="form-control"
                value={settings.taskIdPrefix || ""}
                maxLength={12}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    taskIdPrefix: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="QT"
                required
              />
              {/* <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Typically 2-5 uppercase letters representing your project or team
              </span> */}
            </div>

            <div>
              <label className="form-label" htmlFor="next-task-number" style={{ fontWeight: 600 }}>
                Next Task Number
              </label>
              <input
                id="next-task-number"
                className="form-control"
                type="number"
                min={1}
                step={1}
                value={settings.nextTaskNumber}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    nextTaskNumber: Number(e.target.value),
                  }))
                }
                required
              />
              {/* <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                The numerical increment assigned to the next created task
              </span> */}
            </div>
          </div>

          
        </div>
        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/admin/dashboard")}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ gap: "8px" }}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
