import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  HiOutlineChatAlt2,
  HiOutlineFire,
  HiOutlineGlobeAlt,
  HiOutlineLockClosed,
  HiOutlinePaperAirplane,
  HiOutlineSearch,
  HiOutlineStar,
  HiOutlineUserAdd,
  HiOutlineUserRemove,
  HiOutlineUsers,
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

function Avatar({ profile, size = 'md' }) {
  const sizes = { sm: 'h-9 w-9 text-sm', md: 'h-11 w-11 text-base', lg: 'h-16 w-16 text-xl' };
  const src = profile?.avatarUrl || profile?.avatar_url;
  if (src) return <img src={src} alt="" className={`${sizes[size]} shrink-0 rounded-full border border-border object-cover`} />;
  return <div className={`${sizes[size]} grid shrink-0 place-items-center rounded-full bg-primary/20 font-semibold text-primary`}>{profileInitial(profile)}</div>;
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => {
    if (activeTab === 'messages') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const loadDirectory = useCallback(async (query = '') => {
    if (!user) {
      setDirectory([]);
      setDirectoryLoading(false);
      return;
    }
    setDirectoryLoading(true);
    try {
      const result = await socialApi.discover({ search: query || undefined });
      const people = result.data || [];
      setDirectory(people);
      setFollowingIds(new Set(people.filter(person => person.isFollowing).map(person => person.id)));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDirectoryLoading(false);
    }
  }, [user, toast]);

  const loadLeague = useCallback(async () => {
    if (!user) {
      setLeague(null);
      setLeagueLoading(false);
      return;
    }
    setLeagueLoading(true);
    try {
      const result = await socialApi.getLeague();
      setLeague(result.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLeagueLoading(false);
    }
  }, [user, toast]);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setConversationsLoading(false);
      return;
    }
    setConversationsLoading(true);
    try {
      const result = await socialApi.getConversations();
      setConversations(result.data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setConversationsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadDirectory();
    loadLeague();
    loadConversations();
  }, [loadDirectory, loadLeague, loadConversations]);

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
    loadDirectory(search);
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
    if (!user) {
      toast.info('برای دنبال کردن سایر برنامه‌نویسان لطفاً وارد حساب خود شوید.');
      return;
    }
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
    if (!user) {
      toast.info('برای ارسال پیام به سایر کاربران لطفاً وارد حساب خود شوید.');
      return;
    }
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
    if (!user) {
      toast.info('برای ارسال پیام در چت جامعه لطفاً وارد حساب خود شوید.');
      return;
    }
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

      {/* Guest Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 p-4 text-xs text-indigo-300 animate-fade-in text-center sm:text-right" dir="rtl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span>جامعه برنامه‌نویسان در حالت مهمان در دسترس نیست. برای رقابت در لیگ‌های هفتگی، چت زنده و دنبال کردن دیگران وارد شوید.</span>
          </div>
          <Link
            to="/login"
            className="shrink-0 font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
          >
            ورود / ثبت‌نام
          </Link>
        </div>
      )}

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
            <div><h2 className="text-lg font-semibold">Meet fellow learners</h2><p className="mt-1 text-sm text-text-muted">Profiles show only the progress members choose to share publicly.</p></div>
            <form className="flex w-full gap-2 sm:w-auto" onSubmit={handleSearch}>
              <label className="relative flex-1 sm:w-72"><HiOutlineSearch className="pointer-events-none absolute left-3 top-2.5 text-text-muted" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or username" className="w-full rounded-lg border border-border bg-surface-light py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/60" /></label>
              <button type="submit" className="rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark">Search</button>
            </form>
          </div>
          {directoryLoading ? <LoadingSpinner /> : directory.length === 0 ? (
            <Card className="py-12 text-center"><HiOutlineUsers className="mx-auto mb-3 text-text-muted" size={32} /><h3 className="font-semibold">No profiles found</h3><p className="mt-1 text-sm text-text-muted">Try a different search or invite a study partner.</p></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {directory.map(profile => {
                const isFollowing = followingIds.has(profile.id);
                return <Card key={profile.id} hover className="flex flex-col gap-4"><button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => openProfile(profile.id)}><Avatar profile={profile} /><div className="min-w-0"><p className="truncate font-semibold text-text">{profile.displayName}</p><p className="truncate text-xs text-text-muted">@{profile.username}</p></div></button><p className="min-h-10 text-sm text-text-muted">{profile.bio || 'Building a consistent programming practice.'}</p><UserStats profile={profile} compact /><div className="mt-auto flex gap-2"><button type="button" onClick={() => openProfile(profile.id)} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text transition-colors hover:border-primary/50 hover:bg-surface-lighter">View profile</button><button type="button" onClick={() => toggleFollow(profile)} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isFollowing ? 'border border-border text-text-muted hover:border-red-400/50 hover:text-red-400' : 'bg-primary text-white hover:bg-primary-dark'}`}>{isFollowing ? <HiOutlineUserRemove size={15} /> : <HiOutlineUserAdd size={15} />}{isFollowing ? 'Following' : 'Follow'}</button></div></Card>;
              })}
            </div>
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
        {profileLoading ? <LoadingSpinner /> : selectedProfile && <div className="space-y-5"><div className="flex items-center gap-4"><Avatar profile={selectedProfile} size="lg" /><div className="min-w-0"><h2 className="truncate text-xl font-bold">{selectedProfile.displayName}</h2><p className="truncate text-sm text-text-muted">@{selectedProfile.username}</p><p className="mt-1 text-xs text-text-muted">Joined {formatAfghanDate(selectedProfile.joinedAt, { includeYear: true })}</p></div></div><p className="rounded-lg bg-surface-lighter/70 p-3 text-sm text-text-muted">{selectedProfile.bio || 'This learner has not added a bio yet.'}</p><UserStats profile={selectedProfile} /><div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-center text-sm"><div><p className="font-semibold">{selectedProfile.followersCount}</p><p className="text-xs text-text-muted">followers</p></div><div><p className="font-semibold">{selectedProfile.followingCount}</p><p className="text-xs text-text-muted">following</p></div></div>{Number(selectedProfile.id) !== Number(user?.id) && <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => toggleFollow(selectedProfile)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${followingIds.has(selectedProfile.id) ? 'border border-border text-text hover:border-red-400/50 hover:text-red-400' : 'bg-primary text-white hover:bg-primary-dark'}`}>{followingIds.has(selectedProfile.id) ? <HiOutlineUserRemove size={17} /> : <HiOutlineUserAdd size={17} />}{followingIds.has(selectedProfile.id) ? 'Following' : 'Follow'}</button><button type="button" onClick={() => startDirectMessage(selectedProfile)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text hover:border-primary/50 hover:bg-surface-lighter"><HiOutlineChatAlt2 size={17} /> Message</button></div>}<div className="flex items-center justify-center gap-2 text-xs text-text-muted"><HiOutlineGlobeAlt size={15} /> Public progress profile <HiOutlineLockClosed size={14} className="ml-2" /> Email stays private</div></div>}
      </Modal>
    </div>
  );
}
