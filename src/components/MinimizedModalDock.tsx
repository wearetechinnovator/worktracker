'use client';

import React from 'react';
import { useModalDraft, ModalDraftItem } from '@/context/ModalDraftContext';
import {
  Users,
  Building2,
  FolderPlus,
  CheckSquare,
  StickyNote,
  X,
  Maximize2,
  FileEdit,
} from 'lucide-react';

export default function MinimizedModalDock() {
  const { minimizedDrafts, restoreModal, clearDraft } = useModalDraft();

  if (!minimizedDrafts || minimizedDrafts.length === 0) {
    return null;
  }

  const getIcon = (type: ModalDraftItem['type']) => {
    switch (type) {
      case 'employee':
        return <Users size={15} style={{ color: '#0b57d0' }} />;
      case 'client':
        return <Building2 size={15} style={{ color: '#0f766e' }} />;
      case 'project':
        return <FolderPlus size={15} style={{ color: '#4f46e5' }} />;
      case 'task':
        return <CheckSquare size={15} style={{ color: '#d97706' }} />;
      case 'keep-note':
        return <StickyNote size={15} style={{ color: '#9333ea' }} />;
      default:
        return <FileEdit size={15} style={{ color: '#0284c7' }} />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: '96px',
        zIndex: 99998,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: '10px',
        maxWidth: 'calc(100vw - 120px)',
        pointerEvents: 'none',
      }}
      aria-label="Minimized compose tabs"
    >
      {minimizedDrafts.map((draft) => {
        return (
          <div
            key={draft.key}
            style={{
              pointerEvents: 'auto',
              width: '260px',
              height: '44px',
              backgroundColor: '#f2f6fc',
              color: '#041e49',
              border: '1px solid #d3e3fd',
              borderBottom: 'none',
              borderRadius: '12px 12px 0 0',
              padding: '0 12px',
              boxShadow: '0 -4px 16px -2px rgba(0, 0, 0, 0.12), 0 -2px 6px -1px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background-color 0.15s ease, transform 0.15s ease',
              animation: 'dockSlideUp 0.2s ease-out forwards',
            }}
            onClick={() => restoreModal(draft.key)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e8f0fe';
              e.currentTarget.style.borderColor = '#c2e7ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f2f6fc';
              e.currentTarget.style.borderColor = '#d3e3fd';
            }}
            title="Click to resume editing draft"
          >
            {/* Left Icon + Title (Gmail styled) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflow: 'hidden',
                flex: 1,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {getIcon(draft.type)}
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#041e49',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'inherit',
                  letterSpacing: '-0.01em',
                }}
              >
                {draft.title}
              </span>
            </div>

            {/* Right Action Controls: Maximize & Close */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  restoreModal(draft.key);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '5px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#444746',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s',
                }}
                title="Restore modal"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.06)';
                  e.currentTarget.style.color = '#1f1f1f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#444746';
                }}
              >
                <Maximize2 size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearDraft(draft.key);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '5px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#444746',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s',
                }}
                title="Discard draft"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#444746';
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        );
      })}

      <style jsx global>{`
        @keyframes dockSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
