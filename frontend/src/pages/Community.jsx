import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  HiOutlineChatAlt2,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineFire,
  HiOutlineGlobeAlt,
  HiOutlineLockClosed,
  HiOutlinePaperAirplane,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineStar,
  HiOutlineUserAdd,
  HiOutlineUserRemove,
  HiOutlineUsers,
  HiOutlineX,
} from 'react-icons/hi';
import { Card, LoadingSpinner, Modal } from '../components/ui';
import { API_BASE, formatAfghanDate } from '../constants';
import { useAuth } from '../contexts/AuthContextStore';
import { useToast } from '../contexts/ToastContextStore';
import { socialApi } from '../services/api';

const TABS = [
  { id: 'discover', label: 'Discover', icon: HiOutlineUsers },
  { id: 'league', label: 'League', icon: HiOutlineStar },
  { id: 'messages', label: 'Messages', icon: HiOutlineChatAlt2 },
];

const socketUrl = import.meta.env.VITE_SOCKET_URL
  || (API_BASE.startsWith('http') ? new URL(API_BASE).origin : undefined);

function profileInitial(profile) {
  return (profile?.displayName || profile?.display_name || profile?.username || '?').trim().charAt(0).toUpperCase();
}

function Avatar({ profile, size = 'md', showOnline = true }) {
  const sizes = { sm: 'h-9 w-9 text-sm', md: 'h-11 w-11 text-base', lg: 'h-16 w-16 text-xl' };
  const dotSizes = {
    sm: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
    md: 'h-3.5 w-3.5 -bottom-0.5 -right-0.5',
    lg: 'h-4 w-4 bottom-0.5 right-0.5',
  };
  const pingSizes = { sm: 'h-2.5 w-2.5', md: 'h-3.5 w-3.5', lg: 'h-4 w-4' };
  const src = profile?.avatarUrl || profile?.avatar_url;
  const isOnline = Boolean(profile?.isOnline || profile?.is_online);
  const isStudying = Boolean(profile?.isStudying || profile?.is_studying);

  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        <img src={src} alt="" className={`${sizes[size]} shrink-0 rounded-full border border-border object-cover`} />
      ) : (
        <div className={`${sizes[size]} grid shrink-0 place-items-center rounded-full bg-primary/20 font-semibold text-primary`}>
          {profileInitial(profile)}
        </div>
      )}
      {showOnline && isOnline && (
        <span
          className={`absolute ${dotSizes[size]} flex items-center justify-center pointer-events-none`}
          title={isStudying ? 'آنلاین (در حال مطالعه)' : 'آنلاین'}
        >
          <span className={`animate-ping absolute inline-flex ${pingSizes[size]} rounded-full bg-emerald-400 opacity-75`} />
          <span className={`relative inline-flex rounded-full ${pingSizes[size]} bg-emerald-500 border-2 border-surface shadow-sm`} />
        </span>
      )}
    </div>
  );
}

function formatMessageTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}

function appendMessage(messages, message) {
  return messages.some(item => item.id === message.id) ? messages : [...messages, message];
}

function UserStats({ profile, compact = false }) {
  return (
    <div className={`grid ${compact ? 'grid-cols-3 gap-2 text-xs' : 'grid-cols-3 gap-3 text-sm'} text-text-muted`}>
      <div><p className="font-semibold text-text">{Number(profile.totalXp || 0).toLocaleString()}</p><p>total XP</p></div>
      <div><p className="font-semibold text-text">{profile.currentStreak || 0}</p><p>day streak</p></div>
      <div><p className="font-semibold text-text">Lv. {profile.level || 1}</p><p>level</p></div>
    </div>
  );
}

export default function Community() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('discover');
  const [directory, setDirectory] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [league, setLeague] = useState(null);
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeChat, setActiveChat] = useState({ type: 'league' });
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState(() => new Set());
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const messagesEndRef = useRef(null);
  const hasLoadedLeague = useRef(false);
  const hasLoadedConversations = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => {
    if (activeTab === 'messages') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const loadDirectory = useCallback(async (query = '', pageNum = 1) => {
    setDirectoryLoading(true);
    try {
      const result = await socialApi.discover({ search: query || undefined, page: pageNum, limit: 12 });
      const people = Array.isArray(result.data) ? result.data : (result.data?.profiles || []);
      const pageMeta = result.pagination || result.data?.pagination || {
        page: pageNum,
        limit: 12,
        total: people.length,
        totalPages: Math.ceil(people.length / 12) || 1,
        hasMore: false,
      };
      setDirectory(people);
      setPagination(pageMeta);
      setPage(pageMeta.page);
      setFollowingIds(new Set(people.filter(person => person.isFollowing).map(person => person.id)));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDirectoryLoading(false);
    }
  }, [toast]);

  const loadLeague = useCallback(async () => {
    setLeagueLoading(true);
    try {
      const result = await socialApi.getLeague();
      setLeague(result.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLeagueLoading(false);
    }
  }, [toast]);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const result = await socialApi.getConversations();
      setConversations(result.data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setConversationsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'discover') {
      loadDirectory(search, page);
    } else if (activeTab === 'league' && !hasLoadedLeague.current) {
      loadLeague().then(() => { hasLoadedLeague.current = true; });
    } else if (activeTab === 'messages' && !hasLoadedConversations.current) {
      loadConversations().then(() => { hasLoadedConversations.current = true; });
    }
  }, [activeTab, loadDirectory, loadLeague, loadConversations, page, search]);

  useEffect(() => {
    const token = localStorage.getItem('devtracker-auth-token');
    if (!token) return undefined;
    const socket = io(socketUrl, { auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:message', (message) => {
      if (activeChatRef.current.type === 'direct' && activeChatRef.current.id === message.conversationId) {
        setMessages(current => appendMessage(current, message));
      }
      loadConversations();
    });
    socket.on('league:message', (message) => {
      if (activeChatRef.current.type === 'league' && message.leagueId === league?.league?.id) {
        setMessages(current => appendMessage(current, message));
      }
    });
    return () => socket.disconnect();
  }, [league?.league?.id, loadConversations]);

  useEffect(() => {
    if (!league?.league?.id || !socketRef.current?.connected) return;
    socketRef.current.emit('league:subscribe', league.league.id);
  }, [league?.league?.id, connected]);

  useEffect(() => {
    let active = true;
    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const result = activeChat.type === 'league'
          ? await socialApi.getLeagueMessages()
          : await socialApi.getDirectMessages(activeChat.id);
        if (active) setMessages(result.data?.messages || []);
        if (activeChat.type === 'direct') loadConversations();
      } catch (error) {
        if (active) toast.error(error.message);
      } finally {
        if (active) setMessagesLoading(false);
      }
    };
    loadMessages();
    return () => { active = false; };
  }, [activeChat, loadConversations, toast]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    loadDirectory(search, 1);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    loadDirectory('', 1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === page) return;
    setPage(newPage);
    loadDirectory(search, newPage);
  };

  const openProfile = async (userId) => {
    setProfileLoading(true);
    setSelectedProfile(null);
    try {
      const result = await socialApi.getProfile(userId);
      setSelectedProfile(result.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const updateFollowState = (profile) => {
    setFollowingIds(current => {
      const next = new Set(current);
      if (profile.isFollowing) next.add(profile.id); else next.delete(profile.id);
      return next;
    });
    setDirectory(current => current.map(person => person.id === profile.id ? { ...person, ...profile } : person));
    setSelectedProfile(current => current?.id === profile.id ? profile : current);
  };

  const toggleFollow = async (profile) => {
    try {
      const result = followingIds.has(profile.id)
        ? await socialApi.unfollow(profile.id)
        : await socialApi.follow(profile.id);
      updateFollowState(result.data);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const startDirectMessage = async (profile) => {
    try {
      const result = await socialApi.createConversation(profile.id);
      const conversation = result.data;
      await loadConversations();
      setActiveChat({ type: 'direct', id: conversation.id, otherUser: conversation.otherUser });
      setActiveTab('messages');
      setSelectedProfile(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = messageBody.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const result = activeChat.type === 'league'
        ? await socialApi.sendLeagueMessage(body)
        : await socialApi.sendDirectMessage(activeChat.id, body);
      const message = result.data?.message;
      if (message) setMessages(current => appendMessage(current, message));
      setMessageBody('');
      if (activeChat.type === 'direct') loadConversations();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const activeConversation = activeChat.type === 'direct'
    ? conversations.find(conversation => conversation.id === activeChat.id)
    : null;

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/20 via-surface-light to-surface p-5 sm:p-7">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent"><span className="h-2 w-2 rounded-full bg-accent" /> Learn together</div>
            <h1 className="text-2xl font-bold sm:text-3xl">Codelume Community</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-muted">Find focused developers, compete in a weekly league, and keep each other moving forward.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted"><span className={`h-2 w-2 rounded-full ${connected ? 'bg-accent' : 'bg-yellow-400'}`} /> {connected ? 'Realtime connected' : 'Connecting to chat…'}</div>
        </div>
      </header>

      <nav className="flex overflow-x-auto rounded-xl border border-border bg-surface-light p-1.5" aria-label="Community sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === id ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface-lighter hover:text-text'}`}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      {activeTab === 'discover' && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold">Meet fellow learners</h2>
                {pagination.total > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/25 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {pagination.total} developers
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-muted">Profiles show only the progress members choose to share publicly.</p>
            </div>
            <div className="flex items-center gap-2">
              <form className="flex w-full gap-2 sm:w-auto" onSubmit={handleSearch}>
                <label className="relative flex-1 sm:w-72">
                  <HiOutlineSearch className="pointer-events-none absolute left-3 top-2.5 text-text-muted" size={18} />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search name or username"
                    className="w-full rounded-lg border border-border bg-surface-light py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary/60"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      title="Clear search"
                      aria-label="Clear search"
                      className="absolute right-2.5 top-2.5 text-text-muted hover:text-text"
                    >
                      <HiOutlineX size={16} />
                    </button>
                  )}
                </label>
                <button type="submit" className="rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
                  Search
                </button>
              </form>
              <button
                type="button"
                onClick={() => loadDirectory(search, page)}
                disabled={directoryLoading}
                title="Refresh developers list"
                aria-label="Refresh developers list"
                className="p-2.5 rounded-lg border border-border bg-surface-light text-text-muted hover:text-text hover:bg-surface-lighter disabled:opacity-40 transition-colors"
              >
                <HiOutlineRefresh size={18} className={directoryLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {directoryLoading ? (
            <LoadingSpinner />
          ) : directory.length === 0 ? (
            <Card className="py-12 text-center">
              <HiOutlineUsers className="mx-auto mb-3 text-text-muted" size={32} />
              <h3 className="font-semibold">No profiles found</h3>
              <p className="mt-1 text-sm text-text-muted">
                {search ? `No profiles match "${search}".` : 'Try inviting study partners or join the conversation.'}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/30 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/25 transition-colors"
                >
                  <HiOutlineX size={14} /> Clear search
                </button>
              )}
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {directory.map(profile => {
                  const isFollowing = followingIds.has(profile.id);
                  return (
                    <Card key={profile.id} hover className="flex flex-col gap-4">
                      <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => openProfile(profile.id)}>
                        <Avatar profile={profile} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-text">{profile.displayName}</p>
                            {profile.isOnline && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {profile.isStudying ? 'در حال مطالعه' : 'آنلاین'}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-text-muted">@{profile.username}</p>
                        </div>
                      </button>
                      <p className="min-h-10 text-sm text-text-muted line-clamp-2">{profile.bio || 'Building a consistent programming practice.'}</p>
                      <UserStats profile={profile} compact />
                      <div className="mt-auto flex gap-2">
                        <button type="button" onClick={() => openProfile(profile.id)} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text transition-colors hover:border-primary/50 hover:bg-surface-lighter">
                          View profile
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFollow(profile)}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                            isFollowing ? 'border border-border text-text-muted hover:border-red-400/50 hover:text-red-400' : 'bg-primary text-white hover:bg-primary-dark'
                          }`}
                        >
                          {isFollowing ? <HiOutlineUserRemove size={15} /> : <HiOutlineUserAdd size={15} />}
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
                  <p className="text-xs text-text-muted">
                    Showing <span className="font-semibold text-text">{((page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-semibold text-text">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-semibold text-text">{pagination.total}</span> developers
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1 || directoryLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface-light text-xs font-medium text-text-muted hover:text-text hover:bg-surface-lighter disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <HiOutlineChevronLeft size={14} /> Prev
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                        .reduce((acc, p, index, arr) => {
                          if (index > 0 && p - arr[index - 1] > 1) {
                            acc.push({ type: 'ellipsis', key: `ellipsis-${p}` });
                          }
                          acc.push({ type: 'page', number: p, key: `page-${p}` });
                          return acc;
                        }, [])
                        .map(item => {
                          if (item.type === 'ellipsis') {
                            return <span key={item.key} className="px-1 text-xs text-text-muted">…</span>;
                          }
                          const isCurrent = item.number === page;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handlePageChange(item.number)}
                              disabled={directoryLoading}
                              className={`h-7 w-7 rounded-lg text-xs font-semibold transition-all ${
                                isCurrent
                                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                  : 'text-text-muted hover:text-text hover:bg-surface-lighter'
                              }`}
                            >
                              {item.number}
                            </button>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= pagination.totalPages || directoryLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface-light text-xs font-medium text-text-muted hover:text-text hover:bg-surface-lighter disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next <HiOutlineChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === 'league' && (
        <section className="space-y-5">
          {leagueLoading ? <LoadingSpinner /> : <>
            <Card className="overflow-hidden border-yellow-400/25 bg-gradient-to-r from-yellow-400/10 via-surface-light to-surface">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-yellow-400/15 text-yellow-400"><HiOutlineStar size={30} /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">{league?.league?.tier} league</p><h2 className="text-xl font-bold">Weekly League · Group {league?.league?.groupNumber}</h2><p className="mt-1 text-sm text-text-muted">{league?.league?.seasonStart && `${formatAfghanDate(league.league.seasonStart)} — ${formatAfghanDate(league.league.seasonEnd)}`} · up to {league?.league?.maxMembers} learners</p></div></div><button type="button" onClick={() => { setActiveChat({ type: 'league' }); setActiveTab('messages'); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"><HiOutlineChatAlt2 size={18} /> League lounge</button></div>
            </Card>
            <Card className="overflow-hidden p-0"><div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="font-semibold">This week&apos;s ranking</h2><p className="mt-1 text-sm text-text-muted">Earn XP through completed study sessions. Ties use streak, then total XP.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-surface-lighter/45 text-left text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-4 py-3 font-medium sm:px-5">Rank</th><th className="px-4 py-3 font-medium">Learner</th><th className="px-4 py-3 text-right font-medium">Week XP</th><th className="px-4 py-3 text-right font-medium">Streak</th><th className="px-4 py-3 text-right font-medium">Level</th></tr></thead><tbody>{(league?.leaderboard || []).map(member => <tr key={member.userId} className={`border-t border-border/70 ${member.isCurrentUser ? 'bg-primary/10' : 'hover:bg-surface-lighter/35'}`}><td className="px-4 py-3.5 font-semibold sm:px-5">{member.rank <= 3 ? <span className={member.rank === 1 ? 'text-yellow-400' : member.rank === 2 ? 'text-slate-300' : 'text-amber-600'}>#{member.rank}</span> : `#${member.rank}`}</td><td className="px-4 py-3.5"><button type="button" onClick={() => openProfile(member.userId)} className="flex items-center gap-2.5 text-left"><Avatar profile={member} size="sm" /><span><span className="block font-semibold text-text">{member.displayName}{member.isCurrentUser && <span className="ml-1.5 text-xs font-medium text-primary">You</span>}</span><span className="block text-xs text-text-muted">@{member.username}</span></span></button></td><td className="px-4 py-3.5 text-right font-semibold text-primary">{member.weeklyXp.toLocaleString()}</td><td className="px-4 py-3.5 text-right"><span className="inline-flex items-center gap-1"><HiOutlineFire className="text-orange-400" size={16} />{member.currentStreak}</span></td><td className="px-4 py-3.5 text-right text-text-muted">{member.level}</td></tr>)}</tbody></table></div></Card>
          </>}
        </section>
      )}

      {activeTab === 'messages' && (
        <section className="grid min-h-[600px] overflow-hidden rounded-xl border border-border bg-surface-light lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="border-b border-border lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-border px-4 py-4"><div><h2 className="font-semibold">Messages</h2><p className="text-xs text-text-muted">Private and league chat</p></div><span className={`h-2 w-2 rounded-full ${connected ? 'bg-accent' : 'bg-yellow-400'}`} /></div><div className="max-h-64 overflow-y-auto p-2 lg:max-h-[535px]"><button type="button" onClick={() => setActiveChat({ type: 'league' })} className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${activeChat.type === 'league' ? 'bg-primary/15 text-text' : 'hover:bg-surface-lighter'}`}><div className="grid h-10 w-10 place-items-center rounded-full bg-yellow-400/15 text-yellow-400"><HiOutlineStar size={19} /></div><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">League lounge</span><span className="block truncate text-xs text-text-muted">Group {league?.league?.groupNumber || '…'} discussion</span></span></button><p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Direct messages</p>{conversationsLoading ? <div className="py-5 text-center text-xs text-text-muted">Loading conversations…</div> : conversations.length === 0 ? <div className="px-2 py-4 text-xs text-text-muted">Open a public profile to start a conversation.</div> : conversations.map(conversation => <button key={conversation.id} type="button" onClick={() => setActiveChat({ type: 'direct', id: conversation.id, otherUser: conversation.otherUser })} className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${activeChat.type === 'direct' && activeChat.id === conversation.id ? 'bg-primary/15 text-text' : 'hover:bg-surface-lighter'}`}><Avatar profile={conversation.otherUser} size="sm" /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{conversation.otherUser.displayName}</span>{conversation.unreadCount > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</span>}</span><span className="block truncate text-xs text-text-muted">{conversation.lastMessage || 'Start the conversation'}</span></span></button>)}</div></aside>
          <div className="flex min-h-[450px] flex-col"><header className="flex items-center gap-3 border-b border-border px-4 py-3.5"><>{activeChat.type === 'league' ? <><div className="grid h-10 w-10 place-items-center rounded-full bg-yellow-400/15 text-yellow-400"><HiOutlineStar size={19} /></div><div><p className="font-semibold">League lounge</p><p className="text-xs text-text-muted">Only your weekly group can join</p></div></> : <><Avatar profile={activeConversation?.otherUser || activeChat.otherUser} size="sm" /><div><p className="font-semibold">{activeConversation?.otherUser?.displayName || activeChat.otherUser?.displayName}</p><p className="text-xs text-text-muted">Private conversation</p></div></>}</></header><div className="flex-1 space-y-3 overflow-y-auto p-4">{messagesLoading ? <LoadingSpinner /> : messages.length === 0 ? <div className="grid h-full min-h-52 place-items-center text-center"><div><HiOutlineChatAlt2 className="mx-auto mb-3 text-text-muted" size={30} /><p className="font-medium">No messages yet</p><p className="mt-1 text-sm text-text-muted">Start a thoughtful study conversation.</p></div></div> : messages.map(message => { const own = Number(message.sender?.id) === Number(user?.id); return <div key={message.id} className={`flex gap-2 ${own ? 'justify-end' : 'justify-start'}`}>{!own && <Avatar profile={message.sender} size="sm" />}<div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${own ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-surface-lighter text-text'}`}><p className={`mb-1 text-xs font-semibold ${own ? 'text-white/80' : 'text-text-muted'}`}>{own ? 'You' : message.sender?.displayName}</p><p className="whitespace-pre-wrap break-words">{message.body}</p><p className={`mt-1 text-right text-[10px] ${own ? 'text-white/65' : 'text-text-muted'}`}>{formatMessageTime(message.createdAt)}</p></div></div>; })}<div ref={messagesEndRef} /></div><form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3"><input value={messageBody} maxLength={1000} onChange={event => setMessageBody(event.target.value)} placeholder={activeChat.type === 'league' ? 'Share a study win with your league…' : 'Write a message…'} className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60" /><button type="submit" disabled={!messageBody.trim() || sending} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message"><HiOutlinePaperAirplane size={18} /></button></form></div>
        </section>
      )}

      <Modal isOpen={profileLoading || Boolean(selectedProfile)} onClose={() => { setSelectedProfile(null); setProfileLoading(false); }} title="Member profile" size="sm">
        {profileLoading ? <LoadingSpinner /> : selectedProfile && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar profile={selectedProfile} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-bold">{selectedProfile.displayName}</h2>
                  {selectedProfile.isOnline && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {selectedProfile.isStudying ? 'در حال مطالعه' : 'آنلاین'}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-text-muted">@{selectedProfile.username}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {selectedProfile.isOnline ? (
                    <span className="text-emerald-400 font-medium">همین الان آنلاین</span>
                  ) : (
                    `Joined ${formatAfghanDate(selectedProfile.joinedAt, { includeYear: true })}`
                  )}
                </p>
              </div>
            </div>
            <p className="rounded-lg bg-surface-lighter/70 p-3 text-sm text-text-muted">{selectedProfile.bio || 'This learner has not added a bio yet.'}</p>
            <UserStats profile={selectedProfile} />
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-center text-sm">
              <div><p className="font-semibold">{selectedProfile.followersCount}</p><p className="text-xs text-text-muted">followers</p></div>
              <div><p className="font-semibold">{selectedProfile.followingCount}</p><p className="text-xs text-text-muted">following</p></div>
            </div>
            {Number(selectedProfile.id) !== Number(user?.id) && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => toggleFollow(selectedProfile)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${followingIds.has(selectedProfile.id) ? 'border border-border text-text hover:border-red-400/50 hover:text-red-400' : 'bg-primary text-white hover:bg-primary-dark'}`}>
                  {followingIds.has(selectedProfile.id) ? <HiOutlineUserRemove size={17} /> : <HiOutlineUserAdd size={17} />}
                  {followingIds.has(selectedProfile.id) ? 'Following' : 'Follow'}
                </button>
                <button type="button" onClick={() => startDirectMessage(selectedProfile)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text hover:border-primary/50 hover:bg-surface-lighter">
                  <HiOutlineChatAlt2 size={17} /> Message
                </button>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <HiOutlineGlobeAlt size={15} /> Public progress profile <HiOutlineLockClosed size={14} className="ml-2" /> Email stays private
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
