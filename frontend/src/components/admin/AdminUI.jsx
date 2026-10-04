import { PiSparkleDuotone, PiStackDuotone } from 'react-icons/pi';
import { formatAdminNumber } from '../../utils/adminFormat';

export function AdminPageHeader({ eyebrow, title, description, actions, children, className = '' }) {
  return <section className={`admin-page-header ${className}`}>
    <div className="admin-page-heading">
      <span className="admin-eyebrow"><PiSparkleDuotone size={18} aria-hidden="true" />{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
    {actions && <div className="admin-page-actions">{actions}</div>}
  </section>;
}

export function AdminMetricCard({ icon: Icon, label, value, unit, detail, tone = 'violet' }) {
  return <article className={`admin-metric admin-tone-${tone}`}>
    <div className="admin-metric-top"><span>{label}</span><span className="admin-metric-icon"><Icon size={28} aria-hidden="true" /></span></div>
    <div className="admin-metric-value"><strong>{formatAdminNumber(value)}</strong>{unit && <span>{unit}</span>}</div>
    {detail && <div className="admin-metric-detail">{detail}</div>}
  </article>;
}

export function AdminPanel({ icon: Icon, title, description, action, children, className = '', id }) {
  return <section className={`admin-panel ${className}`} aria-labelledby={id}>
    <div className="admin-panel-heading"><div className="admin-panel-title">{Icon && <span className="admin-panel-icon"><Icon size={25} aria-hidden="true" /></span>}<div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div></div>{action}</div>
    {children}
  </section>;
}

export function AdminEmptyState({ title, description, icon: Icon = PiStackDuotone, children }) {
  return <div className="admin-empty"><span className="admin-empty-icon"><Icon size={32} aria-hidden="true" /></span><p className="admin-empty-title">{title}</p>{description && <p>{description}</p>}{children}</div>;
}

export function AdminLoading({ label }) {
  return <div className="admin-loading" role="status"><span className="admin-loading-orbit"><PiSparkleDuotone aria-hidden="true" size={24} /></span><p>{label}</p><span className="admin-loading-line" /></div>;
}
