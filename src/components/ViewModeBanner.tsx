'use client';

import React from 'react';
import { Eye, LogIn, AlertCircle } from 'lucide-react';
import { usePunch } from '@/context/PunchContext';

export default function ViewModeBanner() {
  const { isViewMode, punchIn, loading } = usePunch();

  if (!isViewMode) return null;

  return (
    <></>
    // <div
    //   style={{
    //     display: 'flex',
    //     alignItems: 'center',
    //     justifyContent: 'space-between',
    //     padding: '10px 16px',
    //     backgroundColor: '#fffbeb',
    //     border: '1px solid #fef3c7',
    //     borderLeft: '4px solid #f59e0b',
    //     borderRadius: '8px',
    //     marginBottom: '16px',
    //     boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    //   }}
    // >
    //   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    //     <Eye size={18} style={{ color: '#d97706', flexShrink: 0 }} />
    //     <div>
    //       <span style={{ fontWeight: 650, color: '#92400e', fontSize: '0.86rem' }}>
    //         View-Only Mode Active:
    //       </span>
    //       <span style={{ color: '#78350f', fontSize: '0.84rem', marginLeft: '6px' }}>
    //         You are currently punched out. You can browse and inspect data, but you must punch in to create tasks, start work, or make changes.
    //       </span>
    //     </div>
    //   </div>

    //   <button
    //     type="button"
    //     onClick={() => punchIn()}
    //     disabled={loading}
    //     style={{
    //       display: 'inline-flex',
    //       alignItems: 'center',
    //       gap: '6px',
    //       padding: '6px 14px',
    //       backgroundColor: '#10b981',
    //       color: '#ffffff',
    //       border: 'none',
    //       borderRadius: '6px',
    //       fontSize: '0.82rem',
    //       fontWeight: 600,
    //       cursor: loading ? 'not-allowed' : 'pointer',
    //       boxShadow: '0 1px 2px rgba(16, 185, 129, 0.3)',
    //       transition: 'all 0.15s ease',
    //       flexShrink: 0,
    //     }}
    //     onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
    //     onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
    //   >
    //     <LogIn size={14} />
    //     <span>Punch In Now</span>
    //   </button>
    // </div>
  );
}
