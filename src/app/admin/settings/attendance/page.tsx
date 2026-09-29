"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Globe,
  Monitor,
  Fingerprint,
  ShieldCheck,
  X,
} from "lucide-react";

import PageShimmer from "@/components/PageShimmer";
import type { SettingsData } from "@/types/SettingsData";
import { CustomTimePicker } from "@/components/TaskFormControls";
import SettingsNavTabs from "@/components/SettingsNavTabs";
import "../style.css";

type ToggleField =
  | "punchInGeoRequired"
  | "punchInIpRequired"
  | "punchInBrowserRequired"
  | "punchInSystemIdRequired"
  | "punchOutGeoRequired"
  | "punchOutIpRequired"
  | "punchOutBrowserRequired"
  | "punchOutSystemIdRequired";

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

export default function AttendanceSettingsPage() {
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

        setSettings(result.data);
      } catch (err: any) {
        console.error("LOAD SETTINGS ERROR:", err);
        setError(err.message || "Something went wrong while loading settings.");
        showToast(err.message || "Failed to load settings", "error");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  const handleTimeChange = (field: "punchInStartTime" | "punchInEndTime" | "punchOutStartTime" | "punchOutEndTime", value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggle = (field: ToggleField) => {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save settings");
      }

      setSettings(result.data);
      setSuccessMsg("Attendance settings updated successfully.");
      showToast("Attendance settings updated successfully", "success");
    } catch (err: any) {
      console.error("SAVE SETTINGS ERROR:", err);
      setError(err.message || "Something went wrong while saving settings.");
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const SettingSwitch = ({
    field,
    title,
    description,
    icon,
  }: {
    field: ToggleField;
    title: string;
    description: string;
    icon: React.ReactNode;
  }) => {
    const active = Boolean(settings[field]);

    return (
      <div className="settings-switch-row">
        <div className="settings-switch-info">
          <div className="settings-switch-icon">{icon}</div>
          <div>
            <div className="settings-switch-title">{title}</div>
            <div className="settings-switch-description">{description}</div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={active}
          className={`settings-switch ${active ? "active" : ""}`}
          onClick={() => handleToggle(field)}
          disabled={saving}
        >
          <span className="settings-switch-thumb" />
        </button>
      </div>
    );
  };

  if (loading) {
    return <PageShimmer />;
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "16px 20px" }}>
      {toastMessage && (
        <div className={`settings-toast ${toastType === "success" ? "settings-toast-success" : "settings-toast-error"}`}>
          <div className="settings-toast-icon">
            {toastType === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          </div>
          <div className="settings-toast-message">{toastMessage}</div>
          <button type="button" className="settings-toast-close" onClick={() => setToastMessage("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* <SettingsNavTabs /> */}

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* PUNCH IN TIMING WINDOW */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 className="card-title" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} style={{ color: "var(--accent-primary)" }} />
            Punch In Timing Window
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
            <CustomTimePicker
              label="Start Time"
              value={settings.punchInStartTime || ""}
              onChange={(value) => handleTimeChange("punchInStartTime", value)}
              align="right"
            />
            <CustomTimePicker
              label="End Time"
              value={settings.punchInEndTime || ""}
              onChange={(value) => handleTimeChange("punchInEndTime", value)}
              align="right"
            />
          </div>
        </div>

        {/* PUNCH IN REQUIREMENTS */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 className="card-title" style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} style={{ color: "var(--accent-primary)" }} />
            Punch In Requirements
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "16px" }}>
            Choose what information employees must provide when punching in.
          </p>

          <div className="settings-switch-list">
            <SettingSwitch
              field="punchInGeoRequired"
              title="Location Required"
              description="Employee must provide their location when punching in."
              icon={<MapPin size={18} />}
            />
            <SettingSwitch
              field="punchInIpRequired"
              title="IP Address Required"
              description="Employee's IP address must be recorded."
              icon={<Globe size={18} />}
            />
            <SettingSwitch
              field="punchInBrowserRequired"
              title="Browser Required"
              description="Employee's browser information must be recorded."
              icon={<Monitor size={18} />}
            />
            <SettingSwitch
              field="punchInSystemIdRequired"
              title="System ID Required"
              description="Employee's device/system identifier must be provided."
              icon={<Fingerprint size={18} />}
            />
          </div>
        </div>

        {/* PUNCH OUT TIMING WINDOW */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 className="card-title" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} style={{ color: "var(--accent-primary)" }} />
            Punch Out Timing Window
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
            <CustomTimePicker
              label="Start Time"
              value={settings.punchOutStartTime || ""}
              onChange={(value) => handleTimeChange("punchOutStartTime", value)}
              align="right"
            />
            <CustomTimePicker
              label="End Time"
              value={settings.punchOutEndTime || ""}
              onChange={(value) => handleTimeChange("punchOutEndTime", value)}
              align="right"
            />
          </div>
        </div>

        {/* PUNCH OUT REQUIREMENTS */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 className="card-title" style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} style={{ color: "var(--accent-primary)" }} />
            Punch Out Requirements
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "16px" }}>
            Choose what information employees must provide when punching out.
          </p>

          <div className="settings-switch-list">
            <SettingSwitch
              field="punchOutGeoRequired"
              title="Location Required"
              description="Employee must provide their location when punching out."
              icon={<MapPin size={18} />}
            />
            <SettingSwitch
              field="punchOutIpRequired"
              title="IP Address Required"
              description="Employee's IP address must be recorded."
              icon={<Globe size={18} />}
            />
            <SettingSwitch
              field="punchOutBrowserRequired"
              title="Browser Required"
              description="Employee's browser information must be recorded."
              icon={<Monitor size={18} />}
            />
            <SettingSwitch
              field="punchOutSystemIdRequired"
              title="System ID Required"
              description="Employee's device/system identifier must be provided."
              icon={<Fingerprint size={18} />}
            />
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ gap: "8px", padding: "10px 24px" }}
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
                <span>Save Attendance Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
