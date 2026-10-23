'use client';

import dynamic from 'next/dynamic';
import { FileText, Loader2, Paperclip, StopCircle, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { CustomMultipleLinks } from '@/components/TaskFormControls';

const CKEditorComponent = dynamic(() => import('@/components/CKEditorWrapper'), { ssr: false });

export type EndWorkFile = {
  name: string;
  url: string;
  size?: number;
  type?: string;
};

interface EndWorkSessionModalProps {
  isOpen: boolean;
  completionStatus: 'partial' | 'full';
  onCompletionStatusChange: (status: 'partial' | 'full') => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  links: string;
  onLinksChange: (links: string) => void;
  files: EndWorkFile[];
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

const hasNotes = (notes: string) => notes.replace(/<[^>]*>/g, '').trim().length > 0;

export default function EndWorkSessionModal({
  isOpen,
  completionStatus,
  onCompletionStatusChange,
  notes,
  onNotesChange,
  links,
  onLinksChange,
  files,
  onFilesChange,
  onRemoveFile,
  onCancel,
  onSubmit,
  loading = false,
}: EndWorkSessionModalProps) {
  if (!isOpen) return null;

  const partialWithoutNotes = completionStatus === 'partial' && !hasNotes(notes);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            End Work Session
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="btn"
            disabled={loading}
            style={{ width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Add status, notes or links related to your work before ending the session.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="radio" name="completionStatus" checked={completionStatus === 'full'} onChange={() => onCompletionStatusChange('full')} />
              <span>Yes, Fully Completed</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="radio" name="completionStatus" checked={completionStatus === 'partial'} onChange={() => onCompletionStatusChange('partial')} />
              <span>No, Partially Done (Resume Later)</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
            Work Notes/Reason {completionStatus === 'partial' ? <span style={{ color: '#ef4444' }}>*</span>:''}
          </label>
          <CKEditorComponent value={notes} onChange={onNotesChange} />
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ width: '50%' }}>
            <div >
              <div>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Work Files (Optional)
                </label>
              </div>

              <div >
                <label htmlFor="end-work-file-upload" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <Paperclip size={15} /> Attach Files
                </label>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)'}}>Max 10 MB.</p>
              </div>

            </div>

            <input id="end-work-file-upload" type="file" multiple onChange={onFilesChange} style={{ display: 'none' }} />
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={15} />
                      <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    </div>
                    <button type="button" className="btn" onClick={() => onRemoveFile(index)} style={{ padding: '4px', flexShrink: 0 }} title="Remove file">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: '50%' }}>
            <div style={{ marginBottom: '24px' }}>
              <CustomMultipleLinks
                label="URL / Resource Links"
                links={links.split(/\n|,/).map((link) => link.trim()).filter(Boolean)}
                onChange={(nextLinks) => onLinksChange(nextLinks.join('\n'))}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={onSubmit} disabled={loading || partialWithoutNotes} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: partialWithoutNotes ? 0.6 : 1 }}>
                {loading ? <><Loader2 className="animate-spin" size={16} /><span>Ending...</span></> : <><StopCircle size={16} /><span>End Work</span></>}
              </button>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
