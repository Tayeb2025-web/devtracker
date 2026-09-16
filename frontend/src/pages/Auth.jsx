import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { HiCheck, HiSparkles } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContextStore';
import { Button, Input } from '../components/ui';
import { DEFAULT_AVATARS, getDefaultAvatar } from '../constants/avatars';
import { userApi } from '../services/api';

export default function Auth({ mode }) {
  const { user, login, register, setUser } = useAuth();
  const navigate = useNavigate();
  const isLogin = mode === 'login';

  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step state: 'form' for credentials, 'avatar' for post-registration onboarding
  const [step, setStep] = useState('form');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0].path);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // If user is already authenticated and not currently picking an avatar, go to dashboard
  if (user && step !== 'avatar') return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;

  const categories = [
    { id: 'all', label: 'همه' },
    { id: 'Cyber', label: 'سایبرپانک' },
    { id: 'Fantasy', label: 'فانتزی' },
    { id: 'Animals', label: 'حیوانات' },
    { id: 'Sci-Fi', label: 'کیهانی' },
  ];

  const filteredAvatars = categoryFilter === 'all'
    ? DEFAULT_AVATARS
    : DEFAULT_AVATARS.filter(a => a.category === categoryFilter);

  const handleRandomAvatar = () => {
    const random = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
    setSelectedAvatar(random.path);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        const loggedUser = await login({ email: form.email, password: form.password });
        const isAdmin = loggedUser?.role === 'admin' || form.email.trim().toLowerCase() === 'sayedtayebpuya2024@gmail.com';
        navigate(isAdmin ? '/admin' : '/', { replace: true });
      } else {
        await register(form);
        // Preselect a deterministic avatar based on their name/email
        const seedAvatar = getDefaultAvatar(form.displayName || form.email);
        setSelectedAvatar(seedAvatar);
        setStep('avatar');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const finishAvatarStep = async (avatarToSave) => {
    setSubmitting(true);
    try {
      if (avatarToSave) {
        await userApi.updateSettings({ avatar_url: avatarToSave });
        if (setUser) {
          setUser(prev => {
            const updated = { ...prev, avatar_url: avatarToSave };
            try {
              localStorage.setItem('devtracker-user', JSON.stringify(updated));
            } catch {
              // Ignore storage errors
            }
            return updated;
          });
        }
      }
      navigate('/', { replace: true });
    } catch {
      // Even if network or API update has an issue, navigate safely to home
      navigate('/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const currentAvatarObj = DEFAULT_AVATARS.find(a => a.path === selectedAvatar) || DEFAULT_AVATARS[0];

  return (
    <main className="relative grid min-h-screen place-items-center bg-surface p-4 overflow-hidden">
      {/* Animated glowing background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <section className={`relative z-10 w-full ${step === 'avatar' ? 'max-w-lg' : 'max-w-md'} rounded-3xl p-6 sm:p-9 glass shadow-2xl border border-border/80 animate-scale-in transition-all duration-300`}>
        {step === 'avatar' ? (
          /* Avatar Selection Onboarding Step */
          <div className="space-y-6" dir="rtl">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                <HiSparkles className="h-3.5 w-3.5" />
                <span>مرحله نهایی • شخصی‌سازی پروفایل</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">
                آواتار خودتو <span className="gradient-text">انتخاب کن!</span>
              </h1>
              <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                خوش آمدی {form.displayName || 'توسعه‌دهنده'}! یکی از آواتارهای خفن زیر رو برای پروفایلت انتخاب کن. بعداً در تنظیمات می‌تونی تغییرش بدی یا عکس واقعی‌ات رو بذاری.
              </p>
            </div>

            {/* Current Selected Avatar Preview Box */}
            <div className="flex items-center justify-between rounded-2xl bg-surface-lighter/70 border border-border/80 p-3.5">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={selectedAvatar}
                    alt={currentAvatarObj.nameFa}
                    className="h-16 w-16 rounded-full border-2 border-primary object-cover shadow-lg shadow-primary/25 bg-surface"
                  />
                  <span className="absolute -bottom-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 border-2 border-surface">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-text">{form.displayName || 'Developer'}</h4>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                      {currentAvatarObj.nameFa}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    نمایش در لیدربورد، جامعه و لیگ رقابتی
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRandomAvatar}
                className="text-xs shrink-0"
              >
                شانسی 🎲
              </Button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'bg-surface-lighter text-text-muted hover:text-text hover:bg-surface-light border border-border/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Avatars Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {filteredAvatars.map(av => {
                const isSelected = selectedAvatar === av.path;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.path)}
                    className={`group relative flex flex-col items-center rounded-2xl p-2 transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/15 border-2 border-primary ring-2 ring-primary/30 scale-105'
                        : 'bg-surface-lighter/50 hover:bg-surface-lighter border border-border/60 hover:scale-102'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={av.path}
                        alt={av.nameFa}
                        className="h-12 w-12 rounded-full object-cover transition-transform group-hover:scale-110"
                        loading="lazy"
                      />
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow">
                          <HiCheck className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <span className="mt-1.5 text-[10px] font-medium text-text-muted group-hover:text-text truncate w-full text-center">
                      {av.nameFa}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                type="button"
                disabled={submitting}
                onClick={() => finishAvatarStep(selectedAvatar)}
                className="w-full py-3 text-sm font-bold shadow-lg shadow-primary/25"
              >
                {submitting ? 'در حال ثبت…' : 'تأیید و ورود به Codelume 🚀'}
              </Button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => finishAvatarStep(null)}
                className="w-full py-2 text-xs font-semibold text-text-muted hover:text-text transition-colors"
              >
                رد کردن و رفتن به داشبورد
              </button>
            </div>
          </div>
        ) : (
          /* Standard Auth Form */
          <>
            {/* Brand header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-3.5 ring-1 ring-indigo-500/30 shadow-xl shadow-indigo-500/10">
                <img src="/codeora-mark.svg" alt="Codelume" className="h-full w-full drop-shadow-md" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {isLogin ? (
                  <span>Welcome back to <span className="gradient-text">Codelume</span></span>
                ) : (
                  <span>Create your <span className="gradient-text">account</span></span>
                )}
              </h1>
              <p className="mt-2 text-xs font-medium text-text-muted leading-relaxed">
                {isLogin
                  ? 'Sign in to continue tracking your coding journey & study progress.'
                  : 'Your study data will be saved securely in your personalized account.'}
              </p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={submit}>
              {!isLogin && (
                <Input
                  label="Full Name"
                  value={form.displayName}
                  onChange={e => setForm({ ...form, displayName: e.target.value })}
                  required
                  minLength={2}
                  placeholder="e.g. Alex Rivera"
                />
              )}
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                placeholder="you@example.com"
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                placeholder="••••••••••••"
              />

              {error && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400 animate-slide-in">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full mt-2 py-3">
                {submitting ? 'Please wait…' : isLogin ? 'Sign In to Dashboard' : 'Next: Choose Avatar →'}
              </Button>
            </form>

            {/* Footer switch */}
            <p className="mt-8 text-center text-xs text-text-muted">
              {isLogin ? 'New to Codelume?' : 'Already have an account?'} {' '}
              <Link
                className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                to={isLogin ? '/signup' : '/login'}
              >
                {isLogin ? 'Create free account' : 'Sign in here'}
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
