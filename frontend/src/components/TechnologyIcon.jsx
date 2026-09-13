import {
  HiOutlineCloud, HiOutlineCode, HiOutlineCollection, HiOutlineDatabase,
  HiOutlineDesktopComputer, HiOutlineFolder, HiOutlinePhotograph,
  HiOutlinePuzzle, HiOutlineServer, HiOutlineTerminal,
} from 'react-icons/hi';
import {
  SiAngular, SiAstro, SiBootstrap, SiClaude, SiCss, SiDjango, SiDocker,
  SiElementor, SiExpress, SiFastapi, SiFigma, SiFirebase, SiFlask, SiGit,
  SiGithub, SiGitlab, SiGo, SiGraphql, SiHtml5, SiJavascript, SiJest,
  SiLaravel, SiMongodb, SiMysql, SiN8N, SiNestjs, SiNextdotjs, SiNodedotjs,
  SiNpm, SiNuxt, SiPhp, SiPostgresql, SiPostman, SiPrisma, SiPython,
  SiReact, SiRedis, SiRedux, SiRust, SiSass, SiSupabase, SiSvelte,
  SiTailwindcss, SiTerraform, SiTypescript, SiVercel, SiVite, SiVitest,
  SiVuedotjs, SiWebpack, SiWordpress,
} from 'react-icons/si';

const iconMap = {
  react: SiReact,
  next: SiNextdotjs,
  nextjs: SiNextdotjs,
  node: SiNodedotjs,
  nodejs: SiNodedotjs,
  express: SiExpress,
  tailwind: SiTailwindcss,
  tailwindcss: SiTailwindcss,
  typescript: SiTypescript,
  javascript: SiJavascript,
  js: SiJavascript,
  python: SiPython,
  html: SiHtml5,
  css: SiCss,
  bootstrap: SiBootstrap,
  redux: SiRedux,
  mongodb: SiMongodb,
  mysql: SiMysql,
  postgresql: SiPostgresql,
  database: SiPostgresql,
  git: SiGit,
  docker: SiDocker,
  figma: SiFigma,
  vue: SiVuedotjs,
  angular: SiAngular,
  laravel: SiLaravel,
  php: SiPhp,
  wordpress: SiWordpress,
  elementor: SiElementor,
  n8n: SiN8N,
  claude: SiClaude,
  claudeai: SiClaude,
  astro: SiAstro,
  django: SiDjango,
  flask: SiFlask,
  fastapi: SiFastapi,
  nest: SiNestjs,
  nestjs: SiNestjs,
  nuxt: SiNuxt,
  svelte: SiSvelte,
  vite: SiVite,
  webpack: SiWebpack,
  vercel: SiVercel,
  graphql: SiGraphql,
  prisma: SiPrisma,
  supabase: SiSupabase,
  firebase: SiFirebase,
  redis: SiRedis,
  github: SiGithub,
  gitlab: SiGitlab,
  npm: SiNpm,
  postman: SiPostman,
  jest: SiJest,
  vitest: SiVitest,
  sass: SiSass,
  go: SiGo,
  golang: SiGo,
  rust: SiRust,
  terraform: SiTerraform,
};

const normalise = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function getTechnologyIcon(technology) {
  const iconKey = normalise(technology.icon);
  const nameKey = normalise(technology.name);
  const match = Object.keys(iconMap)
    .sort((a, b) => b.length - a.length)
    .find(key => iconKey === key || nameKey === key || iconKey.includes(key) || nameKey.includes(key));
  return match ? iconMap[match] : HiOutlineCode;
}

export default function TechnologyIcon({ technology, size = 24, className = '' }) {
  if (technology.custom_icon) {
    return <img src={technology.custom_icon} alt={`${technology.name} icon`} className={`h-full w-full object-cover ${className}`} />;
  }

  const Icon = getTechnologyIcon(technology);
  return <Icon size={size} aria-hidden="true" className={className} />;
}

const folderIconMap = [
  { keywords: ['frontend', 'web', 'ui', 'ux', 'design', 'wordpress', 'elementor'], icon: HiOutlineDesktopComputer },
  { keywords: ['backend', 'server', 'api', 'laravel', 'php', 'node', 'express', 'django', 'flask', 'fastapi', 'nestjs'], icon: HiOutlineServer },
  { keywords: ['database', 'data', 'sql', 'mongo', 'postgres', 'mysql', 'redis', 'prisma', 'supabase'], icon: HiOutlineDatabase },
  { keywords: ['devops', 'cloud', 'docker', 'deploy', 'ci', 'terraform', 'aws', 'hosting'], icon: HiOutlineCloud },
  { keywords: ['automation', 'workflow', 'n8n'], icon: HiOutlineCollection },
  { keywords: ['ai', 'artificial intelligence', 'claude', 'machine learning', 'ml'], icon: HiOutlinePuzzle },
  { keywords: ['mobile', 'app', 'android', 'ios'], icon: HiOutlinePhotograph },
  { keywords: ['terminal', 'cli', 'linux', 'git', 'tools'], icon: HiOutlineTerminal },
  { keywords: ['programming', 'code', 'language', 'dsa', 'algorithm'], icon: HiOutlineCode },
];

export function FolderContentIcon({ folder, size = 37, className = '' }) {
  const searchableContent = [folder?.name, ...(folder?.technologies || []).flatMap(technology => [technology.name, technology.icon])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const match = folderIconMap.find(({ keywords }) => keywords.some(keyword => searchableContent.includes(keyword)));
  const Icon = match?.icon || HiOutlineFolder;

  return <Icon size={size} aria-hidden="true" className={className} />;
}
