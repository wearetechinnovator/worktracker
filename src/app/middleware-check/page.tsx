'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, AlertCircle, Loader2 } from 'lucide-react';

export default function MiddlewareCheckPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkPunchStatus = async () => {
      const storedUser = localStorage.getItem('worktracker_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      const parsed = JSON.parse(storedUser);
      setUser(parsed);

      // Admin can bypass punch requirement
      if (parsed.userType === 'admin') {
        router.push('/');
        return;
      }

      try {
        const res = await fetch(`/api/punch?employeeId=${parsed._id}`);
        const result = await res.json();

        if (result.success && result.data.attendance?.checkIn) {
          // Employee has punched in, allow access
          router.push('/');
        } else {
          // Not punched in, redirect to punch page
          router.push('/punch');
        }
      } catch (err) {
        console.error('Error checking punch status:', err);
        router.push('/punch');
      } finally {
        setLoading(false);
      }
    };

    checkPunchStatus();
  }, [router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
      <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
      <p style={{ color: 'var(--text-secondary)' }}>Checking attendance status...</p>
    </div>
  );
}
