function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`shimmer ${className}`} aria-hidden="true" />;
}

export default function Loading() {
  return (
    <main className="page-loading" aria-busy="true" aria-label="Loading page">
      <section className="page-loading__header">
        <div>
          <Shimmer className="shimmer--title" />
          <Shimmer className="shimmer--subtitle" />
        </div>
        <Shimmer className="shimmer--button" />
      </section>

      <section className="page-loading__stats">
        {[0, 1, 2, 3].map((item) => <Shimmer className="shimmer--stat" key={item} />)}
      </section>

      <section className="page-loading__content">
        <Shimmer className="shimmer--panel" />
        <Shimmer className="shimmer--panel" />
      </section>
      <span className="sr-only">Loading content</span>
    </main>
  );
}
