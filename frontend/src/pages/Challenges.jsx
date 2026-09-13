import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { challengeApi } from '../services/api';
import { Card, ProgressBar, LoadingSpinner, Badge, Modal, Button, Input, Select, Textarea } from '../components/ui';
import { DEFAULT_CHALLENGES } from '../constants';
import { useCalendar } from '../contexts/CalendarContextStore';
import { useAuth } from '../contexts/AuthContextStore';
import { useToast } from '../contexts/ToastContextStore';
import {
  HiOutlineSparkles,
  HiOutlineFlag,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineFire,
  HiOutlineRefresh,
} from 'react-icons/hi';

function getChallengeIcon(challenge) {
  if (challenge.status === 'completed') return '🏆';
  if (challenge.icon) return challenge.icon;
  if (challenge.unit === 'days' || challenge.challenge_key?.includes('day')) return '🔥';
  if (challenge.unit === 'hours' || challenge.challenge_key?.includes('hour')) return '🎯';
  return '⚡';
}

export default function Challenges() {
  const { user } = useAuth();
  const toast = useToast();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    challenge_name: '',
    challenge_description: '',
    target_value: '20',
    unit: 'hours',
  });

  const { formatDate } = useCalendar();

  const fetchChallenges = () => {
    setLoading(true);
    if (!user) {
      setChallenges(DEFAULT_CHALLENGES);
      setLoading(false);
      return;
    }
    challengeApi
      .getAll()
      .then(res => {
        const list = res.data && res.data.length > 0 ? res.data : DEFAULT_CHALLENGES;
        setChallenges(list);
      })
      .catch(() => {
        setChallenges(DEFAULT_CHALLENGES);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const stats = useMemo(() => {
    const total = challenges.length;
    const completed = challenges.filter(c => c.status === 'completed').length;
    const active = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, rate };
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    if (filter === 'active') return challenges.filter(c => c.status !== 'completed');
    if (filter === 'completed') return challenges.filter(c => c.status === 'completed');
    return challenges;
  }, [challenges, filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.challenge_name.trim() || !form.target_value) return;

    setSubmitting(true);
    try {
      const res = await challengeApi.create({
        challenge_name: form.challenge_name.trim(),
        challenge_description: form.challenge_description.trim() || undefined,
        target_value: Number(form.target_value),
        unit: form.unit,
      });
      if (res.data?.data) {
        setChallenges(prev => [res.data.data, ...prev]);
      } else {
        fetchChallenges();
      }
      setModalOpen(false);
      setForm({ challenge_name: '', challenge_description: '', target_value: '20', unit: 'hours' });
    } catch (err) {
      console.error('Failed to create challenge:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('آیا از حذف این چالش سفارشی اطمینان دارید؟')) return;

    try {
      await challengeApi.delete(id);
      setChallenges(prev => prev.filter(c => (c.id || c._id) !== id));
    } catch (err) {
      console.error('Failed to delete challenge:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <HiOutlineSparkles size={16} />
            <span>Goals & Milestones</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Study Challenges</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">Push yourself with custom coding and study challenges</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={fetchChallenges}
            title="Refresh challenges"
            className="p-2.5"
          >
            <HiOutlineRefresh size={18} />
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!user) {
                toast.info('برای ساخت چالش سفارشی، لطفاً وارد حساب کاربری خود شوید.');
                return;
              }
              setModalOpen(true);
            }}
            className="flex items-center gap-2 font-bold shadow-lg shadow-indigo-500/20"
          >
            <HiOutlinePlus size={18} />
            <span>New Challenge</span>
          </Button>
        </div>
      </div>

      {/* Guest Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 p-4 text-xs text-indigo-300 animate-fade-in text-center sm:text-right" dir="rtl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span>چالش‌های پیش‌فرض را مشاهده می‌کنید. برای محاسبه پیشرفت واقعی و ساخت چالش‌های شخصی وارد شوید.</span>
          </div>
          <Link
            to="/login"
            className="shrink-0 font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
          >
            ورود / ثبت‌نام
          </Link>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 animate-fade-in">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30">
            <HiOutlineFlag size={22} />
          </div>
          <div>
            <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">Total Goals</p>
            <p className="text-2xl font-black text-text mt-0.5">{stats.total}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <HiOutlineFire size={22} />
          </div>
          <div>
            <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{stats.active}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <HiOutlineCheckCircle size={22} />
          </div>
          <div>
            <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{stats.completed}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30">
            <HiOutlineClock size={22} />
          </div>
          <div>
            <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">Success Rate</p>
            <p className="text-2xl font-black text-violet-400 mt-0.5">{stats.rate}%</p>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        {[
          { key: 'all', label: 'All Challenges', count: stats.total },
          { key: 'active', label: 'In Progress', count: stats.active },
          { key: 'completed', label: 'Completed', count: stats.completed },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              filter === tab.key
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'text-text-muted hover:text-text hover:bg-surface-lighter'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-surface-lighter text-text-muted'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Challenges Grid */}
      {filteredChallenges.length === 0 ? (
        <Card className="p-10 text-center animate-fade-in">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="font-bold text-base text-text">No challenges found</h3>
          <p className="text-text-muted text-xs mt-1">There are no challenges matching the selected filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map(challenge => {
            const isCompleted = challenge.status === 'completed';
            const current = Number(challenge.current_value || 0);
            const target = Number(challenge.target_value || 1);
            const percent = Math.min(100, Math.round((current / target) * 100));
            const icon = getChallengeIcon(challenge);
            const isCustom = challenge.challenge_key?.startsWith('custom_');

            return (
              <Card
                key={challenge.id || challenge._id || challenge.challenge_key}
                className={`relative flex flex-col justify-between animate-fade-in transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-surface-light to-teal-500/5 shadow-emerald-500/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 rounded-xl bg-surface-lighter shadow-inner">
                        {icon}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-text leading-snug">
                          {challenge.challenge_name}
                        </h3>
                        <p className="text-text-muted text-[11px] font-mono mt-0.5">
                          Target: {challenge.target_value} {challenge.unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isCompleted ? (
                        <Badge color="accent">Completed!</Badge>
                      ) : (
                        <Badge color="primary">Active</Badge>
                      )}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(challenge.id || challenge._id, e)}
                          title="Delete custom challenge"
                          className="p-1 text-text-muted hover:text-red-400 transition-colors"
                        >
                          <HiOutlineTrash size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {challenge.challenge_description && (
                    <p className="text-text-muted text-xs leading-relaxed mb-4">
                      {challenge.challenge_description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-text-muted mb-1.5 font-medium">
                    <span>Progress ({percent}%)</span>
                    <span className="font-bold text-text">
                      {current} / {target} {challenge.unit}
                    </span>
                  </div>
                  <ProgressBar
                    value={current}
                    max={target}
                    color={isCompleted ? 'accent' : 'primary'}
                    height="h-2.5"
                  />

                  {isCompleted && challenge.completed_at && (
                    <p className="text-emerald-400 text-[11px] font-semibold mt-3 pt-2 border-t border-border/40 flex items-center gap-1">
                      <HiOutlineCheckCircle size={14} />
                      Completed on {formatDate(challenge.completed_at)}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Challenge Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Challenge">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Challenge Name"
            placeholder="e.g. Next.js Mastery, 50 Days Streak..."
            value={form.challenge_name}
            onChange={(e) => setForm({ ...form, challenge_name: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Target Goal"
              type="number"
              min="1"
              max="10000"
              placeholder="e.g. 50"
              value={form.target_value}
              onChange={(e) => setForm({ ...form, target_value: e.target.value })}
              required
            />
            <Select
              label="Goal Unit"
              options={[
                { value: 'hours', label: 'Hours (ساعت)' },
                { value: 'days', label: 'Days (روز)' },
              ]}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>

          <Textarea
            label="Description (Optional)"
            placeholder="What will you achieve with this challenge?"
            value={form.challenge_description}
            onChange={(e) => setForm({ ...form, challenge_description: e.target.value })}
            rows={3}
          />

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Challenge'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
