'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Clock, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import type { SettingsData } from '../../types/SettingsData';
import { CustomTimePicker } from '@/components/TaskFormControls';
import './style.css';

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

  useEffect(() => {
    const checkAccess = async () => {
      const storedUser = localStorage.getItem('worktracker_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      let currentUser = JSON.parse(storedUser);

      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();

        if (meData.success && meData.data) {
          currentUser = meData.data;
          localStorage.setItem('worktracker_user', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.error(err);
      }

      const hasAccess =
        currentUser.userType === 'admin' ||
        currentUser.isSystemAdmin ||
        (currentUser.permissions || []).includes('settings:manage');

      if (!hasAccess) {
        router.push('/dashboard');
        return;
      }

      setUser(currentUser);
    };

    checkAccess();
  }, [router]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/settings');
        const result = await res.json();

        if (!result.success) {
          setError(result.error || 'Failed to load settings');
          setLoading(false);
          return;
        }

        setSettings({
          punchInStartTime: result.data.punchInStartTime,
          punchInEndTime: result.data.punchInEndTime,
          punchOutStartTime: result.data.punchOutStartTime,
          punchOutEndTime: result.data.punchOutEndTime,
        });
      } catch (err: any) {
        setError(err.message || 'Error loading settings');
      } finally {
        setLoading(false);
      }
    };

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

      if (!result.success) {
        setError(result.error || 'Failed to save settings');
        setSaving(false);
        return;
      }

      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
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
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
            Punch In Timing Window
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
            <div>

              <CustomTimePicker
                label="Start Time"
                value={settings.punchInStartTime}
                onChange={(value) => handleChange('punchInStartTime', value)}
                align="right"
              />
              {/* <label className="form-label">Start Time</label> */}
              {/* <input
                type="time"
                className="form-control"
                value={settings.punchInStartTime}
                onChange={(e) => handleChange('punchInStartTime', e.target.value)}
                required
              /> */}
            </div>
            <div>

              <CustomTimePicker
                label="End Time"
                 value={settings.punchInEndTime}
                onChange={(value) => handleChange('punchInEndTime', value)}
                align="right"
              />
              {/* <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-control"
                value={settings.punchInEndTime}
                onChange={(e) => handleChange('punchInEndTime', e.target.value)}
                required
              /> */}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
            Punch Out Timing Window
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
            <div>
              <CustomTimePicker
                label="Start Time"
                value={settings.punchOutStartTime}
                onChange={(value) => handleChange('punchOutStartTime', value)}
                align="right"
              />
              {/* <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-control"
                value={settings.punchOutStartTime}
                onChange={(e) => handleChange('punchOutStartTime', e.target.value)}
                required
              /> */}
            </div>
            <div>
              <CustomTimePicker
                label="End Time"
                value={settings.punchOutEndTime}
                onChange={(value) => handleChange('punchOutEndTime', value)}
                align="right"
              />
              {/* <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-control"
                value={settings.punchOutEndTime}
                onChange={(e) => handleChange('punchOutEndTime', e.target.value)}
                required
              /> */}
            </div>
          </div>
        </div>

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
    </div>
  );
}