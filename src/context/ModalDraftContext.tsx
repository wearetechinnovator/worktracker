'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ModalDraftItem {
  key: string;
  type: 'employee' | 'client' | 'project' | 'task' | 'keep-note';
  title: string;
  subtitle?: string;
  data: any;
  isMinimized?: boolean;
  updatedAt: number;
}

interface ModalDraftContextType {
  drafts: Record<string, ModalDraftItem>;
  saveDraft: (key: string, item: Omit<ModalDraftItem, 'key' | 'updatedAt'>) => void;
  getDraft: (key: string) => any | null;
  clearDraft: (key: string) => void;
  setModalOpenState: (key: string, isOpen: boolean) => void;
  restoreModal: (key: string) => void;
  minimizedDrafts: ModalDraftItem[];
}

const ModalDraftContext = createContext<ModalDraftContextType | null>(null);

const STORAGE_KEY = 'worktracker_modal_drafts_v1';

export function ModalDraftProvider({ children }: { children: React.ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, ModalDraftItem>>({});

  // Initialize from sessionStorage safely on client
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setDrafts(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Sync to sessionStorage
  const persistDrafts = useCallback((nextDrafts: Record<string, ModalDraftItem>) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
    } catch {
      // ignore storage errors
    }
  }, []);

  const saveDraft = useCallback((key: string, item: Omit<ModalDraftItem, 'key' | 'updatedAt'>) => {
    setDrafts((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...item,
          key,
          isMinimized: item.isMinimized !== undefined ? item.isMinimized : true,
          updatedAt: Date.now(),
        },
      };
      persistDrafts(next);
      return next;
    });
  }, [persistDrafts]);

  const setModalOpenState = useCallback((key: string, isOpen: boolean) => {
    setDrafts((prev) => {
      if (!prev[key]) return prev;
      const next = {
        ...prev,
        [key]: {
          ...prev[key],
          isMinimized: !isOpen,
        },
      };
      persistDrafts(next);
      return next;
    });
  }, [persistDrafts]);

  const getDraft = useCallback((key: string) => {
    return drafts[key]?.data || null;
  }, [drafts]);

  const clearDraft = useCallback((key: string) => {
    setDrafts((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      persistDrafts(next);
      return next;
    });
  }, [persistDrafts]);

  const restoreModal = useCallback((key: string) => {
    const draft = drafts[key];
    if (!draft) return;

    // Mark as no longer minimized since it is opening
    setModalOpenState(key, true);
    
    // Dispatch event so relevant modal component can listen and open
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-restore-modal', {
          detail: { key, type: draft.type, data: draft.data },
        })
      );
    }
  }, [drafts, setModalOpenState]);

  const minimizedDrafts = Object.values(drafts)
    .filter((d) => d.isMinimized !== false)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <ModalDraftContext.Provider
      value={{
        drafts,
        saveDraft,
        getDraft,
        clearDraft,
        setModalOpenState,
        restoreModal,
        minimizedDrafts,
      }}
    >
      {children}
    </ModalDraftContext.Provider>
  );
}

export function useModalDraft() {
  const context = useContext(ModalDraftContext);
  if (!context) {
    return {
      drafts: {},
      saveDraft: () => {},
      getDraft: () => null,
      clearDraft: () => {},
      setModalOpenState: () => {},
      restoreModal: () => {},
      minimizedDrafts: [],
    };
  }
  return context;
}
