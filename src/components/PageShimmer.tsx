export type ShimmerVariant = 
  | 'dashboard' 
  | 'employees' 
  | 'Projects' 
  | 'tasks' 
  | 'punch' 
  | 'attendance' 
  | 'project' 
  | 'reports' 
  | 'settings' 
  | 'history' 
  | 'table' 
  | 'compact';

function Block({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`shimmer ${className}`} style={style} aria-hidden="true" />;
}

export default function PageShimmer({ variant = 'dashboard' }: { variant?: ShimmerVariant }) {
  if (variant === 'punch') {
    return (
      <div className="shimmer-container" style={{ maxWidth: '800px', margin: '0 auto' }} aria-busy="true">
        <div style={{ textAlign: 'center', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Block style={{ width: '160px', height: '26px' }} />
          <Block style={{ width: '220px', height: '14px' }} />
        </div>
        <div className="card" style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <Block style={{ width: '120px', height: '28px', borderRadius: '20px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '24px 40px', background: 'var(--bg-tertiary)', borderRadius: '16px', width: '100%', maxWidth: '360px' }}>
            <Block style={{ width: '220px', height: '48px', borderRadius: '8px' }} />
            <Block style={{ width: '140px', height: '12px' }} />
          </div>
          <Block style={{ width: '100%', maxWidth: '320px', height: '52px', borderRadius: 'var(--border-radius-sm)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <Block style={{ width: '60px', height: '11px' }} />
                <Block style={{ width: '80px', height: '18px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'employees') {
    return (
      <div className="shimmer-container" aria-busy="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Block style={{ width: '180px', height: '24px' }} />
            <Block style={{ width: '320px', maxWidth: '80vw', height: '13px', marginTop: '8px' }} />
          </div>
          <Block style={{ width: '140px', height: '38px', borderRadius: 'var(--border-radius-sm)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Block style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Block style={{ width: '110px', height: '15px' }} />
                    <Block style={{ width: '140px', height: '11px' }} />
                  </div>
                </div>
                <Block style={{ width: '55px', height: '20px', borderRadius: '10px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <Block style={{ width: '80px', height: '20px', borderRadius: '4px' }} />
                <Block style={{ width: '70px', height: '20px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <Block style={{ width: '70px', height: '14px' }} />
                <Block style={{ width: '60px', height: '14px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'Projects') {
    return (
      <div className="shimmer-container" aria-busy="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <Block style={{ width: '200px', height: '24px' }} />
            <Block style={{ width: '300px', height: '13px', marginTop: '8px' }} />
          </div>
          <Block style={{ width: '150px', height: '38px', borderRadius: 'var(--border-radius-sm)' }} />
        </div>
        <div className="split-layout">
          <div className="split-master" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Block style={{ width: '110px', height: '12px', marginBottom: '4px' }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Block style={{ width: '10px', height: '10px', borderRadius: '50%' }} />
                  <Block style={{ width: '100px', height: '14px' }} />
                </div>
                <Block style={{ width: '28px', height: '18px', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
          <div className="split-detail" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Block style={{ width: '180px', height: '22px' }} />
                <Block style={{ width: '80px', height: '30px' }} />
              </div>
              <Block style={{ width: '85%', height: '14px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '8px' }}>
                {[0, 1, 2].map((i) => (
                  <Block key={i} style={{ height: '64px', borderRadius: '8px' }} />
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Block style={{ width: '140px', height: '18px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Block key={i} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'tasks') {
    return (
      <div className="shimmer-container" aria-busy="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Block style={{ width: '160px', height: '24px' }} />
            <Block style={{ width: '260px', height: '13px', marginTop: '8px' }} />
          </div>
          <Block style={{ width: '130px', height: '38px', borderRadius: 'var(--border-radius-sm)' }} />
        </div>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2, 3].map((i) => (
              <Block key={i} style={{ width: '80px', height: '32px', borderRadius: '20px' }} />
            ))}
          </div>
          <Block style={{ width: '200px', height: '32px', marginLeft: 'auto', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <Block style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <Block style={{ width: '55%', height: '15px' }} />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Block style={{ width: '70px', height: '18px', borderRadius: '4px' }} />
                    <Block style={{ width: '90px', height: '12px' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Block style={{ width: '65px', height: '22px', borderRadius: '12px' }} />
                <div style={{ display: 'flex' }}>
                  <Block style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                  <Block style={{ width: '28px', height: '28px', borderRadius: '50%', marginLeft: '-8px' }} />
                </div>
                <Block style={{ width: '80px', height: '14px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'attendance') {
    return (
      <div className="shimmer-container" aria-busy="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Block style={{ width: '190px', height: '24px' }} />
            <Block style={{ width: '310px', height: '13px', marginTop: '8px' }} />
          </div>
          <Block style={{ width: '150px', height: '36px', borderRadius: '6px' }} />
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <Block style={{ width: '150px', height: '20px' }} />
            <Block style={{ width: '110px', height: '14px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Block key={i} style={{ height: '12px', width: '80%' }} />
              ))}
            </div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr', gap: '12px', alignItems: 'center', padding: '8px 0' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Block style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                  <Block style={{ width: '100px', height: '14px' }} />
                </div>
                <Block style={{ width: '80px', height: '14px' }} />
                <Block style={{ width: '90px', height: '14px' }} />
                <Block style={{ width: '70px', height: '14px' }} />
                <Block style={{ width: '70px', height: '14px' }} />
                <Block style={{ width: '75px', height: '26px', borderRadius: '13px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'project') {
    return (
      <div className="shimmer-container" aria-busy="true">
        <Block style={{ width: '180px', height: '14px', marginBottom: '16px' }} />
        <div className="card" style={{ padding: '24px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Block style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
            <Block style={{ width: '220px', height: '26px' }} />
          </div>
          <Block style={{ width: '70%', height: '14px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '12px' }}>
            {[0, 1, 2].map((i) => (
              <Block key={i} style={{ height: '70px', borderRadius: '8px' }} />
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: '20px', minHeight: '260px' }}>
          <Block style={{ width: '140px', height: '20px', marginBottom: '16px' }} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
              <Block style={{ width: '30%', height: '14px' }} />
              <Block style={{ width: '20%', height: '14px' }} />
              <Block style={{ width: '20%', height: '14px' }} />
              <Block style={{ width: '15%', height: '14px', marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }



  if (variant === 'settings') {
    return (
      <div className="shimmer-container" style={{ maxWidth: '900px', margin: '0 auto' }} aria-busy="true">
        <div style={{ marginBottom: '24px' }}>
          <Block style={{ width: '190px', height: '26px' }} />
          <Block style={{ width: '280px', height: '13px', marginTop: '8px' }} />
        </div>
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Block style={{ width: '160px', height: '20px' }} />
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Block style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Block style={{ width: '120px', height: '32px', borderRadius: '6px' }} />
              <Block style={{ width: '180px', height: '11px' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Block style={{ width: '80px', height: '12px' }} />
                <Block style={{ width: '100%', height: '38px', borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'history') {
    return (
      <div className="shimmer-container" aria-busy="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Block style={{ width: '210px', height: '24px' }} />
            <Block style={{ width: '310px', height: '13px', marginTop: '8px' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Block style={{ width: '140px', height: '36px', borderRadius: '6px' }} />
            <Block style={{ width: '120px', height: '36px', borderRadius: '6px' }} />
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <Block style={{ width: '170px', height: '18px', marginBottom: '16px' }} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 1.5fr 1fr 1fr', gap: '12px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <Block style={{ height: '14px', width: '80px' }} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Block style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                <Block style={{ height: '14px', width: '100px' }} />
              </div>
              <Block style={{ height: '14px', width: '140px' }} />
              <Block style={{ height: '14px', width: '90px' }} />
              <Block style={{ height: '14px', width: '60px' }} />
              <Block style={{ height: '24px', width: '70px', borderRadius: '12px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="shimmer-container" aria-busy="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <Block style={{ width: '180px', height: '24px' }} />
            <Block style={{ width: '260px', height: '13px', marginTop: '8px' }} />
          </div>
          <Block style={{ width: '120px', height: '36px', borderRadius: 'var(--border-radius-sm)' }} />
        </div>
        <div className="card" style={{ padding: '20px' }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <Block style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              <Block style={{ width: '25%', height: '14px' }} />
              <Block style={{ width: '25%', height: '14px' }} />
              <Block style={{ width: '20%', height: '14px' }} />
              <Block style={{ width: '60px', height: '22px', borderRadius: '11px', marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="shimmer-container" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[0, 1, 2].map((item) => (
          <div key={item} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 0' }}>
            <Block style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
            <Block style={{ width: '65%', height: '14px' }} />
            <Block style={{ width: '50px', height: '20px', borderRadius: '10px', marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    );
  }

  // Default 'dashboard'
  return (
    <div className="shimmer-container" aria-busy="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <Block style={{ width: '190px', height: '24px' }} />
          <Block style={{ width: '280px', maxWidth: '60vw', height: '13px', marginTop: '8px' }} />
        </div>
        <Block style={{ width: '92px', height: '34px', borderRadius: 'var(--border-radius-sm)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Block style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Block style={{ width: '60px', height: '20px' }} />
              <Block style={{ width: '100px', height: '12px' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '16px' }}>
        <div className="card" style={{ minHeight: '320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Block style={{ width: '180px', height: '20px' }} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Block style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Block style={{ width: '70%', height: '14px' }} />
                <Block style={{ width: '40%', height: '10px' }} />
              </div>
              <Block style={{ width: '60px', height: '24px', borderRadius: '12px' }} />
            </div>
          ))}
        </div>
        <div className="card" style={{ minHeight: '320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Block style={{ width: '160px', height: '20px' }} />
          <Block style={{ width: '100%', height: '180px', borderRadius: '8px' }} />
          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
            <Block style={{ flex: 1, height: '14px' }} />
            <Block style={{ flex: 1, height: '14px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

