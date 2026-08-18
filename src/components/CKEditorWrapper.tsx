'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface CKEditorWrapperProps {
  value: string;
  onChange: (data: string) => void;
}

export default function CKEditorWrapper({ value, onChange }: CKEditorWrapperProps) {
  return (
    <div className="ck-editor-container" style={{ color: 'black' }}>
      <CKEditor
        editor={ClassicEditor as any}
        data={value}
        onChange={(_event: any, editor: any) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
      <style>{`
        .ck-editor__editable_inline {
          min-height: 150px;
        }
        .ck.ck-editor__main>.ck-editor__editable {
          background: #ffffff !important;
          color: #000000 !important;
        }
        .ck.ck-toolbar {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }
      `}</style>
    </div>
  );
}
