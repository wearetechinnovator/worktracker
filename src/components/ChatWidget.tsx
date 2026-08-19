'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, Send, Smile, Bold, Italic, Code, Minimize2,
  ChevronRight, ChevronLeft, Hash, Lock, Search
} from 'lucide-react';
import '@/app/chat.css';

interface UserSession {
  _id: string;
  name: string;
  email: string;
  role: string;
  userType: 'admin' | 'employee';
  avatarColor?: string;
  Project?: string;
}

interface ChatMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  Project: string;
  status: string;
  avatarColor: string;
  userType: 'admin' | 'employee';
  onlineStatus: 'offline' | 'online' | 'wfh' | 'sick_leave' | 'leave';
}

interface ProjectData {
  _id: string;
  name: string;
  color: string;
  members: any[];
}

interface Reaction {
  emoji: string;
  users: string[]; // User IDs
}

interface ChatMessage {
  _id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatarColor: string;
  senderRole: string;
  content: string;
  reactions: Reaction[];
  createdAt: string;
}

export default function ChatWidget() {
  const pathname = usePathname();
  
  // Visibility States
  const [user, setUser] = useState<UserSession | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Position State (for dragging)
  const [position, setPosition] = useState({ x: 20, y: 20 }); // will be set in useEffect relative to window size

  // Data States
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeChannelId, setActiveChannelId] = useState('#general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Unread badge counts per channel
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});

  // Refs for scroll and drag
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track last fetched message timestamp to fetch incrementally
  const lastFetchedTimeRef = useRef<string>('');

  // Dimensions of chat window
  const chatWidth = 460;
  const chatHeight = 580;

  const setDefaultPosition = () => {
    if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - chatWidth - 30,
        y: window.innerHeight - chatHeight - 30
      });
    }
  };

  // 1. Initial configuration and local storage loads
  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('worktracker_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, [pathname]);

  // Set initial position on mount or when window loads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem('chat_window_position');
      if (savedPosition) {
        try {
          const parsed = JSON.parse(savedPosition);
          // Verify it's in viewport
          const x = Math.min(Math.max(0, parsed.x), window.innerWidth - chatWidth);
          const y = Math.min(Math.max(0, parsed.y), window.innerHeight - chatHeight);
          setPosition({ x, y });
        } catch {
          setDefaultPosition();
        }
      } else {
        setDefaultPosition();
      }
    }
  }, []);

  // Keep inside viewport when window is resized
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const x = Math.min(Math.max(0, prev.x), window.innerWidth - chatWidth);
        const y = Math.min(Math.max(0, prev.y), window.innerHeight - chatHeight);
        return { x, y };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Fetch Projects and Members on open or login
  useEffect(() => {
    if (!user || !isOpen) return;

    const fetchInitialData = async () => {
      try {
        // Fetch employees & admins with status mapping
        const membersRes = await fetch('/api/chat/members');
        const membersData = await membersRes.json();
        if (membersData.success) {
          setMembers(membersData.data.filter((m: ChatMember) => m._id !== user._id));
        }

        // Fetch projects for user
        const projectsUrl = user.userType === 'admin' 
          ? '/api/projects' 
          : `/api/projects?employeeId=${user._id}`;
        const projectsRes = await fetch(projectsUrl);
        const projectsData = await projectsRes.json();
        if (projectsData.success) {
          setProjects(projectsData.data);
        }
      } catch (err) {
        console.error('Error fetching initial chat metadata:', err);
      }
    };

    fetchInitialData();
  }, [user, isOpen]);

  // 3. Scroll to Bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // 4. Fetch messages when active channel changes
  const fetchMessages = useCallback(async (channelId: string, isInitial: boolean = false) => {
    try {
      let url = `/api/chat/messages?channelId=${encodeURIComponent(channelId)}`;
      
      // If we are polling and have a baseline time, fetch incrementally
      if (!isInitial && lastFetchedTimeRef.current) {
        url += `&since=${encodeURIComponent(lastFetchedTimeRef.current)}`;
      }

      const res = await fetch(url);
      const result = await res.json();

      if (result.success && result.data) {
        const fetchedMessages: ChatMessage[] = result.data;
        
        if (isInitial) {
          setMessages(fetchedMessages);
          if (fetchedMessages.length > 0) {
            lastFetchedTimeRef.current = fetchedMessages[fetchedMessages.length - 1].createdAt;
          } else {
            lastFetchedTimeRef.current = '';
          }
          // Reset unread count for this active channel
          setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
          setTimeout(() => scrollToBottom('auto'), 50);
        } else if (fetchedMessages.length > 0) {
          // Incrementally append new messages
          setMessages(prev => {
            // Filter out any duplicates just in case
            const existingIds = new Set(prev.map(m => m._id));
            const uniqueNew = fetchedMessages.filter(m => !existingIds.has(m._id));
            if (uniqueNew.length === 0) return prev;
            return [...prev, ...uniqueNew];
          });
          lastFetchedTimeRef.current = fetchedMessages[fetchedMessages.length - 1].createdAt;
          setTimeout(() => scrollToBottom('smooth'), 50);
        }
      }
    } catch (err) {
      console.error(`Error loading messages for channel ${channelId}:`, err);
    }
  }, []);

  // Set up message polling scheduler
  useEffect(() => {
    if (!user || !isOpen) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      return;
    }

    // Initial load
    fetchMessages(activeChannelId, true);

    // Setup polling every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages(activeChannelId, false);
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [user, isOpen, activeChannelId, fetchMessages]);

  // 5. Send a new message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user) return;

    const messageText = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = '40px';

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      channelId: activeChannelId,
      senderId: user._id,
      senderName: user.name,
      senderAvatarColor: user.avatarColor || '#3b82f6',
      senderRole: user.role,
      content: messageText,
      reactions: [],
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannelId,
          content: messageText
        })
      });
      const data = await res.json();
      if (data.success) {
        // Swap optimistic message with actual DB message
        setMessages(prev => prev.map(m => m._id === tempId ? data.data : m));
        lastFetchedTimeRef.current = data.data.createdAt;
      } else {
        // Remove optimistic message if error
        setMessages(prev => prev.filter(m => m._id !== tempId));
        alert('Failed to send message: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      console.error('Error sending message:', err);
    }
  };

  // 6. Handle emoji reaction toggle
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    // Optimistically update message reactions
    setMessages(prev => prev.map(msg => {
      if (msg._id !== messageId) return msg;

      const updatedReactions = [...msg.reactions];
      const reactionIdx = updatedReactions.findIndex(r => r.emoji === emoji);

      if (reactionIdx > -1) {
        const reaction = { ...updatedReactions[reactionIdx] };
        const userIdx = reaction.users.indexOf(user._id);

        if (userIdx > -1) {
          // Remove user reaction
          reaction.users = reaction.users.filter(id => id !== user._id);
          if (reaction.users.length === 0) {
            updatedReactions.splice(reactionIdx, 1);
          } else {
            updatedReactions[reactionIdx] = reaction;
          }
        } else {
          // Add user reaction
          reaction.users = [...reaction.users, user._id];
          updatedReactions[reactionIdx] = reaction;
        }
      } else {
        // Add new reaction object
        updatedReactions.push({ emoji, users: [user._id] });
      }

      return { ...msg, reactions: updatedReactions };
    }));

    try {
      await fetch('/api/chat/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji })
      });
    } catch (err) {
      console.error('Error updating reaction:', err);
    }
  };

  // 7. Draggable custom mouse events
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Don't drag if they clicked buttons inside header
    if ((e.target as HTMLElement).closest('.chat-header-btn')) return;

    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = Math.min(Math.max(0, moveEvent.clientX - dragStartRef.current.x), window.innerWidth - chatWidth);
      const newY = Math.min(Math.max(0, moveEvent.clientY - dragStartRef.current.y), window.innerHeight - chatHeight);
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      localStorage.setItem('chat_window_position', JSON.stringify({
        x: Math.min(Math.max(0, window.innerWidth - chatWidth - 30), position.x),
        y: Math.min(Math.max(0, window.innerHeight - chatHeight - 30), position.y)
      }));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Helper to format text inputs (bold, italic, code)
  const formatInputText = (prefix: string, suffix: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value;

    const selectedText = text.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    setInputText(
      text.substring(0, start) + replacement + text.substring(end)
    );

    // Refocus and place cursor inside formatting
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = start + prefix.length + selectedText.length;
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // Listen to Enter key inside textarea (Submit unless Shift key pressed)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get active channel metadata
  const getActiveChannelMeta = () => {
    if (activeChannelId.startsWith('dm-')) {
      // Find the recipient member
      const recipientId = activeChannelId.replace('dm-', '').replace(user?._id || '', '').replace('-', '');
      const recipient = members.find(m => m._id === recipientId);
      return {
        name: recipient ? recipient.name : 'Direct Message',
        isDm: true,
        description: recipient ? `${recipient.role} - ${recipient.status}` : 'Direct Message',
        status: recipient ? recipient.onlineStatus : 'offline'
      };
    }

    if (activeChannelId.startsWith('project-')) {
      const projId = activeChannelId.replace('project-', '');
      const proj = projects.find(p => p._id === projId);
      return {
        name: proj ? `#${proj.name.toLowerCase().replace(/\s+/g, '-')}` : '#project',
        isDm: false,
        description: `Project workroom for the team`,
        status: 'channel'
      };
    }

    // Default global channels
    const defaults: { [key: string]: { name: string, description: string } } = {
      '#general': { name: '#general', description: 'General company-wide discussions and information.' },
      '#announcements': { name: '#announcements', description: 'Important posts from administrators. Read-only for employees.' },
      '#random': { name: '#random', description: 'Fun stuff, memes, and casual conversations.' }
    };

    return {
      name: defaults[activeChannelId]?.name || activeChannelId,
      isDm: false,
      description: defaults[activeChannelId]?.description || 'Chat channel',
      status: 'channel'
    };
  };

  // Generate unique DM ID between user and recipient
  const getDmChannelId = (recipientId: string) => {
    if (!user) return '';
    const sortedIds = [user._id, recipientId].sort();
    return `dm-${sortedIds[0]}-${sortedIds[1]}`;
  };

  // Hide widget completely on login page or if user is not loaded
  if (pathname === '/login' || !user) return null;

  const currentChannel = getActiveChannelMeta();
  const isEmployeeAnnouncement = !activeChannelId.startsWith('dm-') && activeChannelId === '#announcements' && user.userType === 'employee';

  // Filter channels/members by search query
  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Sum total unreads (simulated in UI context)
  const totalUnread = Object.values(unreadCounts).reduce((acc, c) => acc + c, 0);

  return (
    <>
      {/* Minimized Float Action Button */}
      {!isOpen && (
        <button className="chat-fab" onClick={() => setIsOpen(true)} title="Open Team Chat">
          <MessageSquare size={28} />
          {totalUnread > 0 && <span className="chat-fab-badge">{totalUnread}</span>}
        </button>
      )}

      {/* Main Expanded Draggable Chat Window */}
      {isOpen && (
        <div
          className="chat-window"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`
          }}
        >
          {/* Header (Drag Handle) */}
          <div className="chat-header" ref={headerRef} onMouseDown={handleHeaderMouseDown}>
            <div className="chat-header-info">
              <MessageSquare size={16} />
              <span className="chat-header-title">TIS Workspace Chat</span>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-header-btn"
                onClick={() => setShowSidebar(prev => !prev)}
                title={showSidebar ? "Hide Rooms List" : "Show Rooms List"}
              >
                {showSidebar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
              <button
                className="chat-header-btn"
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          {/* Inner Layout Split */}
          <div className="chat-layout">
            
            {/* Rooms Sidebar */}
            <div className={`chat-sidebar ${showSidebar ? '' : 'collapsed'}`}>
              
              {/* Search Bar */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 6px', gap: '4px' }}>
                  <Search size={12} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search chat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'none', outline: 'none', fontSize: '11px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Channels Section */}
              <div className="chat-sidebar-section">
                <div className="chat-sidebar-title">Channels</div>
                <div className="chat-sidebar-list">
                  <div
                    className={`chat-sidebar-item ${activeChannelId === '#general' ? 'active' : ''}`}
                    onClick={() => setActiveChannelId('#general')}
                  >
                    <div className="chat-sidebar-item-left">
                      <Hash size={13} />
                      <span className="chat-sidebar-item-name">general</span>
                    </div>
                    {unreadCounts['#general'] > 0 && (
                      <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '8px' }}>
                        {unreadCounts['#general']}
                      </span>
                    )}
                  </div>

                  <div
                    className={`chat-sidebar-item ${activeChannelId === '#announcements' ? 'active' : ''}`}
                    onClick={() => setActiveChannelId('#announcements')}
                  >
                    <div className="chat-sidebar-item-left">
                      <Lock size={13} style={{ color: 'var(--accent-secondary)' }} />
                      <span className="chat-sidebar-item-name">announcements</span>
                    </div>
                    {unreadCounts['#announcements'] > 0 && (
                      <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '8px' }}>
                        {unreadCounts['#announcements']}
                      </span>
                    )}
                  </div>

                  <div
                    className={`chat-sidebar-item ${activeChannelId === '#random' ? 'active' : ''}`}
                    onClick={() => setActiveChannelId('#random')}
                  >
                    <div className="chat-sidebar-item-left">
                      <Hash size={13} />
                      <span className="chat-sidebar-item-name">random</span>
                    </div>
                    {unreadCounts['#random'] > 0 && (
                      <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '8px' }}>
                        {unreadCounts['#random']}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Projects Section */}
              {filteredProjects.length > 0 && (
                <div className="chat-sidebar-section" style={{ borderTop: '1px solid rgba(226,232,240,0.5)', paddingTop: '10px' }}>
                  <div className="chat-sidebar-title">Projects</div>
                  <div className="chat-sidebar-list">
                    {filteredProjects.map((p) => {
                      const channelId = `project-${p._id}`;
                      const isActive = activeChannelId === channelId;
                      return (
                        <div
                          key={p._id}
                          className={`chat-sidebar-item ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveChannelId(channelId)}
                        >
                          <div className="chat-sidebar-item-left">
                            <span style={{ color: p.color, fontWeight: 'bold', marginRight: '2px', fontSize: '12px' }}>#</span>
                            <span className="chat-sidebar-item-name">{p.name.toLowerCase().replace(/\s+/g, '-')}</span>
                          </div>
                          {unreadCounts[channelId] > 0 && (
                            <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '8px' }}>
                              {unreadCounts[channelId]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Direct Messages Section */}
              <div className="chat-sidebar-section" style={{ borderTop: '1px solid rgba(226,232,240,0.5)', paddingTop: '10px' }}>
                <div className="chat-sidebar-title">Direct Messages</div>
                <div className="chat-sidebar-list">
                  {filteredMembers.map((m) => {
                    const dmId = getDmChannelId(m._id);
                    const isActive = activeChannelId === dmId;
                    return (
                      <div
                        key={m._id}
                        className={`chat-sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveChannelId(dmId)}
                      >
                        <div className="chat-sidebar-item-left">
                          <span className={`status-dot ${m.onlineStatus}`} />
                          <span className="chat-sidebar-item-name">{m.name}</span>
                        </div>
                        {unreadCounts[dmId] > 0 && (
                          <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '8px' }}>
                            {unreadCounts[dmId]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '4px 16px' }}>No members found</div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="chat-body">
              
              {/* Active Channel Header */}
              <div className="chat-body-header">
                <div>
                  <div className="chat-body-header-title">
                    {currentChannel.isDm ? (
                      <span className={`status-dot ${currentChannel.status}`} style={{ width: '10px', height: '10px' }} />
                    ) : activeChannelId === '#announcements' ? (
                      <Lock size={14} style={{ color: 'var(--accent-secondary)' }} />
                    ) : (
                      <Hash size={14} style={{ color: 'var(--text-muted)' }} />
                    )}
                    {currentChannel.name}
                  </div>
                  <div className="chat-body-header-desc">{currentChannel.description}</div>
                </div>
              </div>

              {/* Messages Pane */}
              <div className="chat-messages-pane">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?._id;
                    const dateObj = new Date(msg.createdAt);
                    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={msg._id} className={`chat-message-row ${isMe ? 'me' : ''}`}>
                        
                        {/* Avatar */}
                        {!isMe && (
                          <div
                            className="chat-message-avatar"
                            style={{ backgroundColor: msg.senderAvatarColor || '#6366f1' }}
                            title={`${msg.senderName} (${msg.senderRole})`}
                          >
                            {msg.senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                        )}

                        {/* Content & Reactions */}
                        <div className="chat-message-bubble-wrapper">
                          
                          {/* Metadata */}
                          <div className="chat-message-meta">
                            <span className="chat-message-sender">{isMe ? 'You' : msg.senderName}</span>
                            <span>{timeStr}</span>
                          </div>

                          {/* Bubble Balloon */}
                          <div className="chat-message-bubble">
                            {/* Render basic text markup safely */}
                            <span style={{ whiteSpace: 'pre-wrap' }}>
                              {msg.content.startsWith('```') && msg.content.endsWith('```') ? (
                                <pre>
                                  <code>{msg.content.replace(/```/g, '').trim()}</code>
                                </pre>
                              ) : (
                                // Render markdown bold/italic tags
                                msg.content.split('\n').map((line, lIdx) => (
                                  <span key={lIdx}>
                                    {line.split(' ').map((word, wIdx) => {
                                      if (word.startsWith('**') && word.endsWith('**')) {
                                        return <strong key={wIdx}>{word.slice(2, -2)} </strong>;
                                      }
                                      if (word.startsWith('*') && word.endsWith('*')) {
                                        return <em key={wIdx}>{word.slice(1, -1)} </em>;
                                      }
                                      if (word.startsWith('`') && word.endsWith('`')) {
                                        return <code key={wIdx}>{word.slice(1, -1)} </code>;
                                      }
                                      return word + ' ';
                                    })}
                                    {lIdx < msg.content.split('\n').length - 1 && <br />}
                                  </span>
                                ))
                              )}
                            </span>

                            {/* Floating hover reactions */}
                            <div className="chat-hover-reactions">
                              {['👍', '❤️', '🔥', '😂'].map(emoji => (
                                <button
                                  key={emoji}
                                  className="chat-hover-reaction-btn"
                                  onClick={() => handleToggleReaction(msg._id, emoji)}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Reactions badges layout */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="chat-reactions-container">
                              {msg.reactions.map((r, idx) => {
                                const hasReacted = r.users.includes(user?._id || '');
                                return (
                                  <div
                                    key={idx}
                                    className={`chat-reaction-badge ${hasReacted ? 'active' : ''}`}
                                    onClick={() => handleToggleReaction(msg._id, r.emoji)}
                                    title={hasReacted ? "You reacted" : "Click to react"}
                                  >
                                    <span>{r.emoji}</span>
                                    <span>{r.users.length}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="chat-empty-state">
                    <MessageSquare size={36} className="chat-empty-icon" />
                    <div className="chat-empty-title">Welcome to #{currentChannel.name.replace('#', '')}!</div>
                    <div style={{ fontSize: '11px' }}>This is the start of this conversation room. Send a message to get started!</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Editor Area */}
              <div className="chat-editor-pane">
                {isEmployeeAnnouncement ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '6px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                    Only administrators are authorized to post announcements in this channel.
                  </div>
                ) : (
                  <>
                    {/* Toolbar */}
                    <div className="chat-editor-toolbar">
                      <div className="chat-editor-tools-left">
                        <button
                          className="chat-editor-tool-btn"
                          onClick={() => formatInputText('**', '**')}
                          title="Bold text"
                        >
                          <Bold size={13} />
                        </button>
                        <button
                          className="chat-editor-tool-btn"
                          onClick={() => formatInputText('*', '*')}
                          title="Italic text"
                        >
                          <Italic size={13} />
                        </button>
                        <button
                          className="chat-editor-tool-btn"
                          onClick={() => formatInputText('```\n', '\n```')}
                          title="Code block"
                        >
                          <Code size={13} />
                        </button>
                        <button
                          className="chat-editor-tool-btn"
                          onClick={() => setShowEmojiPicker(prev => !prev)}
                          title="Emoji picker"
                        >
                          <Smile size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Emoji Panel */}
                    {showEmojiPicker && (
                      <div className="chat-emoji-panel">
                        {['👍', '❤️', '🔥', '😂', '👏', '🎉', '🚀', '👀'].map((emoji) => (
                          <button
                            key={emoji}
                            className="chat-emoji-btn"
                            onClick={() => {
                              setInputText(prev => prev + emoji);
                              setShowEmojiPicker(false);
                              textareaRef.current?.focus();
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Input Field and Send */}
                    <div className="chat-input-row">
                      <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'flex-end' }}>
                        <textarea
                          ref={textareaRef}
                          className="chat-editor-textarea"
                          placeholder={`Message ${currentChannel.name}`}
                          value={inputText}
                          onChange={(e) => {
                            setInputText(e.target.value);
                            // Adjust height dynamically
                            e.target.style.height = '40px';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                          }}
                          onKeyDown={handleKeyDown}
                        />
                        <button
                          type="submit"
                          className="chat-editor-send-btn"
                          disabled={!inputText.trim()}
                          title="Send Message"
                        >
                          <Send size={15} />
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
