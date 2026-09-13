import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { goalApi, userApi, exportApi } from '../services/api';
import { useToast } from '../contexts/ToastContextStore';
import { useAuth } from '../contexts/AuthContextStore';
import { useCalendar } from '../contexts/CalendarContextStore';
import { Button, Card, Input, LoadingSpinner, Select, Textarea } from '../components/ui';
import {
  HiOutlineUser, HiOutlineLockClosed, HiOutlineFlag, HiOutlineBell,
  HiOutlineSparkles, HiOutlineCheck, HiOutlineDownload, HiOutlineUpload,
  HiOutlineCamera, HiOutlineTrash, HiOutlineCloudUpload, HiOutlineCalendar,
} from 'react-icons/hi';

const NOTIFICATION_OPTIONS = [
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
];

const PROFILE_VISIBILITY_OPTIONS = [
  { value: 'true', label: 'Public profile' },
  { value: 'false', label: 'Private profile' },
];

const DIRECT_MESSAGE_OPTIONS = [
  { value: 'followers', label: 'People who follow me' },
  { value: 'everyone', label: 'Everyone' },
  { value: 'none', label: 'No one' },
];

export default function Settings() {
  const toast = useToast();
  const { user, setUser } = useAuth();
  const { calendar, setCalendar, calendarOptions, formatDate } = useCalendar();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    display_name: '',
    email: '',
    bio: '',
    avatar_url: '/images/profile.jpg',
    is_profile_public: true,
    allow_direct_messages: 'followers',
    notification_enabled: true,
    notification_time: '09:00',
  });
  const [dailyGoal, setDailyGoal] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profileRes, goalRes] = await Promise.all([userApi.getProfile(), goalApi.get()]);
      const profile = profileRes.data || {};
      setForm({
        display_name: profile.display_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || user?.avatar_url || '/images/profile.jpg',
        is_profile_public: Boolean(profile.is_profile_public),
        allow_direct_messages: profile.allow_direct_messages || 'followers',
        notification_enabled: Boolean(profile.notification_enabled),
        notification_time: profile.notification_time?.slice(0, 5) || '09:00',
      });
      setDailyGoal(String(goalRes.data?.target_hours ?? 10));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleAvatarSelect = async (e) => {
    if (!user) {
      toast.info('برای تغییر تصویر پروفایل لطفاً وارد حساب خود شوید.');
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Please select a valid image file (PNG, JPG, WEBP, GIF)');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning('Image file size must be under 5MB');
      e.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await userApi.uploadAvatar(file);
      const updatedUser = res.data;
      if (updatedUser) {
        setUser(updatedUser);
        setForm(current => ({ ...current, avatar_url: updatedUser.avatar_url }));
        toast.success('Profile photo uploaded to Cloudinary successfully! ✨');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to upload photo to Cloudinary');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) {
      toast.info('برای تغییر تصویر پروفایل لطفاً وارد حساب خود شوید.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const res = await userApi.removeAvatar();
      const updatedUser = res.data;
      if (updatedUser) {
        setUser(updatedUser);
        setForm(current => ({ ...current, avatar_url: updatedUser.avatar_url }));
        toast.success('Profile photo reset to default');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to remove photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async () => {
    if (!user) {
      toast.success('تنظیمات تقویم با موفقیت اعمال شد ✨');
      return;
    }
    const targetHours = Number(dailyGoal);
    if (!Number.isFinite(targetHours) || targetHours < 0.5 || targetHours > 24) {
      toast.warning('Daily goal must be between 0.5 and 24 hours');
      return;
    }

    setSaving(true);
    try {
      const [profileResult] = await Promise.all([
        userApi.updateSettings({
          display_name: form.display_name.trim(),
          email: form.email.trim() || null,
          bio: form.bio.trim() || null,
          is_profile_public: form.is_profile_public,
          allow_direct_messages: form.allow_direct_messages,
          notification_enabled: form.notification_enabled,
          notification_time: form.notification_time,
          calendar_type: calendar,
        }),
        goalApi.update(targetHours),
      ]);
      setUser(profileResult.data);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const currentAvatar = form.avatar_url || user?.avatar_url || '/images/profile.jpg';
  const isDefaultAvatar = currentAvatar === '/images/profile.jpg';

  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>Preferences</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Account Settings</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">Manage your developer profile, daily targets, and system notifications</p>
      </div>

      {/* Guest Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 p-4 text-xs text-indigo-300 animate-fade-in text-center sm:text-right" dir="rtl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span>حالت مهمان فعال است. سیستم تقویم را می‌توانید تغییر دهید؛ برای تنظیمات پیشرفته پروفایل و ذخیره دائمی اطلاعات وارد شوید.</span>
          </div>
          <Link
            to="/login"
            className="shrink-0 font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
          >
            ورود / ثبت‌نام
          </Link>
        </div>
      )}

      {/* Profile & Avatar Section */}
      <Card className="space-y-6 p-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
            <HiOutlineUser size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">Public Profile</h2>
            <p className="text-xs text-text-muted">How you appear to others in the developer community</p>
          </div>
        </div>

        {/* Cloudinary Avatar Upload Block */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-5 rounded-2xl bg-surface-lighter/40 border border-border/60 backdrop-blur-sm">
          <div className="relative group shrink-0">
            <div className="relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-indigo-500/20 shadow-xl group-hover:ring-indigo-500/50 transition-all">
              <img
                src={currentAvatar}
                alt="Profile Avatar"
                className={`h-full w-full object-cover transition-all duration-300 ${uploadingAvatar ? 'opacity-40 scale-105 filter blur-xs' : 'group-hover:scale-105'}`}
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Upload photo"
              title="Change Profile Photo"
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-surface cursor-pointer transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
            >
              <HiOutlineCamera size={16} />
            </button>
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="font-bold text-sm text-text">Profile Picture</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cloudinary Storage
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Upload a clear avatar for your developer rank and community leaderboards. Recommended square JPG, PNG, or WebP under 5MB.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 text-xs"
              >
                <HiOutlineCloudUpload size={16} />
                {uploadingAvatar ? 'Uploading to Cloudinary…' : 'Upload New Photo'}
              </Button>

              {!isDefaultAvatar && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={handleRemoveAvatar}
                  className="gap-1.5 text-xs text-red-400 hover:text-red-300 hover:border-red-500/40"
                >
                  <HiOutlineTrash size={15} />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Display name"
            value={form.display_name}
            onChange={event => setForm(current => ({ ...current, display_name: event.target.value }))}
            maxLength={150}
          />
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
          />
        </div>
        <Textarea
          label="Short Bio"
          value={form.bio}
          onChange={event => setForm(current => ({ ...current, bio: event.target.value }))}
          maxLength={280}
          rows={3}
          placeholder="What technologies are you mastering right now?"
        />
      </Card>

      {/* Community Privacy Section */}
      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
            <HiOutlineLockClosed size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">Community & Privacy</h2>
            <p className="text-xs text-text-muted">Control who can view your profile and send direct messages</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Profile visibility"
            options={PROFILE_VISIBILITY_OPTIONS}
            value={String(form.is_profile_public)}
            onChange={event => setForm(current => ({ ...current, is_profile_public: event.target.value === 'true' }))}
          />
          <Select
            label="Who can message me"
            options={DIRECT_MESSAGE_OPTIONS}
            value={form.allow_direct_messages}
            onChange={event => setForm(current => ({ ...current, allow_direct_messages: event.target.value }))}
          />
        </div>
      </Card>

      {/* Calendar System Section */}
      <Card className="space-y-5 p-6 border-indigo-500/20">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
            <HiOutlineCalendar size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">Calendar System / سیستم تقویم</h2>
            <p className="text-xs text-text-muted">Choose how dates, charts, and activity graphs are displayed</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {calendarOptions.map((opt) => {
            const isSelected = calendar === opt.value;
            const previewDate = formatDate(new Date(), { weekday: true, includeYear: true, calendar: opt.value });
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCalendar(opt.value)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-border/60 bg-surface-lighter/30 hover:border-border hover:bg-surface-lighter/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-extrabold text-text">
                      {opt.value === 'afghan' && '🇦🇫 '}
                      {opt.value === 'iranian' && '🇮🇷 '}
                      {opt.value === 'gregorian' && '🌐 '}
                      {opt.label}
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Today's preview:</p>
                  <p className="text-xs font-bold text-indigo-300 mt-0.5" dir={opt.value === 'gregorian' ? 'ltr' : 'rtl'}>
                    {previewDate}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Study Goal Section */}
      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <HiOutlineFlag size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">Daily Target</h2>
            <p className="text-xs text-text-muted">Set your target coding/study hours per day</p>
          </div>
        </div>
        <Input
          label="Daily target (hours)"
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          value={dailyGoal}
          onChange={event => setDailyGoal(event.target.value)}
        />
      </Card>

      {/* Notifications Section */}
      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400">
            <HiOutlineBell size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">Reminders</h2>
            <p className="text-xs text-text-muted">Get daily nudges to log your study sessions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Daily reminder"
            options={NOTIFICATION_OPTIONS}
            value={String(form.notification_enabled)}
            onChange={event => setForm(current => ({ ...current, notification_enabled: event.target.value === 'true' }))}
          />
          <Input
            label="Reminder time"
            type="time"
            value={form.notification_time}
            disabled={!form.notification_enabled}
            onChange={event => setForm(current => ({ ...current, notification_time: event.target.value }))}
          />
        </div>
      </Card>

      {/* Data Backup & Restore Section */}
      <Card className="space-y-5 p-6 border-indigo-500/20">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
            <HiOutlineDownload size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">Data Backup & Restore</h2>
            <p className="text-xs text-text-muted">Export your full study history or restore from a JSON backup</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 p-4 rounded-xl bg-surface-lighter/30 border border-border/50">
            <h3 className="font-bold text-xs">Export Backup</h3>
            <p className="text-[11px] text-text-muted">Download all your study sessions, technologies, and notes.</p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!user) {
                    toast.info('برای خروجی گرفتن از اطلاعات لطفاً ابتدا وارد حساب خود شوید.');
                    return;
                  }
                  try {
                    const res = await exportApi.export('json');
                    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `codelume-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    toast.success('Backup downloaded');
                  } catch (e) {
                    toast.error(e.message);
                  }
                }}
              >
                <HiOutlineDownload size={16} /> Export JSON
              </Button>
            </div>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-surface-lighter/30 border border-border/50">
            <h3 className="font-bold text-xs">Restore Backup</h3>
            <p className="text-[11px] text-text-muted">Import sessions and data from a JSON backup file.</p>
            <div className="pt-2">
              <label className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all">
                <HiOutlineUpload size={16} /> Import JSON File
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    if (!user) {
                      toast.info('برای بازیابی اطلاعات لطفاً ابتدا وارد حساب خود شوید.');
                      e.target.value = '';
                      return;
                    }
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const payload = JSON.parse(text);
                      const res = await exportApi.import(payload);
                      toast.success(`Imported ${res.data?.importedSessions || 0} sessions successfully!`);
                    } catch (err) {
                      toast.error(`Import failed: ${err.message}`);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="px-7 py-3">
          <HiOutlineCheck size={18} />
          {saving ? 'Saving Changes…' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
