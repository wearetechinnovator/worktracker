'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Clock, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';

interface SettingsData {
  punchInStartTime: string;
  punchInEndTime: string;
  punchOutStartTime: string;
  punchOutEndTime: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<SettingsData>({
    punchInStartTime: '09:00',
    punchInEndTime: '10:00',
    punchOutStartTime: '17:00',
    punchOutEndTime: '19:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Authenticate admin
  useEffect(() => {
    const checkAccess = async () => {
      const storedUser = localStorage.getItem('worktracker_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      const parsed = JSON.parse(storedUser);
      setUser(parsed);

      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.success && meData.data) {
          const userObj = meData.data;
          setUser(userObj);
          localStorage.setItem('worktracker_user', JSON.stringify(userObj));
          const hasAccess = userObj.userType === 'admin' || userObj.isSystemAdmin || (userObj.permissions || []).includes('settings:manage');
          if (!hasAccess) {
            router.push('/');
          }
        } else if (parsed.userType !== 'admin' && !(parsed.permissions || []).includes('settings:manage')) {
          router.push('/');
        }
      } catch (err) {
        if (parsed.userType !== 'admin' && !(parsed.permissions || []).includes('settings:manage')) {
          router.push('/');
        }
      }
    };

    checkAccess();
  }, [router]);

  // Load settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/settings');
      const result = await res.json();
      
      if (!result.success) throw new Error(result.error || 'Failed to load settings');
      
      setSettings({
        punchInStartTime: result.data.punchInStartTime,
        punchInEndTime: result.data.punchInEndTime,
        punchOutStartTime: result.data.punchOutStartTime,
        punchOutEndTime: result.data.punchOutEndTime,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const result = await res.json();
      
      if (!result.success) throw new Error(result.error || 'Failed to save settings');

      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SettingsData, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <PageShimmer variant="settings" />;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SettingsIcon size={28} style={{ color: 'var(--accent-primary)' }} />
          Attendance Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configure punch in and punch out timings for all employees
        </p>
      </div>

      {error && (
        <div className="card" style={{ 
          borderLeft: '4px solid #ef4444', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '20px',
          background: '#fef2f2'
        }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 600, color: '#991b1b' }}>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ 
          borderLeft: '4px solid #10b981', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '20px', 
          background: '#ecfdf5' 
        }}>
          <CheckCircle2 style={{ color: '#10b981' }} />
          <p style={{ color: '#065f46', fontWeight: 700 }}>{successMsg}</p>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
            Punch In Timing Window
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-control"
                value={settings.punchInStartTime}
                onChange={(e) => handleChange('punchInStartTime', e.target.value)}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Earliest time employees can punch in
              </p>
            </div>
            <div>
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-control"
                value={settings.punchInEndTime}
                onChange={(e) => handleChange('punchInEndTime', e.target.value)}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Latest time employees can punch in
              </p>
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '12px', 
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            <strong>Current Window:</strong> {settings.punchInStartTime} - {settings.punchInEndTime}
            <br />
            Employees can only punch in during this time window.
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
            Punch Out Timing Window
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-control"
                value={settings.punchOutStartTime}
                onChange={(e) => handleChange('punchOutStartTime', e.target.value)}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Earliest time employees can punch out
              </p>
            </div>
            <div>
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-control"
                value={settings.punchOutEndTime}
                onChange={(e) => handleChange('punchOutEndTime', e.target.value)}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Latest time employees can punch out
              </p>
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '12px', 
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            <strong>Current Window:</strong> {settings.punchOutStartTime} - {settings.punchOutEndTime}
            <br />
            Employees can only punch out during this time window.
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push('/')}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ gap: '8px' }}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Card */}
      {/* <div className="card" style={{ marginTop: '24px', background: 'var(--bg-secondary)' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>
          How It Works
        </h4>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '20px' }}>
          <li>Employees can only punch in during the punch in time window</li>
          <li>Punch out button remains disabled until punch in is completed</li>
          <li>Employees can only punch out during the punch out time window</li>
          <li>Outside these windows, the respective buttons will be blurred and disabled</li>
          <li>Changes take effect immediately for all employees</li>
        </ul>
      </div> */}
    </div>
  );
}
