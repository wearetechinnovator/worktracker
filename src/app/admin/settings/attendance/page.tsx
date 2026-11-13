"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/static-components */

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
  Calendar,
} from "lucide-react";

import PageShimmer from "@/components/PageShimmer";
import CustomSelect from "@/components/CustomSelect";
import type { SettingsData } from "@/types/SettingsData";
import { CustomTimePicker } from "@/components/TaskFormControls";
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
  weeklyOffDays: [0],
  saturdayOffRule: "none",
};

const DAYS_OF_WEEK = [
  { index: 0, short: "Sun", label: "Sunday" },
  { index: 1, short: "Mon", label: "Monday" },
  { index: 2, short: "Tue", label: "Tuesday" },
  { index: 3, short: "Wed", label: "Wednesday" },
  { index: 4, short: "Thu", label: "Thursday" },
  { index: 5, short: "Fri", label: "Friday" },
  { index: 6, short: "Sat", label: "Saturday" },
];

const SATURDAY_OFF_OPTIONS = [
  {
    id: "every" as const,
    num: "1",
    title: "Every Saturday Off",
    desc: "All Saturdays of the month are weekly off",
  },
  {
    id: "2nd_4th" as const,
    num: "2",
    title: "2nd & 4th Saturday Off",
    desc: "Only 2nd and 4th Saturdays of each month are weekly off",
  },
  {
    id: "alternate" as const,
    num: "3",
    title: "Alternative Saturday Off",
    desc: "Alternate Saturdays (1st, 3rd, 5th) of the month are weekly off",
  },
];

export default function AttendanceSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

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

  const handleToggleWeeklyOff = (dayIdx: number) => {
    if (dayIdx === 6) {
      const isDeselectingSaturday = selectedDayIndex === 6;
      setSelectedDayIndex(isDeselectingSaturday ? null : 6);
      setSettings((prev) => ({
        ...prev,
        saturdayOffRule: isDeselectingSaturday
          ? "none"
          : prev.saturdayOffRule && prev.saturdayOffRule !== "none"
            ? prev.saturdayOffRule
            : "2nd_4th",
      }));
      return;
    }

    setSelectedDayIndex(dayIdx);

    setSettings((prev) => {
      const current = Array.isArray(prev.weeklyOffDays) ? prev.weeklyOffDays : [0];
      const exists = current.includes(dayIdx);
      const updated = exists
        ? current.filter((d) => d !== dayIdx)
        : [...current, dayIdx].sort((a, b) => a - b);
      return {
        ...prev,
        weeklyOffDays: updated,
      };
    });
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
          <h3 className="card-title" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px",paddingTop:"5px" }}>
            <Clock size={18} style={{ color: "var(--accent-primary)" }} />
            Punch In Timing Duration
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px",paddingBottom:"10px" }}>
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
          <h3 className="card-title" style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px",paddingTop:"5px" }}>
            <ShieldCheck size={18} style={{ color: "var(--accent-primary)" }} />
            Punch In Requirements
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "16px" }}>
            Choose what information to record when available. These settings never block an employee from punching in.
          </p>

          <div className="settings-switch-list">
            <SettingSwitch
              field="punchInGeoRequired"
              title="Capture Location"
              description="Record the employee's location when available."
              icon={<MapPin size={18} />}
            />
            <SettingSwitch
              field="punchInIpRequired"
              title="Capture IP Address"
              description="Record the employee's IP address when available."
              icon={<Globe size={18} />}
            />
            <SettingSwitch
              field="punchInBrowserRequired"
              title="Capture Browser"
              description="Record the employee's browser information when available."
              icon={<Monitor size={18} />}
            />
            <SettingSwitch
              field="punchInSystemIdRequired"
              title="Capture System ID"
              description="Record the employee's device/system identifier when available."
              icon={<Fingerprint size={18} />}
            />
          </div>
        </div>

        {/* PUNCH OUT TIMING WINDOW */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 className="card-title" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px",paddingTop:"5px" }}>
            <Clock size={18} style={{ color: "var(--accent-primary)" }} />
            Punch Out Timing Duration
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "16px" }}>
            Employees can punch out only within this configured time window. An approved exception can allow a punch out outside the window.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px",paddingBottom:"10px" }}>
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
          <h3 className="card-title" style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px",paddingTop:"5px" }}>
            <ShieldCheck size={18} style={{ color: "var(--accent-primary)" }} />
            Punch Out Requirements
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "16px" }}>
            Choose what information to record when available. These settings never block an employee from punching out.
          </p>

          <div className="settings-switch-list">
            <SettingSwitch
              field="punchOutGeoRequired"
              title="Capture Location"
              description="Record the employee's location when available."
              icon={<MapPin size={18} />}
            />
            <SettingSwitch
              field="punchOutIpRequired"
              title="Capture IP Address"
              description="Record the employee's IP address when available."
              icon={<Globe size={18} />}
            />
            <SettingSwitch
              field="punchOutBrowserRequired"
              title="Capture Browser"
              description="Record the employee's browser information when available."
              icon={<Monitor size={18} />}
            />
            <SettingSwitch
              field="punchOutSystemIdRequired"
              title="Capture System ID"
              description="Record the employee's device/system identifier when available."
              icon={<Fingerprint size={18} />}
            />
          </div>
        </div>

        {/* WEEKLY OFF CONFIGURATION */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 className="card-title" style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px", paddingTop: "5px" }}>
            <Calendar size={18} style={{ color: "var(--accent-primary)" }} />
            Weekly Off Days Configuration
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "16px" }}>
            Select the days of the week that are designated as weekly off for employees (e.g. Sunday). Employees who do not punch in on these days will be marked as Weekly Off instead of Absent.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))", gap: "10px", marginBottom: "14px" }}>
            {DAYS_OF_WEEK.map((day) => {
              const isSat = day.index === 6;
              const isSatOff = Boolean(settings.saturdayOffRule && settings.saturdayOffRule !== "none");
              const active = isSat
                ? isSatOff
                : Array.isArray(settings.weeklyOffDays) && settings.weeklyOffDays.includes(day.index);

              let badgeText = active ? "Week Off" : "Working";
              if (isSat) {
                if (settings.saturdayOffRule === "every") badgeText = "Every Sat";
                else if (settings.saturdayOffRule === "2nd_4th") badgeText = "2nd & 4th";
                else if (settings.saturdayOffRule === "alternate") badgeText = "Alternate";
                else badgeText = "Working";
              }

              return (
                <button
                  key={day.index}
                  type="button"
                  onClick={() => handleToggleWeeklyOff(day.index)}
                  disabled={saving}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 8px",
                    borderRadius: "10px",
                    border: active ? "2px solid var(--accent-primary, #2563eb)" : "1px solid var(--border-color, #e2e8f0)",
                    background: active ? "var(--accent-light, #eff6ff)" : "var(--bg-secondary, #f8fafc)",
                    color: active ? "var(--accent-primary, #2563eb)" : "var(--text-primary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: active ? "0 2px 6px rgba(37, 99, 235, 0.12)" : "none",
                  }}
                >
                  <span style={{ fontSize: "0.92rem", fontWeight: 800 }}>{day.short}</span>
                  <span style={{ fontSize: "0.7rem", marginTop: "2px", opacity: 0.85 }}>{day.label}</span>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      marginTop: "6px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: active ? "#2563eb" : "#e2e8f0",
                      color: active ? "#ffffff" : "#64748b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {badgeText}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Saturday Specific 3 Options (1: Every Sat Off, 2: 2nd & 4th Sat Off, 3: Alternative Sat Off) */}
          {selectedDayIndex === 6 && (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: "var(--bg-secondary, #f8fafc)",
                border: "1px solid var(--border-color, #e2e8f0)",
              }}
            >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Saturday Weekly Off Policy
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  Choose how Saturdays are treated for employee attendance
                </div>
              </div>

              {/* {settings.saturdayOffRule && settings.saturdayOffRule !== "none" && (
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, saturdayOffRule: "none" }))}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  Make All Saturdays Working
                </button>
              )} */}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <label
                htmlFor="saturday-off-rule"
                style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)" }}
              >
                Saturday off option
              </label>
              <CustomSelect
                options={SATURDAY_OFF_OPTIONS.map((option) => option.title)}
                value={
                  SATURDAY_OFF_OPTIONS.find(
                    (option) => option.id === settings.saturdayOffRule
                  )?.title
                }
                placeholder="Select a Saturday off option"
                disabled={saving}
                onSelect={(selectedTitle) => {
                  const selectedOption = SATURDAY_OFF_OPTIONS.find(
                    (option) => option.title === selectedTitle
                  );
                  setSettings((prev) => ({
                    ...prev,
                    saturdayOffRule: selectedOption?.id || "none",
                  }));
                }}
              />
            </div>
          </div>
          )}

          <div style={{ marginTop: "14px", fontSize: "0.78rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Currently configured:</span>
            <span>
              {(() => {
                const regularOffDays = Array.isArray(settings.weeklyOffDays)
                  ? settings.weeklyOffDays
                      .filter((d) => d !== 6)
                      .map((idx) => DAYS_OF_WEEK.find((d) => d.index === idx)?.label)
                      .filter(Boolean)
                  : ["Sunday"];

                let satLabel = "All Saturdays Working";
                if (settings.saturdayOffRule === "every") satLabel = "Every Saturday Off";
                else if (settings.saturdayOffRule === "2nd_4th") satLabel = "2nd & 4th Saturday Off";
                else if (settings.saturdayOffRule === "alternate") satLabel = "Alternative Saturday Off (1st, 3rd, 5th)";

                const summaryParts = [...regularOffDays];
                if (settings.saturdayOffRule && settings.saturdayOffRule !== "none") {
                  summaryParts.push(satLabel);
                } else if (summaryParts.length === 0) {
                  summaryParts.push("No weekly off (all 7 days are working)");
                }
                return summaryParts.join(" + ");
              })()}
            </span>
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
