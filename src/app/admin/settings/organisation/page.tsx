"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Building,
  Upload,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
} from "lucide-react";

import PageShimmer from "@/components/PageShimmer";
import SettingsNavTabs from "@/components/SettingsNavTabs";
import { toast } from "@/lib/toast";
import "../style.css";

interface PropertyInfo {
  name: string;
  logo: string;
  short_description: string;
}

export default function OrganisationSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [property, setProperty] = useState<PropertyInfo>({
    name: "",
    logo: "",
    short_description: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
    const loadOrganisationSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/profile", {
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
          throw new Error(result.message || "Failed to load organisation info");
        }

        const propData = result.data?.property || {};
        setProperty({
          name: propData.name || "",
          logo: propData.logo || "",
          short_description: propData.short_description || "",
        });
      } catch (err: any) {
        console.error("LOAD ORGANISATION SETTINGS ERROR:", err);
        setError(err.message || "Something went wrong while loading organisation settings.");
        showToast(err.message || "Failed to load organisation settings", "error");
      } finally {
        setLoading(false);
      }
    };

    loadOrganisationSettings();
  }, [router]);

  const handleFileUpload = async (file: File) => {
    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.url) {
        throw new Error(result.message || "Failed to upload logo image");
      }

      setProperty((prev) => ({
        ...prev,
        logo: result.data.url,
      }));

      showToast("Logo uploaded successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to upload logo", "error");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          property: {
            name: property.name.trim(),
            logo: property.logo ? property.logo.trim() : null,
            short_description: property.short_description.trim(),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update organisation settings");
      }

      setSuccessMsg("Organisation information updated successfully.");
      showToast("Organisation settings updated successfully", "success");
    } catch (err: any) {
      console.error("SAVE ORGANISATION SETTINGS ERROR:", err);
      setError(err.message || "Something went wrong while saving organisation settings.");
      showToast(err.message || "Failed to save organisation settings", "error");
    } finally {
      setSaving(false);
    }
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
        <div className="card" style={{ marginBottom: "24px" }}>
          {/* Card Header with Icon */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--accent-light, #eff6ff)",
                color: "var(--accent-primary, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                Organisation Information
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  margin: "2px 0 0 0",
                }}
              >
                Information about your organization.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Property Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor="property-name"
                className="form-label"
                style={{ fontWeight: 600, fontSize: "0.8rem", marginBottom: "6px" }}
              >
                Property Name
              </label>
              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <Building size={16} />
                </span>
                <input
                  id="property-name"
                  type="text"
                  value={property.name}
                  onChange={(e) => setProperty({ ...property, name: e.target.value })}
                  placeholder="Property name"
                  className="custom-input-control"
                />
              </div>
            </div>

            {/* Property Logo */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor="property-logo"
                className="form-label"
                style={{ fontWeight: 600, fontSize: "0.8rem", marginBottom: "6px" }}
              >
                Property Logo
              </label>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {/* Logo Preview */}
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    background: "var(--bg-secondary, #f8fafc)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {property.logo ? (
                    <img
                      src={property.logo}
                      alt="Logo"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Building2 size={20} style={{ color: "var(--text-muted, #94a3b8)" }} />
                  )}
                </div>

                {/* Upload Button */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="btn btn-secondary"
                    style={{
                      height: "38px",
                      padding: "0 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.82rem",
                    }}
                  >
                    {uploadingLogo ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    <span>{uploadingLogo ? "Uploading..." : "Upload"}</span>
                  </button>

                  {property.logo && (
                    <button
                      type="button"
                      onClick={() => setProperty({ ...property, logo: "" })}
                      className="btn btn-ghost"
                      style={{ height: "38px", padding: "0 10px", fontSize: "0.78rem", color: "#ef4444" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Short Description */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor="property-description"
                className="form-label"
                style={{ fontWeight: 600, fontSize: "0.8rem", marginBottom: "6px" }}
              >
                Short Description
              </label>
              <div className="custom-input-group" style={{ alignItems: "flex-start" }}>
                <span className="custom-input-addon" style={{ height: "38px", paddingTop: "10px" }}>
                  <FileText size={16} />
                </span>
                <textarea
                  id="property-description"
                  value={property.short_description}
                  onChange={(e) => setProperty({ ...property, short_description: e.target.value })}
                  placeholder="Write a short description..."
                  rows={4}
                  className="custom-input-control"
                  style={{
                    paddingTop: "9px",
                    resize: "vertical",
                    minHeight: "90px",
                  }}
                />
              </div>
            </div>
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
                <span>Save Organisation Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
