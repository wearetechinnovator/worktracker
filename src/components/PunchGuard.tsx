'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Clock, AlertCircle, Loader2, LogIn } from 'lucide-react';

export default function PunchGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Pages that don't require punch check
  const publicPages = ['/login', '/punch'];
  const isPublicPage = publicPages.includes(pathname);

  useEffect(() => {
    const checkPunchStatus = async () => {
      // Skip check for public pages
      if (isPublicPage) {
        setLoading(false);
        return;
      }

      const storedUser = localStorage.getItem('worktracker_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      const parsed = JSON.parse(storedUser);
      setUser(parsed);

      const punchStatus = localStorage.getItem('worktracker_punch_status');
      if (punchStatus === 'out' && pathname !== '/punch') {
        setIsPunchedIn(false);
        setLoading(false);
        router.replace('/punch');
        return;
      }

      // Admin can bypass punch requirement
      if (parsed.userType === 'admin') {
        setIsPunchedIn(true);
        setLoading(false);
        return;
      }

      try {
        const now = new Date();
        const localDate = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, '0'),
          String(now.getDate()).padStart(2, '0'),
        ].join('-');
        const localTime = [
          String(now.getHours()).padStart(2, '0'),
          String(now.getMinutes()).padStart(2, '0'),
        ].join(':');

        const res = await fetch(`/api/punch?employeeId=${parsed._id}&date=${localDate}&time=${localTime}`);
        const result = await res.json();

        if (!result.success) {
          setError(result.error || 'Failed to check punch status');
          setLoading(false);
          return;
        }

        const attendance = result.data?.attendance;
        const isCurrentlyCheckedIn = !!attendance?.checkIn && !attendance?.checkOut;

        if (isCurrentlyCheckedIn) {
          localStorage.setItem('worktracker_punch_status', 'in');
          setIsPunchedIn(true);
          setLoading(false);
        } else {
          localStorage.setItem('worktracker_punch_status', 'out');
          setIsPunchedIn(false);
          setLoading(false);
          if (pathname !== '/punch') {
            router.replace('/punch');
          }
        }
      } catch (err: any) {
        console.error('Error checking punch status:', err);
        setError(err.message || 'Error checking attendance');
        setLoading(false);
      }
    };

    checkPunchStatus();
  }, [pathname, router, isPublicPage]);

  // Show loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Verifying attendance status...</p>
      </div>
    );
  }

  // Show error state
  if (error && !isPublicPage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', padding: '20px' }}>
        <AlertCircle size={48} style={{ color: '#ef4444' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#991b1b' }}>Attendance Check Failed</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>{error}</p>
        <button 
          onClick={() => router.push('/punch')}
          className="btn btn-primary"
          style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <LogIn size={16} />
          <span>Go to Punch Page</span>
        </button>
      </div>
    );
  }

  // If not punched in and not on a public page, show blocked message
  if (!isPunchedIn && !isPublicPage && user?.userType !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px', padding: '20px' }}>
        <div style={{ 
          background: 'var(--bg-secondary)', 
          borderRadius: '50%', 
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <Clock size={64} style={{ color: 'var(--accent-primary)' }} />
        </div>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center' }}>
          Please Punch In First
        </h2>
        
        <p style={{ 
          color: 'var(--text-secondary)', 
          textAlign: 'center', 
          maxWidth: '450px',
          lineHeight: '1.6'
        }}>
          You have already punched out for today, so access to other pages is temporarily blocked. Please visit the Punch page to check your attendance status or punch in again for a new session.
        </p>

        <div className="card" style={{ 
          maxWidth: '450px', 
          background: '#fef3c7',
          borderLeft: '4px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertCircle size={20} style={{ color: '#f59e0b', marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px' }}>
                Access Restricted
              </strong>
              <p style={{ color: '#78350f', fontSize: '0.85rem', margin: 0 }}>
                Your work session has ended for today. Access is restricted until your next punch in.
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => router.push('/punch')}
          className="btn btn-primary"
          style={{ 
            marginTop: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '1rem',
            padding: '12px 24px'
          }}
        >
          <LogIn size={18} />
          <span>Go to Punch In</span>
        </button>
      </div>
    );
  }

  // User is authenticated and punched in (or is admin), show content
  return <>{children}</>;
}
