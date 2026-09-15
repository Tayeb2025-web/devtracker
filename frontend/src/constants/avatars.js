export const DEFAULT_AVATARS = [
  {
    id: 'cyber-hacker',
    name: 'Cyber Hacker',
    nameFa: 'هکر سایبری',
    path: '/assets/avatars/cyber-hacker.svg',
    category: 'Cyber',
    color: '#0284c7',
  },
  {
    id: 'neon-ninja',
    name: 'Neon Ninja',
    nameFa: 'نینجای نئونی',
    path: '/assets/avatars/neon-ninja.svg',
    category: 'Cyber',
    color: '#9333ea',
  },
  {
    id: 'tech-wizard',
    name: 'Tech Wizard',
    nameFa: 'جادوگر تکنولوژی',
    path: '/assets/avatars/tech-wizard.svg',
    category: 'Fantasy',
    color: '#059669',
  },
  {
    id: 'pixel-cat',
    name: 'Pixel Cat',
    nameFa: 'گربه کدنویس',
    path: '/assets/avatars/pixel-cat.svg',
    category: 'Animals',
    color: '#f43f5e',
  },
  {
    id: 'space-astronaut',
    name: 'Space Astronaut',
    nameFa: 'فضانورد کیهانی',
    path: '/assets/avatars/space-astronaut.svg',
    category: 'Sci-Fi',
    color: '#818cf8',
  },
  {
    id: 'ai-robot',
    name: 'AI Robot',
    nameFa: 'ربات هوش مصنوعی',
    path: '/assets/avatars/ai-robot.svg',
    category: 'Sci-Fi',
    color: '#14b8a6',
  },
  {
    id: 'dragon-coder',
    name: 'Dragon Coder',
    nameFa: 'اژدهای کدزن',
    path: '/assets/avatars/dragon-coder.svg',
    category: 'Fantasy',
    color: '#dc2626',
  },
  {
    id: 'falcon-dev',
    name: 'Falcon Dev',
    nameFa: 'شاهین تیزبین',
    path: '/assets/avatars/falcon-dev.svg',
    category: 'Animals',
    color: '#d97706',
  },
  {
    id: 'coffee-coder',
    name: 'Coffee Coder',
    nameFa: 'برنامه‌نویس قهوه‌خور',
    path: '/assets/avatars/coffee-coder.svg',
    category: 'Dev',
    color: '#b45309',
  },
  {
    id: 'ghost-dev',
    name: 'Ghost Dev',
    nameFa: 'روح بامزه کدنویس',
    path: '/assets/avatars/ghost-dev.svg',
    category: 'Fantasy',
    color: '#6366f1',
  },
  {
    id: 'samurai-dev',
    name: 'Samurai Dev',
    nameFa: 'سامورایی لینوکس',
    path: '/assets/avatars/samurai-dev.svg',
    category: 'Cyber',
    color: '#ef4444',
  },
  {
    id: 'cosmic-alien',
    name: 'Cosmic Alien',
    nameFa: 'موجود فضایی الگوریتم',
    path: '/assets/avatars/cosmic-alien.svg',
    category: 'Sci-Fi',
    color: '#10b981',
  },
  {
    id: 'phoenix-hacker',
    name: 'Phoenix Hacker',
    nameFa: 'ققنوس دیباگر',
    path: '/assets/avatars/phoenix-hacker.svg',
    category: 'Fantasy',
    color: '#ea580c',
  },
  {
    id: 'viking-coder',
    name: 'Viking Coder',
    nameFa: 'وایکینگ کدنویس',
    path: '/assets/avatars/viking-coder.svg',
    category: 'Fantasy',
    color: '#64748b',
  },
  {
    id: 'synthwave-pilot',
    name: 'Synthwave Pilot',
    nameFa: 'خلبان سینت‌ویو',
    path: '/assets/avatars/synthwave-pilot.svg',
    category: 'Retro',
    color: '#ec4899',
  },
  {
    id: 'matrix-explorer',
    name: 'Matrix Explorer',
    nameFa: 'کاوشگر ماتریکس',
    path: '/assets/avatars/matrix-explorer.svg',
    category: 'Cyber',
    color: '#22c55e',
  },
  {
    id: 'neon-dev',
    name: 'Neon Dev',
    nameFa: 'توسعه‌دهنده نئونی',
    path: '/assets/avatars/neon-dev.svg',
    category: 'Cyber',
    color: '#a855f7',
  },
  {
    id: 'code-panda',
    name: 'Code Panda',
    nameFa: 'پاندای برنامه‌نویس',
    path: '/assets/avatars/code-panda.svg',
    category: 'Animals',
    color: '#0f766e',
  },
  {
    id: 'owl-architect',
    name: 'Owl Architect',
    nameFa: 'جغد معمار نرم‌افزار',
    path: '/assets/avatars/owl-architect.svg',
    category: 'Animals',
    color: '#4338ca',
  },
  {
    id: 'fox-hacker',
    name: 'Fox Hacker',
    nameFa: 'روباه باهوش کدر',
    path: '/assets/avatars/fox-hacker.svg',
    category: 'Animals',
    color: '#c2410c',
  },
];

/**
 * Deterministically pick an avatar based on any seed string (username, ID, email).
 * Ensures identical user always gets the exact same avatar.
 */
export function getDefaultAvatar(seed = '') {
  if (!seed) return DEFAULT_AVATARS[0].path;
  let hash = 0;
  const str = String(seed).trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index].path;
}

/**
 * Checks if avatar is a custom user-uploaded image (e.g. Cloudinary, full URL)
 */
export function isCustomAvatar(url) {
  if (!url || typeof url !== 'string') return false;
  if (url === '/images/profile.jpg' || url.startsWith('/assets/avatars/')) return false;
  return /^https?:\/\//i.test(url);
}

/**
 * Resolves avatar URL, falling back to a deterministic cool avatar if missing or deprecated.
 */
export function resolveAvatarUrl(url, seed = '') {
  if (url && typeof url === 'string' && url !== '/images/profile.jpg') {
    return url;
  }
  return getDefaultAvatar(seed);
}
