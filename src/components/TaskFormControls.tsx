'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Clock, ChevronDown, Check, Plus, Paperclip, X, Eye,
  FileText, Image as ImageIcon, Download, ChevronLeft, ChevronRight,
  Sparkles, ExternalLink
} from 'lucide-react';

/* ==========================================================================
   1. CUSTOM DROPDOWN COMPONENT
   ========================================================================== */
export interface DropdownOption {
  value: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
}

interface CustomDropdownProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  style?: React.CSSProperties;
}

export function CustomDropdown({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onChange,
  actionButton,
  style,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} ref={containerRef}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.75rem' }}>
            {label}
          </label>
          {actionButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actionButton.onClick();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '0 2px',
              }}
            >
              <Plus size={13} />
              <span>{actionButton.label}</span>
            </button>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          background: 'var(--bg-secondary)',
          border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: '0.8rem',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          textAlign: 'left',
          minHeight: '36px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {selectedOption?.color && (
            <span
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                backgroundColor: selectedOption.color,
                flexShrink: 0,
              }}
            />
          )}
          {selectedOption?.icon}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: selectedOption ? 600 : 400 }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badgeText && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: selectedOption.badgeBg || '#eff6ff',
                color: selectedOption.badgeColor || 'var(--accent-primary)',
              }}
            >
              {selectedOption.badgeText}
            </span>
          )}
        </div>
        <ChevronDown
          size={15}
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            marginLeft: '6px',
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1300,
            maxHeight: '230px',
            overflowY: 'auto',
            padding: '4px',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {actionButton && (
            <div
              onClick={() => {
                setIsOpen(false);
                actionButton.onClick();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--accent-primary)',
                background: '#eff6ff',
                cursor: 'pointer',
                marginBottom: '4px',
                border: '1px dashed rgba(59, 130, 246, 0.4)',
              }}
            >
              <Plus size={14} />
              <span>{actionButton.label}</span>
            </div>
          )}

          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value || '__empty__'}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {opt.color && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: opt.color,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {opt.icon}
                  <span>{opt.label}</span>
                  {opt.badgeText && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: opt.badgeBg || '#eff6ff',
                        color: opt.badgeColor || 'var(--accent-primary)',
                      }}
                    >
                      {opt.badgeText}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


/* ==========================================================================
   2. CUSTOM DATE PICKER COMPONENT
   ========================================================================== */
interface CustomDatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function CustomDatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  style,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view date
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth()); // 0-indexed

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const setPreset = (type: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
    if (type === 'clear') {
      onChange('');
      setIsOpen(false);
      return;
    }
    const d = new Date();
    if (type === 'tomorrow') d.setDate(d.getDate() + 1);
    if (type === 'nextWeek') d.setDate(d.getDate() + 7);

    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Format value for display (e.g., Aug 22, 2026)
  const formatDisplay = (val: string) => {
    if (!val) return '';
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const today = new Date();
  const isTodayYearMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDay = today.getDate();

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} ref={containerRef}>
      {label && <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>{label}</label>}

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.15s ease',
          height: '36px',
        }}
      >
        <div
          style={{
            padding: '0 10px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-tertiary)',
            borderRight: '1px solid var(--border-color)',
            color: 'var(--accent-primary)',
          }}
        >
          <Calendar size={15} />
        </div>
        <div style={{ padding: '0 10px', flex: 1, fontSize: '0.8rem', fontWeight: value ? 600 : 400, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value ? formatDisplay(value) : placeholder}
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '0 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Clear date"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1300,
            padding: '12px',
            width: '260px',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setPreset('today')}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 650,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPreset('tomorrow')}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 650,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setPreset('nextWeek')}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 650,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              +7 Days
            </button>
          </div>

          {/* Month / Year header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Days of week */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '6px' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isCurrentDay = isTodayYearMonth && todayDay === dayNum;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  style={{
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? 'var(--accent-primary)' : isCurrentDay ? '#eff6ff' : 'transparent',
                    color: isSelected ? '#ffffff' : isCurrentDay ? 'var(--accent-primary)' : 'var(--text-primary)',
                    border: isCurrentDay && !isSelected ? '1px solid var(--accent-primary)' : 'none',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: isSelected || isCurrentDay ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = isCurrentDay ? '#eff6ff' : 'transparent';
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


/* ==========================================================================
   3. CUSTOM TIME PICKER COMPONENT
   ========================================================================== */
interface CustomTimePickerProps {
  label?: string;
  value: string; // HH:MM in 24hr or 12hr
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function CustomTimePicker({
  label,
  value,
  onChange,
  placeholder = 'Select time',
  style,
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse time
  const parseTime = (val: string) => {
    if (!val) return { hours: 10, minutes: 0, ampm: 'AM' };
    const parts = val.split(':');
    let h = parseInt(parts[0] || '10', 10);
    const m = parseInt(parts[1] || '0', 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return { hours: h, minutes: m, ampm };
  };

  const { hours, minutes, ampm } = parseTime(value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const format24 = (h: number, m: number, ap: string) => {
    let hour24 = h;
    if (ap === 'PM' && h < 12) hour24 = h + 12;
    if (ap === 'AM' && h === 12) hour24 = 0;
    return `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const formatDisplay = (val: string) => {
    if (!val) return '';
    const { hours: h, minutes: m, ampm: ap } = parseTime(val);
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const setTimePreset = (h: number, m: number, ap: string) => {
    onChange(format24(h, m, ap));
    setIsOpen(false);
  };

  const commonPresets = [
    { label: '09:00 AM', h: 9, m: 0, ap: 'AM' },
    { label: '11:00 AM', h: 11, m: 0, ap: 'AM' },
    { label: '02:00 PM', h: 2, m: 0, ap: 'PM' },
    { label: '05:00 PM', h: 5, m: 0, ap: 'PM' },
    { label: '06:00 PM', h: 6, m: 0, ap: 'PM' },
    { label: '08:00 PM', h: 8, m: 0, ap: 'PM' },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} ref={containerRef}>
      {label && <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>{label}</label>}

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.15s ease',
          height: '36px',
        }}
      >
        <div
          style={{
            padding: '0 10px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-tertiary)',
            borderRight: '1px solid var(--border-color)',
            color: '#f59e0b',
          }}
        >
          <Clock size={15} />
        </div>
        <div style={{ padding: '0 10px', flex: 1, fontSize: '0.8rem', fontWeight: value ? 600 : 400, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value ? formatDisplay(value) : placeholder}
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '0 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Clear time"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Time Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1300,
            padding: '14px',
            width: '270px',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Quick presets */}
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
            QUICK SELECTION
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
            {commonPresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setTimePreset(p.h, p.m, p.ap)}
                style={{
                  padding: '5px 8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 650,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.color = 'var(--accent-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Time selectors */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              CUSTOM TIME
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Hour selector */}
              <select
                className="form-control"
                value={hours}
                onChange={(e) => onChange(format24(parseInt(e.target.value, 10), minutes, ampm))}
                style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem', height: '34px', minWidth: '50px' }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>

              <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>:</span>

              {/* Minute selector */}
              <select
                className="form-control"
                value={minutes}
                onChange={(e) => onChange(format24(hours, parseInt(e.target.value, 10), ampm))}
                style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem', height: '34px', minWidth: '50px' }}
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>

              {/* AM/PM toggle */}
              <div style={{ display: 'flex', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => onChange(format24(hours, minutes, 'AM'))}
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    background: ampm === 'AM' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: ampm === 'AM' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => onChange(format24(hours, minutes, 'PM'))}
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    background: ampm === 'PM' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: ampm === 'PM' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ==========================================================================
   4. CUSTOM FILE UPLOAD & PREVIEW GALLERY COMPONENT
   ========================================================================== */
export interface FileAttachmentItem {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface CustomFileAttachmentProps {
  label?: string;
  files: FileAttachmentItem[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  style?: React.CSSProperties;
}

export function CustomFileAttachment({
  label = 'Supporting Files',
  files,
  onUpload,
  onRemove,
  style,
}: CustomFileAttachmentProps) {
  const [lightboxImage, setLightboxImage] = useState<FileAttachmentItem | null>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (file: FileAttachmentItem) => {
    if (file.type && file.type.startsWith('image/')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext || '');
  };

  return (
    <div style={{ width: '100%', ...style }}>
      {label && <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>{label}</label>}

      {/* Dropzone trigger */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          border: '1.5px dashed var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-tertiary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.background = 'var(--bg-tertiary)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#eff6ff',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Paperclip size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Choose or drop supporting files
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Images, PDFs, documents, screenshots, and logs
            </div>
          </div>
        </div>

        <span
          className="btn btn-secondary btn-sm"
          style={{ pointerEvents: 'none', fontSize: '0.72rem', fontWeight: 700 }}
        >
          Choose
        </span>
        <input type="file" multiple style={{ display: 'none' }} onChange={onUpload} />
      </label>

      {/* File Preview Gallery */}
      {files && files.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '8px',
            maxHeight: '90px',
            overflowY: 'auto',
            padding: '2px',
          }}
        >
          {files.map((file, idx) => {
            const isImg = isImageFile(file);

            return (
              <div
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  maxWidth: '220px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Thumbnail / Icon */}
                {isImg && file.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={file.url}
                    alt={file.name}
                    onClick={() => setLightboxImage(file)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '3px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Click to preview image"
                  />
                ) : (
                  <Paperclip size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                )}

                {/* File name */}
                <span
                  style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                  }}
                  title={`${file.name} (${formatFileSize(file.size)})`}
                >
                  {file.name}
                </span>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0 2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Remove file"
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '24px',
          }}
          onClick={() => setLightboxImage(null)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {lightboxImage.name}
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
                borderRadius: '8px',
                padding: '8px',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ==========================================================================
   5. CUSTOM MULTIPLE LINKS COMPONENT
   ========================================================================== */
interface CustomMultipleLinksProps {
  label?: string;
  links: string[];
  onChange: (links: string[]) => void;
  style?: React.CSSProperties;
}

export function CustomMultipleLinks({
  label = 'URL / Resource Links',
  links = [],
  onChange,
  style,
}: CustomMultipleLinksProps) {
  const [inputUrl, setInputUrl] = useState('');

  const handleAddLink = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    if (!links.includes(trimmed)) {
      onChange([...links, trimmed]);
    }
    setInputUrl('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLink();
    }
  };

  const handleRemoveLink = (idx: number) => {
    onChange(links.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ width: '100%', ...style }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 0 }}>
            {label}
          </label>
          {links.length > 0 && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {links.length} {links.length === 1 ? 'link' : 'links'} added
            </span>
          )}
        </div>
      )}

      {/* Input container with matching height to file dropzone */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          border: '1.5px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-tertiary)',
          minHeight: '58px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#eff6ff',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ExternalLink size={16} />
        </div>

        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste URL (e.g. Figma, PR, Docs)..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.78rem',
            color: 'var(--text-primary)',
            minWidth: 0,
          }}
        />

        <button
          type="button"
          onClick={handleAddLink}
          disabled={!inputUrl.trim()}
          className="btn btn-secondary btn-sm"
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '5px 10px',
            flexShrink: 0,
            opacity: inputUrl.trim() ? 1 : 0.6,
            cursor: inputUrl.trim() ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Plus size={13} />
          <span>Add Link</span>
        </button>
      </div>

      {/* Added Links List - Compact chip pills */}
      {links.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '8px',
            maxHeight: '90px',
            overflowY: 'auto',
            padding: '2px',
          }}
        >
          {links.map((link, idx) => (
            <div
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.73rem',
                maxWidth: '220px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <ExternalLink size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <a
                href={link.startsWith('http') ? link : `https://${link}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
                title={link}
              >
                {link.replace(/^https?:\/\/(www\.)?/, '')}
              </a>

              <button
                type="button"
                onClick={() => handleRemoveLink(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0 2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove link"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

