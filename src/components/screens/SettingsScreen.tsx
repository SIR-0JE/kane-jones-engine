"use client";

import React, { useState, useEffect } from "react";
import {
  getCurrentSession,
  updateUserProfile,
  changeUserPassword,
  getInitials,
  UserSession,
} from "@/lib/auth";
import { Camera, Check, ShieldAlert, Loader2, User, Building2, Lock, Mail } from "lucide-react";

interface SettingsScreenProps {
  onProfileUpdated?: (updatedSession: UserSession) => void;
}

export function SettingsScreen({ onProfileUpdated }: SettingsScreenProps) {
  const [session, setSession] = useState<UserSession | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [depotName, setDepotName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Feedback states
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const s = getCurrentSession();
    if (s) {
      setSession(s);
      setName(s.name || "");
      setDepotName(s.depotName || "");
      setEmail(s.email || "");
      setAvatarUrl(s.avatarUrl);
    }
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setProfileError("Please select a valid image file (.png, .jpg).");
        return;
      }
      // Convert to Data URL (or base64 storage)
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const updated = await updateUserProfile({
        name,
        depotName,
        avatarUrl,
      });
      setSession(updated);
      setProfileSuccess("Profile and depot details updated successfully!");
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    try {
      await changeUserPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!session) return null;

  const initials = getInitials(name || session.name, email || session.email);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8 pb-24">
      {/* Screen Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14162a] font-sora tracking-tight">
          Account & Depot Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#6b6f8a] font-medium mt-1">
          Manage your personal profile, company depot name, avatar, and security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Section 1: Profile & Depot Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-[#14162a] font-sora">
              Profile & Depot Details
            </h2>
            <p className="text-xs text-[#6b6f8a]">
              Update your name, company depot display name, and avatar picture
            </p>
          </div>

          {profileSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Avatar Upload with Initials Fallback */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6f8a] mb-2">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="User Avatar"
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#7c6fff] shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#7c6fff] text-white font-sora font-extrabold text-xl flex items-center justify-center border-2 border-white shadow-sm">
                      {initials}
                    </div>
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                  >
                    <Camera className="w-5 h-5" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#eef0f7] hover:bg-[#e2e5f0] text-[#14162a] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#7c6fff]" />
                    <span>Upload Picture</span>
                  </label>
                  <p className="text-[11px] text-[#6b6f8a]">
                    JPG or PNG. Fallback initials used if empty.
                  </p>
                </div>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6f8a] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9599b3] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Adewale Ojo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#eef0f7] text-[#14162a] font-medium text-xs sm:text-sm rounded-xl border-none focus:outline-2 focus:outline-[#7c6fff] transition-all"
                />
              </div>
            </div>

            {/* Email Field (Read-only) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6f8a] mb-1.5">
                Email Address (Read-only)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9599b3] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full pl-10 pr-4 py-3 bg-[#eef0f7]/60 text-[#6b6f8a] font-medium text-xs sm:text-sm rounded-xl border-none cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-[#9599b3] mt-1">
                Email address cannot be changed without verification.
              </p>
            </div>

            {/* Depot / Company Name Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6f8a] mb-1.5">
                Depot / Company Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#9599b3] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Kane-Jones Depot"
                  value={depotName}
                  onChange={(e) => setDepotName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#eef0f7] text-[#14162a] font-medium text-xs sm:text-sm rounded-xl border-none focus:outline-2 focus:outline-[#7c6fff] transition-all"
                />
              </div>
              <p className="text-[10px] text-[#9599b3] mt-1">
                Updates your depot name across the header, sidebar, and reports.
              </p>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full py-3.5 bg-gradient-to-r from-[#7c6fff] to-[#5a4dde] text-white rounded-xl font-sora font-semibold text-xs sm:text-sm shadow-[0_4px_20px_rgba(124,111,255,0.35)] hover:translate-y-[-1px] transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {profileSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Change Password */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-[#14162a] font-sora">
              Security & Password
            </h2>
            <p className="text-xs text-[#6b6f8a]">
              Change your account password securely
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6f8a] mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9599b3] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#eef0f7] text-[#14162a] font-medium text-xs sm:text-sm rounded-xl border-none focus:outline-2 focus:outline-[#7c6fff] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6f8a] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9599b3] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#eef0f7] text-[#14162a] font-medium text-xs sm:text-sm rounded-xl border-none focus:outline-2 focus:outline-[#7c6fff] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6f8a] mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9599b3] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#eef0f7] text-[#14162a] font-medium text-xs sm:text-sm rounded-xl border-none focus:outline-2 focus:outline-[#7c6fff] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-sora font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {passwordSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
