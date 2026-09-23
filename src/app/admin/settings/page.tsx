"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
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

import "./style.css";

/* =========================================================
   TOGGLE FIELDS
========================================================= */

type ToggleField =
  | "punchInGeoRequired"
  | "punchInIpRequired"
  | "punchInBrowserRequired"
  | "punchInSystemIdRequired"
  | "punchOutGeoRequired"
  | "punchOutIpRequired"
  | "punchOutBrowserRequired"
  | "punchOutSystemIdRequired";

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

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

/* =========================================================
   COMPONENT
========================================================= */

export default function SettingsPage() {
  const router = useRouter();

  /* =======================================================
     STATE
  ======================================================= */

  const [settings, setSettings] =
    useState<SettingsData>(defaultSettings);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  /* =======================================================
     TOAST STATE
  ======================================================= */

  const [toastMessage, setToastMessage] =
    useState("");

  const [toastType, setToastType] =
    useState<"success" | "error">("success");

  /* =======================================================
     SHOW TOAST
  ======================================================= */

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToastMessage(message);
    setToastType(type);

    setTimeout(() => {
      setToastMessage("");
    }, 2500);
  };

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "/api/settings",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const result = await response.json();

        /* -----------------------------------------------
           NOT LOGGED IN
        ------------------------------------------------ */

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        /* -----------------------------------------------
           NOT ADMIN
        ------------------------------------------------ */

        if (response.status === 403) {
          router.replace("/admin/dashboard");
          return;
        }

        /* -----------------------------------------------
           API ERROR
        ------------------------------------------------ */

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to load settings"
          );
        }

        /* -----------------------------------------------
           SET SETTINGS
        ------------------------------------------------ */

        if (result.data) {
          setSettings({
            punchInStartTime:
              result.data.punchInStartTime ?? "",

            punchInEndTime:
              result.data.punchInEndTime ?? "",

            punchInGeoRequired:
              Boolean(
                result.data.punchInGeoRequired
              ),

            punchInIpRequired:
              Boolean(
                result.data.punchInIpRequired
              ),

            punchInBrowserRequired:
              Boolean(
                result.data.punchInBrowserRequired
              ),

            punchInSystemIdRequired:
              Boolean(
                result.data.punchInSystemIdRequired
              ),

            punchOutStartTime:
              result.data.punchOutStartTime ?? "",

            punchOutEndTime:
              result.data.punchOutEndTime ?? "",

            punchOutGeoRequired:
              Boolean(
                result.data.punchOutGeoRequired
              ),

            punchOutIpRequired:
              Boolean(
                result.data.punchOutIpRequired
              ),

            punchOutBrowserRequired:
              Boolean(
                result.data.punchOutBrowserRequired
              ),

            punchOutSystemIdRequired:
              Boolean(
                result.data.punchOutSystemIdRequired
              ),

            taskIdPrefix:
              result.data.taskIdPrefix || "QT",

            nextTaskNumber:
              Number(
                result.data.nextTaskNumber || 1
              ),
          });
        }
      } catch (err: any) {
        console.error(
          "Settings load error:",
          err
        );

        const message =
          err?.message ||
          "Error loading settings";

        setError(message);

        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  /* =======================================================
     HANDLE NORMAL INPUT
  ======================================================= */

  const handleChange = (
    field: keyof SettingsData,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* =======================================================
     HANDLE TOGGLE
  ======================================================= */

  const handleToggle = async (
    field: ToggleField
  ) => {
    const previousValue =
      Boolean(settings[field]);

    const newValue = !previousValue;

    /* -----------------------------------------------
       OPTIMISTIC UI
    ------------------------------------------------ */

    setSettings((prev) => ({
      ...prev,
      [field]: newValue,
    }));

    try {
      setError(null);

      /* ---------------------------------------------
         UPDATE DATABASE
      ---------------------------------------------- */

      const response = await fetch(
        "/api/settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            [field]: newValue,
          }),
        }
      );

      const result =
        await response.json();

      /* ---------------------------------------------
         AUTH
      ---------------------------------------------- */

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      /* ---------------------------------------------
         PERMISSION
      ---------------------------------------------- */

      if (response.status === 403) {
        throw new Error(
          result.message ||
            "Only admins can manage settings"
        );
      }

      /* ---------------------------------------------
         API ERROR
      ---------------------------------------------- */

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to update setting"
        );
      }

      /* ---------------------------------------------
         SYNC WITH SERVER
      ---------------------------------------------- */

      if (result.data) {
        setSettings((prev) => ({
          ...prev,

          punchInStartTime:
            result.data
              .punchInStartTime ??
            prev.punchInStartTime,

          punchInEndTime:
            result.data
              .punchInEndTime ??
            prev.punchInEndTime,

          punchInGeoRequired:
            Boolean(
              result.data
                .punchInGeoRequired
            ),

          punchInIpRequired:
            Boolean(
              result.data
                .punchInIpRequired
            ),

          punchInBrowserRequired:
            Boolean(
              result.data
                .punchInBrowserRequired
            ),

          punchInSystemIdRequired:
            Boolean(
              result.data
                .punchInSystemIdRequired
            ),

          punchOutStartTime:
            result.data
              .punchOutStartTime ??
            prev.punchOutStartTime,

          punchOutEndTime:
            result.data
              .punchOutEndTime ??
            prev.punchOutEndTime,

          punchOutGeoRequired:
            Boolean(
              result.data
                .punchOutGeoRequired
            ),

          punchOutIpRequired:
            Boolean(
              result.data
                .punchOutIpRequired
            ),

          punchOutBrowserRequired:
            Boolean(
              result.data
                .punchOutBrowserRequired
            ),

          punchOutSystemIdRequired:
            Boolean(
              result.data
                .punchOutSystemIdRequired
            ),

          taskIdPrefix:
            result.data.taskIdPrefix ||
            prev.taskIdPrefix,

          nextTaskNumber:
            Number(
              result.data
                .nextTaskNumber ||
                prev.nextTaskNumber
            ),
        }));
      }

      /* ---------------------------------------------
         SETTING NAME
      ---------------------------------------------- */

      const settingNames: Record<
        ToggleField,
        string
      > = {
        punchInGeoRequired:
          "Punch In Location",

        punchInIpRequired:
          "Punch In IP Address",

        punchInBrowserRequired:
          "Punch In Browser",

        punchInSystemIdRequired:
          "Punch In System ID",

        punchOutGeoRequired:
          "Punch Out Location",

        punchOutIpRequired:
          "Punch Out IP Address",

        punchOutBrowserRequired:
          "Punch Out Browser",

        punchOutSystemIdRequired:
          "Punch Out System ID",
      };

      const settingName =
        settingNames[field];

      /* ---------------------------------------------
         SUCCESS TOAST
      ---------------------------------------------- */

      showToast(
        `${settingName} ${
          newValue
            ? "enabled"
            : "disabled"
        }`,
        "success"
      );
    } catch (err: any) {
      console.error(
        "Toggle update error:",
        err
      );

      /* ---------------------------------------------
         ROLLBACK UI
      ---------------------------------------------- */

      setSettings((prev) => ({
        ...prev,
        [field]: previousValue,
      }));

      const message =
        err?.message ||
        "Failed to update setting";

      setError(message);

      showToast(
        message,
        "error"
      );
    }
  };

  /* =======================================================
     HANDLE DYNAMIC TIME CHANGE
  ======================================================= */

  type TimeField =
    | "punchInStartTime"
    | "punchInEndTime"
    | "punchOutStartTime"
    | "punchOutEndTime";

  const timeFieldLabels: Record<TimeField, string> = {
    punchInStartTime: "Punch In Start Time",
    punchInEndTime: "Punch In End Time",
    punchOutStartTime: "Punch Out Start Time",
    punchOutEndTime: "Punch Out End Time",
  };

  const formatDisplayTime = (val: string) => {
    if (!val) return "";
    const parts = val.split(":");
    let h = parseInt(parts[0] || "0", 10);
    const m = parseInt(parts[1] || "0", 10);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, "0")} ${ap}`;
  };

  const handleTimeChange = async (
    field: TimeField,
    value: string
  ) => {
    const previousValue = settings[field] || "";
    const cleanValue = value ? value.trim() : "";

    // 1. Optimistic UI update
    setSettings((prev) => ({
      ...prev,
      [field]: cleanValue,
    }));

    try {
      setError(null);

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          [field]: cleanValue || null,
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error(result.message || "Only admins can manage settings");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update time setting");
      }

      // Sync server data
      if (result.data) {
        setSettings((prev) => ({
          ...prev,
          [field]: result.data[field] ?? cleanValue,
        }));
      }

      const label = timeFieldLabels[field] || "Timing";
      const displayVal = formatDisplayTime(cleanValue);
      showToast(
        cleanValue
          ? `${label} updated to ${displayVal}`
          : `${label} cleared`,
        "success"
      );
    } catch (err: any) {
      console.error("Time update error:", err);

      // Rollback
      setSettings((prev) => ({
        ...prev,
        [field]: previousValue,
      }));

      const message = err?.message || "Failed to update timing";
      setError(message);
      showToast(message, "error");
    }
  };

  /* =======================================================
     SAVE NORMAL SETTINGS
  ======================================================= */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const response = await fetch(
        "/api/settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify(settings),
        }
      );

      const result =
        await response.json();

      /* ---------------------------------------------
         AUTH
      ---------------------------------------------- */

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      /* ---------------------------------------------
         PERMISSION
      ---------------------------------------------- */

      if (response.status === 403) {
        showToast(
          result.message ||
            "Only admins can manage settings",
          "error"
        );

        return;
      }

      /* ---------------------------------------------
         API ERROR
      ---------------------------------------------- */

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to update settings"
        );
      }

      /* ---------------------------------------------
         SYNC
      ---------------------------------------------- */

      if (result.data) {
        setSettings({
          punchInStartTime:
            result.data
              .punchInStartTime ?? "",

          punchInEndTime:
            result.data
              .punchInEndTime ?? "",

          punchInGeoRequired:
            Boolean(
              result.data
                .punchInGeoRequired
            ),

          punchInIpRequired:
            Boolean(
              result.data
                .punchInIpRequired
            ),

          punchInBrowserRequired:
            Boolean(
              result.data
                .punchInBrowserRequired
            ),

          punchInSystemIdRequired:
            Boolean(
              result.data
                .punchInSystemIdRequired
            ),

          punchOutStartTime:
            result.data
              .punchOutStartTime ?? "",

          punchOutEndTime:
            result.data
              .punchOutEndTime ?? "",

          punchOutGeoRequired:
            Boolean(
              result.data
                .punchOutGeoRequired
            ),

          punchOutIpRequired:
            Boolean(
              result.data
                .punchOutIpRequired
            ),

          punchOutBrowserRequired:
            Boolean(
              result.data
                .punchOutBrowserRequired
            ),

          punchOutSystemIdRequired:
            Boolean(
              result.data
                .punchOutSystemIdRequired
            ),

          taskIdPrefix:
            result.data
              .taskIdPrefix || "QT",

          nextTaskNumber:
            Number(
              result.data
                .nextTaskNumber || 1
            ),
        });
      }

      /* ---------------------------------------------
         SUCCESS
      ---------------------------------------------- */

      showToast(
        result.message ||
          "Settings updated successfully",
        "success"
      );

      setSuccessMsg(
        "Settings updated successfully!"
      );

      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      console.error(
        "Settings save error:",
        err
      );

      const message =
        err?.message ||
        "Error saving settings";

      setError(message);

      showToast(
        message,
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <PageShimmer variant="settings" />
    );
  }

  /* =======================================================
     SWITCH COMPONENT
  ======================================================= */

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
    const enabled =
      Boolean(settings[field]);

    return (
      <div className="settings-switch-row">
        <div className="settings-switch-info">
          <div className="settings-switch-icon">
            {icon}
          </div>

          <div>
            <div className="settings-switch-title">
              {title}
            </div>

            <div className="settings-switch-description">
              {description}
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`settings-switch ${
            enabled
              ? "active"
              : ""
          }`}
          onClick={() =>
            handleToggle(field)
          }
          disabled={saving}
        >
          <span className="settings-switch-thumb" />
        </button>
      </div>
    );
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        paddingBottom: "40px",
      }}
    >
      {/* =================================================
          CUSTOM TOAST
      ================================================= */}

      {toastMessage && (
        <div
          className={`settings-toast ${
            toastType === "success"
              ? "settings-toast-success"
              : "settings-toast-error"
          }`}
        >
          <div className="settings-toast-icon">
            {toastType === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
          </div>

          <span className="settings-toast-message">
            {toastMessage}
          </span>

          <button
            type="button"
            className="settings-toast-close"
            onClick={() =>
              setToastMessage("")
            }
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

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

      {/* =================================================
          SUCCESS
      ================================================= */}

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

          <span>
            {successMsg}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* =================================================
            PUNCH IN TIMING
        ================================================= */}

        <div
          className="card"
          style={{
            marginBottom: "24px",
          }}
        >
          <h3
            className="card-title"
            style={{
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Clock
              size={20}
              style={{
                color:
                  "var(--accent-primary)",
              }}
            />

            Punch In Timing Window
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "20px",
            }}
          >
            <CustomTimePicker
              label="Start Time"
              value={
                settings.punchInStartTime ||
                ""
              }
              onChange={(value) =>
                handleTimeChange(
                  "punchInStartTime",
                  value
                )
              }
              align="right"
            />

            <CustomTimePicker
              label="End Time"
              value={
                settings.punchInEndTime ||
                ""
              }
              onChange={(value) =>
                handleTimeChange(
                  "punchInEndTime",
                  value
                )
              }
              align="right"
            />
          </div>
        </div>

        {/* =================================================
            PUNCH IN REQUIREMENTS
        ================================================= */}

        <div
          className="card"
          style={{
            marginBottom: "24px",
          }}
        >
          <h3
            className="card-title"
            style={{
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldCheck
              size={20}
              style={{
                color:
                  "var(--accent-primary)",
              }}
            />

            Punch In Requirements
          </h3>

          <p
            style={{
              color:
                "var(--text-secondary)",
              fontSize: "0.85rem",
              marginBottom: "20px",
            }}
          >
            Choose what information
            employees must provide when
            punching in.
          </p>

          <div className="settings-switch-list">
            <SettingSwitch
              field="punchInGeoRequired"
              title="Location Required"
              description="Employee must provide their location when punching in."
              icon={
                <MapPin size={18} />
              }
            />

            <SettingSwitch
              field="punchInIpRequired"
              title="IP Address Required"
              description="Employee's IP address must be recorded."
              icon={
                <Globe size={18} />
              }
            />

            <SettingSwitch
              field="punchInBrowserRequired"
              title="Browser Required"
              description="Employee's browser information must be recorded."
              icon={
                <Monitor size={18} />
              }
            />

            <SettingSwitch
              field="punchInSystemIdRequired"
              title="System ID Required"
              description="Employee's device/system identifier must be provided."
              icon={
                <Fingerprint
                  size={18}
                />
              }
            />
          </div>
        </div>

        {/* =================================================
            PUNCH OUT TIMING
        ================================================= */}

        <div
          className="card"
          style={{
            marginBottom: "24px",
          }}
        >
          <h3
            className="card-title"
            style={{
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Clock
              size={20}
              style={{
                color:
                  "var(--accent-primary)",
              }}
            />

            Punch Out Timing Window
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "20px",
            }}
          >
            <CustomTimePicker
              label="Start Time"
              value={
                settings.punchOutStartTime ||
                ""
              }
              onChange={(value) =>
                handleTimeChange(
                  "punchOutStartTime",
                  value
                )
              }
              align="right"
            />

            <CustomTimePicker
              label="End Time"
              value={
                settings.punchOutEndTime ||
                ""
              }
              onChange={(value) =>
                handleTimeChange(
                  "punchOutEndTime",
                  value
                )
              }
              align="right"
            />
          </div>
        </div>

        {/* =================================================
            PUNCH OUT REQUIREMENTS
        ================================================= */}

        <div
          className="card"
          style={{
            marginBottom: "24px",
          }}
        >
          <h3
            className="card-title"
            style={{
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldCheck
              size={20}
              style={{
                color:
                  "var(--accent-primary)",
              }}
            />

            Punch Out Requirements
          </h3>

          <p
            style={{
              color:
                "var(--text-secondary)",
              fontSize: "0.85rem",
              marginBottom: "20px",
            }}
          >
            Choose what information
            employees must provide when
            punching out.
          </p>

          <div className="settings-switch-list">
            <SettingSwitch
              field="punchOutGeoRequired"
              title="Location Required"
              description="Employee must provide their location when punching out."
              icon={
                <MapPin size={18} />
              }
            />

            <SettingSwitch
              field="punchOutIpRequired"
              title="IP Address Required"
              description="Employee's IP address must be recorded."
              icon={
                <Globe size={18} />
              }
            />

            <SettingSwitch
              field="punchOutBrowserRequired"
              title="Browser Required"
              description="Employee's browser information must be recorded."
              icon={
                <Monitor size={18} />
              }
            />

            <SettingSwitch
              field="punchOutSystemIdRequired"
              title="System ID Required"
              description="Employee's device/system identifier must be provided."
              icon={
                <Fingerprint
                  size={18}
                />
              }
            />
          </div>
        </div>

        {/* =================================================
            TASK ID
        ================================================= */}

        <div
          className="card"
          style={{
            marginBottom: "24px",
          }}
        >
          <h3
            className="card-title"
            style={{
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Hash
              size={20}
              style={{
                color:
                  "var(--accent-primary)",
              }}
            />

            Task ID Format
          </h3>

          <p
            style={{
              color:
                "var(--text-secondary)",
              fontSize: "0.8rem",
              margin: "0 0 18px",
            }}
          >
            New tasks will use this
            prefix and counter. Example:{" "}
            <strong>
              {settings.taskIdPrefix ||
                "QT"}
              -
              {settings.nextTaskNumber}
            </strong>
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "20px",
            }}
          >
            <div>
              <label
                className="form-label"
                htmlFor="task-id-prefix"
              >
                Task ID Prefix
              </label>

              <input
                id="task-id-prefix"
                className="form-control"
                value={
                  settings.taskIdPrefix ||
                  ""
                }
                maxLength={12}
                onChange={(e) =>
                  handleChange(
                    "taskIdPrefix",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="QT"
                required
              />
            </div>

            <div>
              <label
                className="form-label"
                htmlFor="next-task-number"
              >
                Next Task Number
              </label>

              <input
                id="next-task-number"
                className="form-control"
                type="number"
                min={1}
                step={1}
                value={
                  settings.nextTaskNumber
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    nextTaskNumber:
                      Number(
                        e.target.value
                      ),
                  }))
                }
                required
              />
            </div>
          </div>
        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            gap: "12px",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              router.push(
                "/admin/dashboard"
              )
            }
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              gap: "8px",
            }}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2
                  className="animate-spin"
                  size={14}
                />

                <span>
                  Saving...
                </span>
              </>
            ) : (
              <>
                <Save size={14} />

                <span>
                  Save Settings
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}