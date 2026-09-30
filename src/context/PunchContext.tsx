'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  punchService,
  PunchStatus,
  AttendanceData,
} from '@/lib/punchService';

export interface AttendanceRequestData {
  _id: string;
  attendance_date: string;
  request_type: 'punchIn' | 'punchOut';
  reason: string;
  requested_punch_at: string | Date;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejection_reason?: string | null;
  reviewed_at?: string | Date | null;
}

interface PunchContextType {
  isPunchedIn: boolean;
  canPunchIn: boolean;
  canPunchOut: boolean;
  isViewMode: boolean;
  attendance: AttendanceData | null;
  pendingRequest?: any;
  rejectedRequest?: AttendanceRequestData | null;
  loading: boolean;
  user: any;
  punchIn: (meta?: { reason?: string; geo?: any[]; systemId?: string }) => Promise<void>;
  punchOut: (meta?: { reason?: string; geo?: any[]; systemId?: string }) => Promise<void>;
  togglePunch: (meta?: { reason?: string; geo?: any[]; systemId?: string }) => Promise<void>;
  requestPunch: (
    requestType: 'punchIn' | 'punchOut',
    reason: string,
    meta?: { geo?: any[]; systemId?: string }
  ) => Promise<any>;
  refreshPunch: () => Promise<void>;
}

const PunchContext = createContext<PunchContextType>({
  isPunchedIn: false,
  canPunchIn: true,
  canPunchOut: false,
  isViewMode: false,
  attendance: null,
  pendingRequest: null,
  rejectedRequest: null,
  loading: true,
  user: null,
  punchIn: async () => {},
  punchOut: async () => {},
  togglePunch: async () => {},
  requestPunch: async () => {},
  refreshPunch: async () => {},
});

export function PunchProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [punchState, setPunchState] = useState<PunchStatus>(() =>
    punchService.getPunchStatus()
  );
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const refreshPunch = useCallback(async () => {
    try {
      const latest = await punchService.fetchPunchStatus();
      setPunchState(latest);
    } catch (err) {
      console.error('Failed to refresh punch status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    refreshPunch();

    const handlePunchChanged = (e: any) => {
      if (e.detail) {
        setPunchState(e.detail);
      } else {
        refreshPunch();
      }
    };

    window.addEventListener('punch-status-changed', handlePunchChanged);
    window.addEventListener('punchStateChanged', refreshPunch);

    return () => {
      window.removeEventListener('punch-status-changed', handlePunchChanged);
      window.removeEventListener('punchStateChanged', refreshPunch);
      window.removeEventListener('focus', refreshPunch);
    };
  }, [fetchUser, refreshPunch]);

  const isAdmin = user && Number(user.user_role) === 1;

  const isViewMode = Boolean(
    user && !isAdmin && !punchState.isPunchedIn
  );

  const punchIn = async (
    meta?: { reason?: string; geo?: any[]; systemId?: string }
  ) => {
    setLoading(true);
    try {
      const updated = await punchService.punchIn(meta);
      setPunchState(updated);
    } finally {
      setLoading(false);
    }
  };

  const punchOut = async (
    meta?: { reason?: string; geo?: any[]; systemId?: string }
  ) => {
    setLoading(true);
    try {
      const updated = await punchService.punchOut(meta);
      setPunchState(updated);
    } finally {
      setLoading(false);
    }
  };

  const togglePunch = async (
    meta?: { reason?: string; geo?: any[]; systemId?: string }
  ) => {
    if (punchState.isPunchedIn) {
      await punchOut(meta);
    } else {
      await punchIn(meta);
    }
  };

  const requestPunch = async (
    requestType: 'punchIn' | 'punchOut',
    reason: string,
    meta?: { geo?: any[]; systemId?: string }
  ) => {
    const res = await punchService.requestPunch(requestType, reason, meta);
    await refreshPunch();
    return res;
  };

  return (
    <PunchContext.Provider
      value={{
        isPunchedIn: punchState.isPunchedIn,
        canPunchIn: punchState.canPunchIn,
        canPunchOut: punchState.canPunchOut,
        isViewMode,
        attendance: punchState.attendance,
        pendingRequest: punchState.pendingRequest,
        rejectedRequest: punchState.rejectedRequest ?? null,
        loading,
        user,
        punchIn,
        punchOut,
        togglePunch,
        requestPunch,
        refreshPunch,
      }}
    >
      {children}
    </PunchContext.Provider>
  );
}

export function usePunch() {
  return useContext(PunchContext);
}
