type PageShimmerProps = { compact?: boolean };

export default function PageShimmer({ compact = false }: PageShimmerProps) {
  return (
    <div className={compact ? 'content-shimmer content-shimmer--compact' : 'content-shimmer'} aria-busy="true" aria-label="Loading content">
      <div className="shimmer content-shimmer__title" />
      <div className="shimmer content-shimmer__line" />
      <div className="content-shimmer__grid">
        <div className="shimmer content-shimmer__card" />
        <div className="shimmer content-shimmer__card" />
        <div className="shimmer content-shimmer__card" />
      </div>
    </div>
  );
}
