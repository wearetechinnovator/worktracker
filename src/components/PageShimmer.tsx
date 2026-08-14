type ShimmerVariant = 'dashboard' | 'table' | 'tasks' | 'settings' | 'punch' | 'project' | 'compact';

function Block({ className }: { className: string }) {
  return <div className={`shimmer ${className}`} aria-hidden="true" />;
}

export default function PageShimmer({ variant = 'dashboard' }: { variant?: ShimmerVariant }) {
  if (variant === 'punch') {
    return <div className="shimmer-punch" aria-busy="true"><Block className="shimmer-punch__icon" /><Block className="shimmer-punch__title" /><Block className="shimmer-punch__text" /><Block className="shimmer-punch__button" /></div>;
  }
  if (variant === 'settings') {
    return <div className="shimmer-settings" aria-busy="true"><Block className="shimmer-heading" /><Block className="shimmer-copy" /><div className="shimmer-settings__panel">{[0, 1, 2, 3].map((item) => <div className="shimmer-settings__row" key={item}><Block className="shimmer-label" /><Block className="shimmer-input" /></div>)}</div></div>;
  }
  if (variant === 'tasks') {
    return <div className="shimmer-tasks" aria-busy="true"><div className="shimmer-header"><div><Block className="shimmer-heading" /><Block className="shimmer-copy" /></div><Block className="shimmer-action" /></div>{[0, 1, 2, 3].map((item) => <div className="shimmer-task" key={item}><Block className="shimmer-avatar" /><div><Block className="shimmer-task__title" /><Block className="shimmer-task__line" /></div><Block className="shimmer-badge" /></div>)}</div>;
  }
  if (variant === 'table') {
    return <div className="shimmer-table" aria-busy="true"><div className="shimmer-header"><div><Block className="shimmer-heading" /><Block className="shimmer-copy" /></div><Block className="shimmer-action" /></div><div className="shimmer-table__toolbar"><Block className="shimmer-search" /><Block className="shimmer-filter" /></div><div className="shimmer-table__panel">{[0, 1, 2, 3, 4, 5].map((item) => <div className="shimmer-table__row" key={item}><Block className="shimmer-avatar" /><Block className="shimmer-table__name" /><Block className="shimmer-table__cell" /><Block className="shimmer-badge" /></div>)}</div></div>;
  }
  if (variant === 'project') {
    return <div className="shimmer-project" aria-busy="true"><Block className="shimmer-breadcrumb" /><div className="shimmer-project__hero"><Block className="shimmer-heading" /><Block className="shimmer-copy" /><div className="shimmer-project__stats"><Block className="shimmer-stat" /><Block className="shimmer-stat" /><Block className="shimmer-stat" /></div></div><Block className="shimmer-project__table" /></div>;
  }
  if (variant === 'compact') return <div className="shimmer-compact" aria-busy="true">{[0, 1, 2].map((item) => <Block className="shimmer-compact__row" key={item} />)}</div>;
  return <div className="shimmer-dashboard" aria-busy="true"><div className="shimmer-header"><div><Block className="shimmer-heading" /><Block className="shimmer-copy" /></div><Block className="shimmer-action" /></div><div className="shimmer-dashboard__stats">{[0, 1, 2, 3].map((item) => <Block className="shimmer-stat" key={item} />)}</div><div className="shimmer-dashboard__panels"><Block className="shimmer-panel" /><Block className="shimmer-panel" /></div></div>;
}
