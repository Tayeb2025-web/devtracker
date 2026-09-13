import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContextStore';
import { useToast } from '../contexts/ToastContextStore';
import { sessionApi } from '../services/api';
import { formatLocalDate, formatLocalTime } from '../constants';
import { Button, Input } from '../components/ui';

export default function Auth({ mode }) {
  const { user, login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const isLogin = mode === 'login';
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) await login({ email: form.email, password: form.password });
      else await register(form);

      // Check for any pending guest session to auto-save to new account
      try {
        const pendingRaw = localStorage.getItem('devtracker-pending-guest-session');
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          localStorage.removeItem('devtracker-pending-guest-session');
          if (pending && pending.durationSeconds >= 60) {
            const now = new Date();
            const mins = Math.floor(pending.durationSeconds / 60);
            await sessionApi.create({
              technology_id: pending.sessionTechnologyId || null,
              project_id: pending.sessionProjectId || null,
              session_date: pending.savedSessionDate || formatLocalDate(now),
              start_time: pending.savedStartTime || formatLocalTime(now),
              end_time: formatLocalTime(now),
              duration_minutes: mins,
              duration_hours: Number((mins / 60).toFixed(4)),
              note: pending.sessionNote || null,
            });
            toast.success(`جلسه مطالعه شما (${mins} دقیقه) با موفقیت در حساب کاربری ثبت شد! 🎉`);
            window.dispatchEvent(new Event('devtracker-session-saved'));
          }
        }
      } catch (e) {
        console.warn('Could not auto-save guest session:', e);
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center bg-surface p-4 overflow-hidden">
      {/* Animated glowing background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <section className="relative z-10 w-full max-w-md rounded-3xl p-7 glass shadow-2xl sm:p-10 border border-border/80 animate-scale-in">
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
            {submitting ? 'Please wait…' : isLogin ? 'Sign In to Dashboard' : 'Create Your Account'}
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

        {/* Back to app as guest */}
        <div className="mt-4 pt-4 border-t border-border/60 text-center">
          <Link
            to="/"
            className="text-xs font-semibold text-text-muted hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5"
          >
            <span>←</span>
            <span>بازگشت به برنامه (حالت مهمان)</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
