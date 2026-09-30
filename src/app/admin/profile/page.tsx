"use client";

import { useEffect, useState, useRef } from "react";
import {
  User,
  Phone,
  Mail,
  Building2,
  Image as ImageIcon,
  FileText,
  Save,
  Loader2,
  Upload,
  Briefcase,
  AlertCircle,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import PageShimmer from "@/components/PageShimmer";
import { toast } from "@/lib/toast";

type ProfileData = {
  _id?: string;
  full_name: string | null;
  email: string | null;
  phone_number: number | null;
  user_role?: number;
  designation?: string | null;
  group?: string | null;
  gender?: string | null;
  property_name?: string | null;
  property_logo?: string | null;
  short_description?: string | null;

  profile: {
    gender: string | null;
    profile_picture: string | null;
  };

  property: {
    name: string | null;
    logo: string | null;
    short_description: string | null;
  } | null;
};

const emptyProperty = {
  name: "",
  logo: "",
  short_description: "",
};

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileFileInputRef = useRef<HTMLInputElement | null>(null);
  const propertyLogoInputRef = useRef<HTMLInputElement | null>(null);

  /* =====================================================
     LOAD PROFILE
  ===================================================== */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load profile");
        }

        setProfile({
          ...result.data,
          profile: {
            gender: result.data.profile?.gender || result.data.gender || null,
            profile_picture:
              result.data.profile?.profile_picture || result.data.profile_picture || null,
          },
          property: {
            name: result.data.property?.name || result.data.property_name || "",
            logo: result.data.property?.logo || result.data.property_logo || "",
            short_description:
              result.data.property?.short_description || result.data.short_description || "",
          },
        });

        setPhone(
          result.data.phone_number !== null &&
            result.data.phone_number !== undefined
            ? String(result.data.phone_number)
            : ""
        );
      } catch (error) {
        console.error("Profile load error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  /* =====================================================
     FIELD UPDATES
  ===================================================== */
  const updateProfile = (field: "full_name", value: string) => {
    setProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
      };
    });
  };

  const updatePersonalField = (
    field: "gender" | "profile_picture",
    value: string
  ) => {
    setProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        profile: {
          ...current.profile,
          [field]: value,
        },
      };
    });
  };

  const updatePropertyField = (
    field: "name" | "logo" | "short_description",
    value: string
  ) => {
    setProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        property: {
          ...(current.property || emptyProperty),
          [field]: value,
        },
      };
    });
  };

  /* =====================================================
     FILE UPLOAD
  ===================================================== */
  const handleFileUpload = async (
    file: File,
    target: "profile_picture" | "property_logo"
  ) => {
    try {
      setUploadingTarget(target);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.url) {
        throw new Error(result.message || "Failed to upload image");
      }

      if (target === "profile_picture") {
        updatePersonalField("profile_picture", result.data.url);
      } else {
        updatePropertyField("logo", result.data.url);
      }

      toast.success("Image uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingTarget(null);
    }
  };


  /* =====================================================
     CHANGE PASSWORD
  ===================================================== */
  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      toast.error("Current password is required.");
      return;
    }

    if (!newPassword.trim()) {
      toast.error("New password is required.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from your current password.");
      return;
    }

    try {
      setChangingPassword(true);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          change_password: true,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success("Password changed successfully.");
    } catch (error) {
      console.error("Password change error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to change password"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  /* =====================================================
     SAVE
  ===================================================== */
  const handleSave = async () => {
    if (!profile) return;

    const name = profile.full_name?.trim();

    if (!name) {
      toast.error("Full name is required.");
      return;
    }

    let phoneNumber: number | null = null;

    if (phone.trim()) {
      const parsedPhone = Number(phone.trim());

      if (!Number.isFinite(parsedPhone) || parsedPhone <= 0) {
        toast.error("Please enter a valid phone number.");
        return;
      }

      phoneNumber = parsedPhone;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          full_name: name,
          phone_number: phoneNumber,
          gender: profile.profile?.gender || null,
          profile_picture: profile.profile?.profile_picture || null,
          property: {
            name: profile.property?.name?.trim() || null,
            logo: profile.property?.logo?.trim() || null,
            short_description:
              profile.property?.short_description?.trim() || null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update profile");
      }

      setProfile({
        ...result.data,
        profile: {
          gender: result.data.profile?.gender || result.data.gender || null,
          profile_picture:
            result.data.profile?.profile_picture || result.data.profile_picture || null,
        },
        property: {
          name: result.data.property?.name || result.data.property_name || "",
          logo: result.data.property?.logo || result.data.property_logo || "",
          short_description:
            result.data.property?.short_description || result.data.short_description || "",
        },
      });

      setPhone(
        result.data.phone_number !== null &&
          result.data.phone_number !== undefined
          ? String(result.data.phone_number)
          : ""
      );

      // Update local storage user profile so sidebar and other UI updates
      try {
        const storedUser = localStorage.getItem("worktracker_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.name = result.data.full_name;
          parsed.full_name = result.data.full_name;
          parsed.phone_number = result.data.phone_number;
          if (result.data.profile?.profile_picture) {
            parsed.profile_picture = result.data.profile.profile_picture;
          }
          if (result.data.profile?.gender || result.data.gender) {
            parsed.gender = result.data.profile?.gender || result.data.gender;
          }
          if (result.data.property) {
            parsed.property = result.data.property;
          }
          localStorage.setItem("worktracker_user", JSON.stringify(parsed));
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("user-updated"));
        }
      } catch (e) {
        console.error("Localstorage update error:", e);
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     LOADING & EMPTY STATES
  ===================================================== */
  if (loading) {
    return <PageShimmer variant="settings" />;
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: "800px", margin: "40px auto", textAlign: "center" }}>
        <div className="card" style={{ padding: "32px", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <AlertCircle size={36} style={{ color: "#ef4444" }} />
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Profile could not be loaded. Please refresh or try again later.
          </p>
        </div>
      </div>
    );
  }

  const profilePic = profile.profile?.profile_picture;
  const propertyLogo = profile.property?.logo;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "32px" }}>
      {/* Hidden file inputs */}
      <input
        ref={profileFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, "profile_picture");
          e.target.value = "";
        }}
      />
      <input
        ref={propertyLogoInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, "property_logo");
          e.target.value = "";
        }}
      />

      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <div style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Profile
        </h1>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            marginTop: "4px",
            marginBottom: 0,
          }}
        >
          Manage your personal and organisation information.
        </p>
      </div>

      {/* =================================================
          CONTENT GRID
      ================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* =================================================
            PERSONAL INFORMATION CARD
        ================================================= */}
        <section className="card" style={{ padding: "20px" }}>
          {/* Card Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              paddingBottom: "14px",
              marginBottom: "16px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "var(--border-radius-sm)",
                background: "var(--bg-tertiary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-primary)",
                flexShrink: 0,
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                Personal Information
              </h2>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Your personal account information.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Full Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor="admin-full-name"
                className="form-label"
                style={{ fontWeight: 600, fontSize: "0.75rem", marginBottom: "6px" }}
              >
                Full Name <span >*</span>
              </label>
              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <User size={15} />
                </span>
                <input
                  id="admin-full-name"
                  type="text"
                  value={profile.full_name || ""}
                  onChange={(e) => updateProfile("full_name", e.target.value)}
                  placeholder="Your full name"
                  className="custom-input-control"
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor="admin-email"
                className="form-label"
                style={{ fontWeight: 600, fontSize: "0.75rem", marginBottom: "6px" }}
              >
                Email Address
              </label>
              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <Mail size={15} />
                </span>
                <input
                  id="admin-email"
                  type="email"
                  value={profile.email || ""}
                  disabled
                  className="custom-input-control"
                  style={{
                    cursor: "not-allowed",
                    opacity: 0.75,
                    backgroundColor: "var(--bg-tertiary)",
                  }}
                />
              </div>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                }}
              >
                Email is used for login and cannot be changed here.
              </p>
            </div>

            {/* Phone */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor="admin-phone"
                className="form-label"
                style={{ fontWeight: 600, fontSize: "0.75rem", marginBottom: "6px" }}
              >
                Phone Number
              </label>
              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <Phone size={15} />
                </span>
                <input
                  id="admin-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/[^0-9+]/g, ""))
                  }
                  placeholder="Add phone number"
                  className="custom-input-control"
                />
              </div>
            </div>

            {/* Gender */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor="admin-gender"
                className="form-label"
                style={{ fontWeight: 600, fontSize: "0.75rem", marginBottom: "6px" }}
              >
                Gender
              </label>
              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <User size={15} />
                </span>
                <select
                  id="admin-gender"
                  value={profile.profile?.gender || ""}
                  onChange={(e) => updatePersonalField("gender", e.target.value)}
                  className="custom-input-control"
                  style={{ cursor: "pointer" }}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Profile Picture */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor="admin-profile-picture"
                className="form-label"
                style={{ fontWeight: 600, fontSize: "0.75rem", marginBottom: "6px" }}
              >
                Profile Picture
              </label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {/* Avatar Preview */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-tertiary)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt="Avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "var(--accent-primary)",
                      }}
                    >
                      {profile.full_name?.[0]?.toUpperCase() || "A"}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => profileFileInputRef.current?.click()}
                    disabled={uploadingTarget === "profile_picture"}
                    className="btn btn-secondary"
                    style={{
                      height: "36px",
                      padding: "0 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexShrink: 0,
                    }}
                    title="Upload image from computer"
                  >
                    {uploadingTarget === "profile_picture" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    <span style={{ fontSize: "0.75rem" }}>Upload</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Designation / Role (Read-only badge info if available) */}
            {profile.designation && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  background: "var(--bg-tertiary)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                }}
              >
                <Briefcase size={14} style={{ color: "var(--accent-primary)" }} />
                <span>Designation: <strong>{profile.designation}</strong></span>
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            PROPERTY INFORMATION CARD
        ================================================= */}
        
      </div>

      {/* =================================================
          CHANGE PASSWORD
      ================================================= */}
      <section className="card" style={{ padding: "20px", marginTop: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingBottom: "14px",
            marginBottom: "16px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "var(--border-radius-sm)",
              background: "var(--bg-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)",
              flexShrink: 0,
            }}
          >
            <LockKeyhole size={18} />
          </div>
          <div>
            <h2
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              Change Password
            </h2>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              Update your account password securely.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          {[
            {
              id: "current-password",
              label: "Current Password",
              value: currentPassword,
              setValue: setCurrentPassword,
              show: showCurrentPassword,
              setShow: setShowCurrentPassword,
              placeholder: "Enter current password",
            },
            {
              id: "new-password",
              label: "New Password",
              value: newPassword,
              setValue: setNewPassword,
              show: showNewPassword,
              setShow: setShowNewPassword,
              placeholder: "Minimum 6 characters",
            },
            {
              id: "confirm-password",
              label: "Confirm New Password",
              value: confirmPassword,
              setValue: setConfirmPassword,
              show: showConfirmPassword,
              setShow: setShowConfirmPassword,
              placeholder: "Repeat new password",
            },
          ].map((field) => (
            <div key={field.id} className="form-group" style={{ marginBottom: 0 }}>
              <label
                htmlFor={field.id}
                className="form-label"
                style={{
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  marginBottom: "6px",
                }}
              >
                {field.label}
              </label>

              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <LockKeyhole size={15} />
                </span>

                <input
                  id={field.id}
                  type={field.show ? "text" : "password"}
                  value={field.value}
                  onChange={(e) => field.setValue(e.target.value)}
                  placeholder={field.placeholder}
                  className="custom-input-control"
                  autoComplete={
                    field.id === "current-password"
                      ? "current-password"
                      : "new-password"
                  }
                />

                <button
                  type="button"
                  onClick={() => field.setShow(!field.show)}
                  aria-label={field.show ? "Hide password" : "Show password"}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 10px",
                  }}
                >
                  {field.show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "14px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="btn btn-secondary"
            style={{
              padding: "8px 16px",
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              cursor: changingPassword ? "not-allowed" : "pointer",
            }}
          >
            {changingPassword ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Changing...
              </>
            ) : (
              <>
                <LockKeyhole size={15} />
                Change Password
              </>
            )}
          </button>
        </div>
      </section>

      {/* =================================================
          SAVE BUTTON
      ================================================= */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{
            padding: "8px 24px",
            fontSize: "0.85rem",
            fontWeight: 600,
            borderRadius: "var(--border-radius-sm)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "var(--shadow-sm)",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}