'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Clock, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import type { SettingsData } from '@/types/SettingsData';
import { CustomTimePicker } from '@/components/TaskFormControls';
import { toast } from '@/lib/toast';

const defaultSettings: SettingsData = {
  punchInStartTime: '',
  punchInEndTime: '',
  punchInGeoRequired: false,
  punchInIpRequired: false,
  punchInBrowserRequired: false,
  punchInSystemIdRequired: false,
  punchOutStartTime: '',
  punchOutEndTime: '',
  punchOutGeoRequired: false,
  punchOutIpRequired: false,
  punchOutBrowserRequired: false,
  punchOutSystemIdRequired: false,
  taskIdPrefix: 'QT',
  nextTaskNumber: 1,
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const [settings, setSettings] = useState<SettingsData>(defaultSettings);

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

      setUser(currentUser);

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
        if (result.success && result.data) {
          setSettings({
            punchInStartTime: result.data.punchInStartTime || '',
            punchInEndTime: result.data.punchInEndTime || '',
            punchInGeoRequired: Boolean(result.data.punchInGeoRequired),
            punchInIpRequired: Boolean(result.data.punchInIpRequired),
            punchInBrowserRequired: Boolean(result.data.punchInBrowserRequired),
            punchInSystemIdRequired: Boolean(result.data.punchInSystemIdRequired),
            punchOutStartTime: result.data.punchOutStartTime || '',
            punchOutEndTime: result.data.punchOutEndTime || '',
            punchOutGeoRequired: Boolean(result.data.punchOutGeoRequired),
            punchOutIpRequired: Boolean(result.data.punchOutIpRequired),
            punchOutBrowserRequired: Boolean(result.data.punchOutBrowserRequired),
            punchOutSystemIdRequired: Boolean(result.data.punchOutSystemIdRequired),
            taskIdPrefix: result.data.taskIdPrefix || 'QT',
            nextTaskNumber: Number(result.data.nextTaskNumber || 1),
          });
        }
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

  type TimeField =
    | 'punchInStartTime'
    | 'punchInEndTime'
    | 'punchOutStartTime'
    | 'punchOutEndTime';

  const timeFieldLabels: Record<TimeField, string> = {
    punchInStartTime: 'Punch In Start Time',
    punchInEndTime: 'Punch In End Time',
    punchOutStartTime: 'Punch Out Start Time',
    punchOutEndTime: 'Punch Out End Time',
  };

  const formatDisplayTime = (val: string) => {
    if (!val) return '';
    const parts = val.split(':');
    let h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const handleTimeChange = async (field: TimeField, value: string) => {
    const previousValue = settings[field] || '';
    const cleanValue = value ? value.trim() : '';

    setSettings((prev) => ({ ...prev, [field]: cleanValue }));

    try {
      setError(null);

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          [field]: cleanValue || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update time setting');
      }

      if (result.data) {
        setSettings((prev) => ({
          ...prev,
          [field]: result.data[field] ?? cleanValue,
        }));
      }

      const label = timeFieldLabels[field] || 'Timing';
      const displayVal = formatDisplayTime(cleanValue);
      toast.success(cleanValue ? `${label} updated to ${displayVal}` : `${label} cleared`);
    } catch (err: any) {
      console.error('Time update error:', err);
      setSettings((prev) => ({
        ...prev,
        [field]: previousValue,
      }));
      const msg = err?.message || 'Failed to update timing';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save settings');
      }

      if (result.data) {
        setSettings((prev) => ({
          ...prev,
          punchInStartTime: result.data.punchInStartTime ?? prev.punchInStartTime,
          punchInEndTime: result.data.punchInEndTime ?? prev.punchInEndTime,
          punchOutStartTime: result.data.punchOutStartTime ?? prev.punchOutStartTime,
          punchOutEndTime: result.data.punchOutEndTime ?? prev.punchOutEndTime,
        }));
      }

      toast.success('Settings updated successfully');
      setSuccessMsg('Shift timings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Error saving settings';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
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
                value={settings.punchInStartTime || ''}
                onChange={(value) => handleTimeChange('punchInStartTime', value)}
                align="right"
              />
            </div>
            <div>
              <CustomTimePicker
                label="End Time"
                value={settings.punchInEndTime || ''}
                onChange={(value) => handleTimeChange('punchInEndTime', value)}
                align="right"
              />
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
                value={settings.punchOutStartTime || ''}
                onChange={(value) => handleTimeChange('punchOutStartTime', value)}
                align="right"
              />
            </div>
            <div>
              <CustomTimePicker
                label="End Time"
                value={settings.punchOutEndTime || ''}
                onChange={(value) => handleTimeChange('punchOutEndTime', value)}
                align="right"
              />
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