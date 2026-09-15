import { Card } from '../components/ui';
import {
  HiOutlineCode, HiOutlineHeart, HiOutlineGlobe,
  HiOutlineSparkles, HiOutlineMail, HiOutlineExternalLink,
} from 'react-icons/hi';

const PHONE = '+93795571938';
const WHATSAPP_LINK = `https://wa.me/${PHONE.replace('+', '')}`;
const TELEGRAM_LINK = `https://t.me/${PHONE}`;

const techStack = [
  { name: 'React', color: '#61DAFB' },
  { name: 'Vite', color: '#646CFF' },
  { name: 'Node.js', color: '#68A063' },
  { name: 'Tailwind CSS', color: '#38BDF8' },
  { name: 'MySQL', color: '#00758F' },
  { name: 'Cloudinary', color: '#F38020' },
];

export default function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-7">
      {/* Page Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>About Codelume</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Meet the Developer</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">
          The story behind Codelume and how to get in touch
        </p>
      </div>

      {/* Developer Card */}
      <Card className="relative overflow-hidden p-0 animate-fade-in stagger-1" style={{ animationFillMode: 'forwards' }}>
        {/* Decorative gradient stripe */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-600/25 via-violet-600/15 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/70 to-transparent" />

        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 p-[3px] shadow-2xl shadow-indigo-500/20 ring-1 ring-indigo-500/20">
              <div className="h-full w-full rounded-[13px] bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center overflow-hidden">
                <span className="text-4xl font-black text-white/90 select-none">ST</span>
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white text-xs ring-4 ring-surface shadow-lg shadow-emerald-500/30">
              ✓
            </span>
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1 min-w-0 space-y-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Sayed Tayeb Puya</h2>
              <p className="text-text-muted text-sm font-medium mt-0.5">Full-Stack Developer & Creator of Codelume</p>
            </div>

            <p className="text-text-muted text-xs leading-relaxed max-w-md">
              Passionate about building tools that help developers track their growth, stay motivated, and reach their full potential. Codelume is crafted with love from Afghanistan 🇦🇫.
            </p>

            {/* Contact Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 hover:border-emerald-500/50 px-4 py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
                <HiOutlineExternalLink size={13} className="opacity-50" />
              </a>

              <a
                href={TELEGRAM_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/25 hover:border-sky-500/50 px-4 py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/10 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram
                <HiOutlineExternalLink size={13} className="opacity-50" />
              </a>
            </div>

            {/* Phone display */}
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <HiOutlineMail size={14} className="text-text-muted" />
              <span className="text-xs text-text-muted font-mono tracking-wide select-all">{PHONE}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* About Codelume */}
      <Card className="space-y-5 p-6 animate-fade-in stagger-2" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
            <HiOutlineCode size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">About Codelume</h2>
            <p className="text-xs text-text-muted">Your personal developer growth companion</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-text-muted leading-relaxed">
          <p>
            <span className="gradient-text font-bold">Codelume</span> is a comprehensive developer productivity platform designed to help you track your coding journey. Whether you're learning new technologies, working on side projects, or perfecting your craft — Codelume helps you visualize your progress and stay consistent.
          </p>
          <p>
            With features like a Pomodoro timer, contribution calendar, technology tracking, challenges, achievements, and a community system — everything you need to <span className="text-text font-semibold">build your momentum</span> is right here.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {[
            { icon: '⏱️', label: 'Smart Timer' },
            { icon: '📊', label: 'Analytics' },
            { icon: '🏆', label: 'Achievements' },
            { icon: '📅', label: 'Calendar View' },
            { icon: '🎵', label: 'Focus Music' },
            { icon: '👥', label: 'Community' },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-lighter/40 border border-border/40 text-xs font-semibold text-text-muted"
            >
              <span className="text-base">{feature.icon}</span>
              {feature.label}
            </div>
          ))}
        </div>
      </Card>

      {/* Tech Stack */}
      <Card className="space-y-5 p-6 animate-fade-in stagger-3" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400">
            <HiOutlineGlobe size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">Built With</h2>
            <p className="text-xs text-text-muted">Technologies powering Codelume</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {techStack.map((tech) => (
            <span
              key={tech.name}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold border transition-all duration-200 hover:scale-[1.04]"
              style={{
                borderColor: `${tech.color}33`,
                background: `linear-gradient(135deg, ${tech.color}12, ${tech.color}06)`,
                color: tech.color,
              }}
            >
              <span
                className="h-2 w-2 rounded-full shadow-lg"
                style={{ backgroundColor: tech.color, boxShadow: `0 0 8px ${tech.color}66` }}
              />
              {tech.name}
            </span>
          ))}
        </div>
      </Card>

      {/* Footer / Version */}
      <Card className="p-5 animate-fade-in stagger-4" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/30">
              <img src="/codeora-mark.svg" alt="Codelume" className="h-5 w-5 drop-shadow" />
            </div>
            <div>
              <p className="font-bold text-text text-sm">Codelume</p>
              <p className="text-[10px] text-text-muted">Build your momentum</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-center sm:text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted/70">Version</p>
              <p className="font-bold text-text">1.0.0</p>
            </div>
            <div className="h-6 w-px bg-border/60" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted/70">Released</p>
              <p className="font-bold text-text">2026/9/1</p>
            </div>
            <div className="h-6 w-px bg-border/60" />
            <div className="flex items-center gap-1">
              <p className="text-[10px]">Made with</p>
              <HiOutlineHeart size={13} className="text-red-400 animate-pulse" />
              <p className="text-[10px]">in Afghanistan</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
