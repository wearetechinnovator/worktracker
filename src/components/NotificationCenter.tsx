'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, CheckCircle2, ClipboardList, ExternalLink, X } from 'lucide-react';
import { requestNotificationPermission, sendNativeNotification } from '@/lib/notifications';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'task' | 'punch' | 'system';
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 60, left: 160 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastFetchedIdRef = useRef<string | null>(null);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const desiredLeft = rect.left;
    const maxLeft = window.innerWidth - 350;
    setDropdownPos({
      top: rect.bottom + 8,
      left: Math.max(10, Math.min(desiredLeft, maxLeft)),
    });
    setIsOpen((prev) => !prev);
    if (!permissionGranted) handleEnablePermission();
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user._id}`);
      const result = await res.json();
      if (result.success) {
        const list: NotificationItem[] = result.data.notifications;
        const newUnread = result.data.unreadCount;

        // Check if a brand new unread notification arrived
        if (list.length > 0) {
          const newest = list[0];
          if (lastFetchedIdRef.current && newest._id !== lastFetchedIdRef.current && !newest.read) {
            // Trigger native OS notification
            sendNativeNotification(newest.title, newest.message, newest.link || '/tasks');
          }
          lastFetchedIdRef.current = newest._id;
        }

        setNotifications(list);
        setUnreadCount(newUnread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Check on tab focus
      const handleFocus = () => fetchNotifications();
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnablePermission = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const { granted, status } = await requestNotificationPermission();
    setPermissionGranted(granted);
    if (granted) {
      sendNativeNotification('🔔 Notifications Enabled', 'You will now receive instant desktop alerts for assigned tasks!', '/tasks');
    } else if (status === 'denied') {
      alert('Notifications are blocked in your browser settings. To enable them:\n\n1. Click the Lock/Settings icon in your browser address bar.\n2. Change Notifications setting to "Allow".\n3. Refresh the page.');
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const markSingleRead = async (id: string, link?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      if (link) {
        window.location.href = link;
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Icon Button */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          position: 'relative',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          transition: 'all 0.2s ease',
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-primary)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: '340px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
            zIndex: 99999,
            overflow: 'hidden',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={16} style={{ color: 'var(--accent-primary)' }} />
              Notifications
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Desktop Notification Enable Banner */}
          {!permissionGranted && (
            <div
              style={{
                padding: '10px 14px',
                background: '#eff6ff',
                borderBottom: '1px solid #dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.73rem',
                color: '#1e40af',
              }}
            >
              <span>Enable desktop alerts for new tasks</span>
              <button
                type="button"
                onClick={(e) => handleEnablePermission(e)}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Allow
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => markSingleRead(item._id, item.link)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    background: item.read ? 'transparent' : 'rgba(79, 70, 229, 0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: item.type === 'task' ? '#e0e7ff' : item.type === 'punch' ? '#dcfce7' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {item.type === 'task' ? (
                      <ClipboardList size={16} style={{ color: '#4f46e5' }} />
                    ) : item.type === 'punch' ? (
                      <Clock size={16} style={{ color: '#166534' }} />
                    ) : (
                      <CheckCircle2 size={16} style={{ color: '#4b5563' }} />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: item.read ? 600 : 800, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '3px 0 0 0', lineHeight: '1.35' }}>
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
