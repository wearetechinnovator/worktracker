'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const userSession = localStorage.getItem('worktracker_user');
    if (userSession) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Login failed. Please check your credentials.');
      }

      // Store user session data in local storage
      localStorage.setItem('worktracker_user', JSON.stringify(result.data));

      // Redirect to main page
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '85vh',
      width: '100%',
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '380px',
        padding: '24px 30px',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Work Report
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Sign in to track and manage your work sessions
          </p>
        </div>

        {error && (
          <div className="card" style={{
            borderLeft: '4px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '18px',
            padding: '10px 14px',
            background: '#fef2f2',
          }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
            <p style={{ color: '#991b1b', fontSize: '0.75rem', fontWeight: 650 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-control"
                style={{ paddingLeft: '32px' }}
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '32px' }}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              marginTop: '10px',
              width: '100%',
              height: '38px',
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo Accounts Alert Box */}
        <div style={{
          marginTop: '24px',
          background: 'var(--bg-tertiary)',
          padding: '10px 12px',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
            Default Admin Login:
          </div>
          <div>Email: <code style={{ fontWeight: 650 }}>admin@mail.com</code></div>
          <div>Password: <code style={{ fontWeight: 650 }}>admin123</code></div>
        </div>
      </div>
    </div>
  );
}
