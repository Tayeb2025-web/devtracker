import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { HiOutlineTrash, HiOutlineDocumentText, HiOutlineSearch, HiOutlineSparkles, HiOutlineFilter } from 'react-icons/hi';
import { projectApi, sessionApi, technologyApi } from '../services/api';
import { useToast } from '../contexts/ToastContextStore';
import { useAuth } from '../contexts/AuthContextStore';
import { AfghanDateInput, Card, Button, Select, ConfirmDialog, LoadingSpinner, EmptyState, Badge } from '../components/ui';
import { formatAfghanDate, formatHours, DEFAULT_TECH_LIST } from '../constants';

const FILTERS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function History() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [technologies, setTechnologies] = useState(DEFAULT_TECH_LIST);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [submittedSearch, setSubmittedSearch] = useState(searchParams.get('search') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [sortBy, setSortBy] = useState('date-desc');

  const load = useCallback(async () => {
    setLoading(true);
    if (!user) {
      setSessions([]);
      setTechnologies(DEFAULT_TECH_LIST);
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      const params = {};
      if (filter) params.filter = filter;
      if (techFilter) params.technologyId = techFilter;
      if (projectFilter) params.projectId = projectFilter;
      if (submittedSearch) params.search = submittedSearch;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        delete params.filter;
      }
      const [sessionsRes, techRes, projectRes] = await Promise.all([
        sessionApi.getAll(params),
        technologyApi.getAll(),
        projectApi.getAll(),
      ]);
      setSessions(sessionsRes.data || []);
      setTechnologies(techRes.data && techRes.data.length ? techRes.data : DEFAULT_TECH_LIST);
      setProjects(projectRes.data || []);
    } catch (err) {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user, filter, techFilter, projectFilter, submittedSearch, startDate, endDate]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const query = searchParams.get('search') || '';
    setSearch(query);
    setSubmittedSearch(query);
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSubmittedSearch(search.trim());
  };

  const handleDelete = async () => {
    try {
      await sessionApi.delete(deleteId);
      toast.success('Session deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sorted = [...sessions].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.session_date) - new Date(a.session_date);
    if (sortBy === 'date-asc') return new Date(a.session_date) - new Date(b.session_date);
    if (sortBy === 'duration-desc') return parseFloat(b.duration_hours) - parseFloat(a.duration_hours);
    if (sortBy === 'duration-asc') return parseFloat(a.duration_hours) - parseFloat(b.duration_hours);
    return 0;
  });

  const techOptions = [{ value: '', label: 'All Technologies' }, ...technologies.map(t => ({ value: t.id, label: t.name }))];
  const projectOptions = [{ value: '', label: 'All Projects' }, ...projects.map(project => ({ value: project.id, label: project.name }))];

  return (
    <div className="space-y-7">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>Logs & History</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Study History</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">View and manage all recorded study and coding sessions</p>
      </div>

      {/* Guest Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 p-4 text-xs text-indigo-300 animate-fade-in text-center sm:text-right" dir="rtl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span>تاریخچه در حالت مهمان. برای نگهداری سوابق تمامی جلسات مطالعه و قابلیت جستجو و فیلتر وارد شوید.</span>
          </div>
          <Link
            to="/login"
            className="shrink-0 font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
          >
            ورود / ثبت‌نام
          </Link>
        </div>
      )}

      {/* Filters Container */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border/60 pb-3">
          <HiOutlineFilter size={16} className="text-indigo-400" />
          <span>Filter Sessions</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select label="Period" options={FILTERS} value={filter} onChange={e => { setFilter(e.target.value); setStartDate(''); setEndDate(''); }} />
          <Select label="Technology" options={techOptions} value={techFilter} onChange={e => setTechFilter(e.target.value)} />
          <Select label="Project" options={projectOptions} value={projectFilter} onChange={e => setProjectFilter(e.target.value)} />
          <AfghanDateInput label="From" value={startDate} onChange={setStartDate} allowEmpty />
          <AfghanDateInput label="To" value={endDate} onChange={setEndDate} allowEmpty />
        </div>
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row pt-1">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes, technologies, or projects..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-lighter/80 border border-border text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
          <Select
            className="sm:w-44"
            options={[
              { value: 'date-desc', label: 'Newest First' },
              { value: 'date-asc', label: 'Oldest First' },
              { value: 'duration-desc', label: 'Longest First' },
              { value: 'duration-asc', label: 'Shortest First' },
            ]}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          />
          <Button type="submit" className="w-full sm:w-auto">Search</Button>
        </form>

        {/* Filter Summary Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-text-muted">
          <span>Showing <strong className="text-text">{sorted.length}</strong> matching sessions</span>
          <div className="flex items-center gap-3">
            <span>Total: <strong className="text-indigo-400 font-mono font-bold">{formatHours(sorted.reduce((acc, s) => acc + parseFloat(s.duration_hours || 0), 0))}</strong></span>
            <span>·</span>
            <span>Avg: <strong className="text-emerald-400 font-mono font-bold">{sorted.length > 0 ? formatHours(sorted.reduce((acc, s) => acc + parseFloat(s.duration_hours || 0), 0) / sorted.length) : '0h'}</strong></span>
          </div>
        </div>
      </Card>

      {/* Session Items */}
      {loading ? <LoadingSpinner /> : sorted.length === 0 ? (
        <EmptyState icon={HiOutlineDocumentText} title="No sessions found" description="Start a timer to log your first study session" />
      ) : (
        <div className="space-y-3">
          {sorted.map(session => (
            <Card key={session.id} hover className="animate-fade-in !p-4 relative overflow-hidden group">
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ backgroundColor: session.project_color || session.technology_color || '#6366F1' }}
              />
              <div className="flex items-start justify-between gap-3 sm:items-center pl-2">
                <div className="min-w-0 flex items-start gap-4 sm:items-center">
                  <div
                    className="w-3 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: session.project_color || session.technology_color || '#6366F1' }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold text-sm text-text">{session.project_name || session.technology_name || 'Study session'}</h3>
                      {session.project_name && <Badge color="gray">Project</Badge>}
                      <Badge color="primary">{formatHours(parseFloat(session.duration_hours))}</Badge>
                    </div>
                    <p dir="rtl" className="text-right text-xs font-medium text-text-muted mt-1">
                      {formatAfghanDate(session.session_date)} · {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                    </p>
                    {session.note && <p className="text-xs text-text-muted mt-1.5 italic bg-surface-lighter/40 px-3 py-1.5 rounded-lg border border-border/40">"{session.note}"</p>}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(session.id)}
                  className="p-2 rounded-xl hover:bg-red-500/15 text-text-muted hover:text-red-400 transition-colors"
                >
                  <HiOutlineTrash size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Session"
        message="Are you sure you want to delete this study session?"
      />
    </div>
  );
}
