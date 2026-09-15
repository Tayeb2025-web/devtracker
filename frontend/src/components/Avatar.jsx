import { useState } from 'react';
import { resolveAvatarUrl } from '../constants/avatars';

function profileInitial(profile) {
  return (profile?.displayName || profile?.display_name || profile?.username || '?').trim().charAt(0).toUpperCase();
}

export default function Avatar({
  profile,
  size = 'md',
  showOnline = true,
  className = '',
  seed = '',
}) {
  const [loadError, setLoadError] = useState(false);

  const sizes = {
    xs: 'h-7 w-7 text-xs',
    sm: 'h-9 w-9 text-sm',
    md: 'h-11 w-11 text-base',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
  };

  const dotSizes = {
    xs: 'h-2 w-2 -bottom-0.5 -right-0.5',
    sm: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
    md: 'h-3.5 w-3.5 -bottom-0.5 -right-0.5',
    lg: 'h-4 w-4 bottom-0.5 right-0.5',
    xl: 'h-5 w-5 bottom-1 right-1',
  };

  const pingSizes = {
    xs: 'h-2 w-2',
    sm: 'h-2.5 w-2.5',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5',
  };

  const rawUrl = profile?.avatarUrl || profile?.avatar_url || profile?.avatar;
  const userSeed = seed || profile?.username || profile?.displayName || profile?.id || '';
  const resolvedSrc = loadError ? resolveAvatarUrl('', userSeed) : resolveAvatarUrl(rawUrl, userSeed);

  const isOnline = Boolean(profile?.isOnline || profile?.is_online);
  const isStudying = Boolean(profile?.isStudying || profile?.is_studying);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <img
        src={resolvedSrc}
        alt={profile?.displayName || profile?.username || 'User'}
        onError={() => setLoadError(true)}
        className={`${sizes[size] || sizes.md} shrink-0 rounded-full border border-border/80 object-cover bg-surface shadow-sm`}
      />
      {showOnline && isOnline && (
        <span
          className={`absolute ${dotSizes[size] || dotSizes.md} flex items-center justify-center pointer-events-none`}
          title={isStudying ? 'آنلاین (در حال مطالعه)' : 'آنلاین'}
        >
          <span className={`animate-ping absolute inline-flex ${pingSizes[size] || pingSizes.md} rounded-full bg-emerald-400 opacity-75`} />
          <span className={`relative inline-flex rounded-full ${pingSizes[size] || pingSizes.md} bg-emerald-500 border-2 border-surface shadow-sm`} />
        </span>
      )}
    </div>
  );
}
