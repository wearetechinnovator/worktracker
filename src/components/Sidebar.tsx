'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	LayoutDashboard, Folder, Users, FileBarChart, Calendar, ChevronRight, ChevronLeft, ChevronDown, LogOut, Clock, Settings, CheckSquare, History, Briefcase, FileText, Mail, Copy, Loader2, Menu, X
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import { getClientPunchLocation } from '@/lib/geoClient';
import { staticClient } from '@/lib/staticClient';

export default function Sidebar() {
	const pathname = usePathname();
	const [user, setUser] = useState<any>(null);
	const [isPunchedIn, setIsPunchedIn] = useState(false);
	const [canPunchOut, setCanPunchOut] = useState(false);
	const [adminAllowedOut, setAdminAllowedOut] = useState(false);
	const [checkingPunch, setCheckingPunch] = useState(true);
	const [shiftTimes, setShiftTimes] = useState<{ punchOutStartTime?: string; punchOutEndTime?: string } | null>(null);

	// Punch Out Mail Modal States
	const [showPunchOutModal, setShowPunchOutModal] = useState(false);
	const [mailReportContent, setMailReportContent] = useState('');
	const [isPunchingOut, setIsPunchingOut] = useState(false);

	const [isCollapsed, setIsCollapsed] = useState(false);

	// Submenu Accordion Toggle State
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
		work: true,
		time: true,
		org: true,
	});

	// Collapsed Sidebar Floating Tooltip Portal State
	const [hoveredTooltip, setHoveredTooltip] = useState<{ title: string; top: number } | null>(null);

	const handleItemMouseEnter = (title: string, e: React.MouseEvent) => {
		if (isCollapsed) {
			const rect = e.currentTarget.getBoundingClientRect();
			setHoveredTooltip({ title, top: rect.top + rect.height / 2 });
		}
	};

	const handleItemMouseLeave = () => {
		setHoveredTooltip(null);
	};

	useEffect(() => {
		const storedCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
		setIsCollapsed(storedCollapsed);
	}, []);

	const toggleCollapse = () => {
		const nextState = !isCollapsed;
		setIsCollapsed(nextState);
		localStorage.setItem('sidebar_collapsed', String(nextState));
	};

	useEffect(() => {
		const loadCurrentUser = async () => {
			try {
				const response = await fetch("/api/auth/me", {
					method: "GET",
					credentials: "include",
					cache: "no-store",
				});

				const result = await response.json();

				if (!response.ok || !result.success || !result.user) {
					setUser(null);
					return;
				}

				setUser(result.user);
			} catch (error) {
				console.error("Failed to load current user:", error);
				setUser(null);
			}
		};

		loadCurrentUser();
	}, [pathname]);

	// Check punch status for employees
	useEffect(() => {
		const checkPunchStatus = async () => {
			if (!user) {
				setCheckingPunch(false);
				return;
			}

			// Admin doesn't need punch check
			if (Number(user.user_role) === 1) {
				setIsPunchedIn(true);
				setCheckingPunch(false);
				return;
			}

			const punch = staticClient.getPunchStatus();
			setIsPunchedIn(punch.isPunchedIn);
			setCanPunchOut(punch.canPunchOut);
			setCheckingPunch(false);
		};

		if (user) {
			checkPunchStatus();
		} else {
			setCheckingPunch(false);
		}

		const handlePunchStatusChange = () => {
			if (user) {
				checkPunchStatus();
			}
		};

		window.addEventListener('punch-status-changed', handlePunchStatusChange);
		return () => {
			window.removeEventListener('punch-status-changed', handlePunchStatusChange);
		};
	}, [user, pathname]);

	// Validate if current employee can punch out based on shift settings
	useEffect(() => {
		if (!user || Number(user.user_role) === 1 || adminAllowedOut) {
			setCanPunchOut(true);
			return;
		}

		if (!shiftTimes || !shiftTimes.punchOutStartTime || !shiftTimes.punchOutEndTime) {
			setCanPunchOut(true);
			return;
		}

		const checkWindow = () => {
			const now = new Date();
			const currentMins = now.getHours() * 60 + now.getMinutes();

			const [startH, startM] = shiftTimes.punchOutStartTime!.split(':').map(Number);
			const [endH, endM] = shiftTimes.punchOutEndTime!.split(':').map(Number);

			const startMins = startH * 60 + startM;
			const endMins = endH * 60 + endM;

			let isAllowed = false;
			if (startMins <= endMins) {
				isAllowed = currentMins >= startMins && currentMins <= endMins;
			} else {
				isAllowed = currentMins >= startMins || currentMins <= endMins;
			}

			setCanPunchOut(isAllowed);
		};

		checkWindow();
		const interval = setInterval(checkWindow, 30000);
		return () => clearInterval(interval);
	}, [user, shiftTimes]);

	const handleLogout = async () => {
		try {
			const response = await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				console.error('Logout failed:', result.message);
				return;
			}

			// Remove old client-side user data if it still exists
			localStorage.removeItem('worktracker_user');

			// Redirect only after server session is cleared
			window.location.assign('/login');
		} catch (error) {
			console.error('Logout error:', error);
		}
	};

	const openPunchOutModal = async () => {
		const today = new Date().toISOString().split('T')[0];
		const reportText = `Daily Work Summary (${today})\n\nShift punch out report completed.`;
		setMailReportContent(reportText);
		setShowPunchOutModal(true);
	};

	const confirmPunchOut = async () => {
		try {
			setIsPunchingOut(true);

			staticClient.togglePunch();

			const response = await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				console.error('Logout failed:', result.message);
				return;
			}

			localStorage.removeItem('worktracker_user');

			window.location.assign('/login');
		} catch (error) {
			console.error('Punch out / logout error:', error);
		} finally {
			setIsPunchingOut(false);
		}
	};

	const toggleGroup = (groupKey: string) => {
		setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
	};

	const [isMobileOpen, setIsMobileOpen] = useState(false);

	const userRole = Number(user?.user_role);
	const isAdmin = userRole === 1;
	const basePath = isAdmin ? '/admin' : '/user';
	const canAccessFeatures = isAdmin || isPunchedIn;


	useEffect(() => {
		setIsMobileOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (
			pathname.startsWith(`${basePath}/project`) ||
			pathname.startsWith(`${basePath}/tasks`) ||
			pathname.startsWith(`${basePath}/task-history`)
		) {
			setOpenGroups((prev) => ({ ...prev, work: true }));
		} else if (
			pathname.startsWith(`${basePath}/punch`) ||
			pathname.startsWith(`${basePath}/attendance`) ||
			pathname.startsWith(`${basePath}/punch-in-out`)
		) {
			setOpenGroups((prev) => ({ ...prev, time: true }));
		} else if (
			pathname.startsWith(`${basePath}/employees`) ||
			pathname.startsWith(`${basePath}/departments`) ||
			pathname.startsWith(`${basePath}/roles`) ||
			pathname.startsWith(`${basePath}/clients`)
		) {
			setOpenGroups((prev) => ({ ...prev, org: true }));
		}
	}, [pathname, basePath]);

	if (!user || pathname === '/login') return null;

	return (
		<>
			{/* MOBILE TOP BAR (Shown on mobile screens <= 768px) */}
			<div className="mobile-top-bar">
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<button
						type="button"
						onClick={() => setIsMobileOpen(!isMobileOpen)}
						style={{
							background: 'none',
							border: 'none',
							padding: '6px',
							cursor: 'pointer',
							color: '#0f172a',
							display: 'flex',
							alignItems: 'center',
						}}
						title="Toggle Navigation Menu"
					>
						{isMobileOpen ? <X size={22} /> : <Menu size={22} />}
					</button>

					<Link href="/" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}>
						Quanto Track
					</Link>
				</div>

				{user && (
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<div className="avatar" style={{ backgroundColor: user.avatarColor || '#3b82f6', width: '28px', height: '28px', fontSize: '0.72rem', fontWeight: 700 }}>
							{user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
						</div>
					</div>
				)}
			</div>

			{/* MOBILE BACKDROP OVERLAY */}
			<div
				className={`sidebar-mobile-backdrop ${isMobileOpen ? 'show' : ''}`}
				onClick={() => setIsMobileOpen(false)}
			/>

			<aside className={`sidebar no-print ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
				<div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

					{/* TOP HEADER SECTION */}
					<div style={{ flexShrink: 0 }}>
						{/* Brand Header */}
						<div className="sidebar-header" style={{ marginBottom: isCollapsed ? '10px' : '14px' }}>
							<div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: isCollapsed ? '6px' : '8px' }}>
								{!isCollapsed ? (
									<Link href="/" className="sidebar-brand" style={{ margin: 0 }}>
										<span style={{ fontWeight: 800 }}>Quanto Track</span>
									</Link>
								) : (
									<Link href="/" className="sidebar-brand" style={{ fontSize: '1.1rem', fontWeight: 900, textAlign: 'center', margin: 0, color: 'var(--accent-primary)' }} title="Quanto Track">
										QT
									</Link>
								)}
								<button
									onClick={toggleCollapse}
									className="sidebar-toggle-btn"
									style={{
										background: isCollapsed ? 'var(--bg-tertiary)' : 'none',
										border: 'none',
										color: 'var(--text-muted)',
										cursor: 'pointer',
										padding: '5px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										borderRadius: '6px',
										transition: 'all 0.2s ease',
										width: isCollapsed ? '32px' : 'auto',
										height: isCollapsed ? '32px' : 'auto',
									}}
									title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
								>
									{isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={18} />}
								</button>
							</div>
						</div>

						{/* Punch Status Indicator for Employees */}
						{!isAdmin && !checkingPunch && (
							<div
								style={{
									margin: isCollapsed ? '8px 4px' : '8px 4px 12px 4px',
									padding: isCollapsed ? '10px' : '10px 12px',
									background: isPunchedIn ? '#ecfdf5' : '#fef2f2',
									borderRadius: '8px',
									display: 'flex',
									justifyContent: isCollapsed ? 'center' : 'flex-start',
									alignItems: 'center',
									color: isPunchedIn ? '#065f46' : '#991b1b',
								}}
								title={isPunchedIn ? 'Punched In' : 'Not Punched'}
							>
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									fontWeight: 600
								}}>
									<Clock size={16} />
									{!isCollapsed && <span style={{ fontSize: '0.8rem' }}>{isPunchedIn ? 'Punched In' : 'Not Punched'}</span>}
								</div>
							</div>
						)}
					</div>

					{/* MIDDLE SCROLLABLE MENU SECTION */}
					<div className="sidebar-menu-section" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px' }}>
						<div className="sidebar-menu-title">Navigation</div>
						<nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>

							{/* 1. DASHBOARD */}
							{canAccessFeatures ? (
								<Link
									href={`${basePath}/dashboard`}
									className={`sidebar-link ${pathname === `${basePath}/dashboard` ? 'active' : ''}`}
									onMouseEnter={(e) => handleItemMouseEnter('Dashboard', e)}
									onMouseLeave={handleItemMouseLeave}
								>
									<LayoutDashboard size={17} />
									<span>Dashboard</span>
								</Link>
							) : (
								<div
									className="sidebar-link"
									style={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
									onMouseEnter={(e) => handleItemMouseEnter('Dashboard (Locked)', e)}
									onMouseLeave={handleItemMouseLeave}
								>
									<LayoutDashboard size={17} />
									<span>Dashboard</span>
								</div>
							)}

							{/* 2. WORK & PROJECTS SUBMENU */}
							<div className="sidebar-group">
								<div
									className={`sidebar-group-header ${pathname.startsWith(`${basePath}/project`) || pathname.startsWith(`${basePath}/tasks`) || pathname.startsWith(`${basePath}/task-history`) ? 'active-group' : ''}`}
									onClick={() => toggleGroup('work')}
								>
									<div className="sidebar-group-title">
										<Folder size={17} />
										<span>Work & Projects</span>
									</div>
									<ChevronDown
										size={14}
										className="chevron-icon"
										style={{
											transform: openGroups.work ? 'rotate(180deg)' : 'rotate(0deg)',
											transition: 'transform 0.2s ease',
											color: 'var(--text-muted)',
										}}
									/>
								</div>

								{(openGroups.work || isCollapsed) && (
									<div className="sidebar-submenu">
										{canAccessFeatures ? (
											<Link
												href={`${basePath}/project`}
												className={`sidebar-link ${pathname === `${basePath}/project` ? 'active' : ''}`}
												onMouseEnter={(e) => handleItemMouseEnter('Projects', e)}
												onMouseLeave={handleItemMouseLeave}
											>
												<Folder size={15} />
												<span>Projects</span>
											</Link>
										) : (
											<div
												className="sidebar-link"
												style={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
												onMouseEnter={(e) => handleItemMouseEnter('Project (Locked)', e)}
												onMouseLeave={handleItemMouseLeave}
											>
												<Folder size={15} />
												<span>Project</span>
											</div>
										)}

										<Link
											href={`${basePath}/tasks`}
											className={`sidebar-link ${pathname === `${basePath}/tasks` ? 'active' : ''}`}
											onMouseEnter={(e) => handleItemMouseEnter(isAdmin ? 'Tasks' : 'My Tasks', e)}
											onMouseLeave={handleItemMouseLeave}
										>
											<CheckSquare size={15} />
											<span>{isAdmin ? 'Tasks' : 'My Tasks'}</span>
										</Link>

										<Link
											href={`${basePath}/task-history`}
											className={`sidebar-link ${pathname === `${basePath}/task-history` ? 'active' : ''}`}
											onMouseEnter={(e) => handleItemMouseEnter(isAdmin ? 'Task History' : 'My Work History', e)}
											onMouseLeave={handleItemMouseLeave}
										>
											<History size={15} />
											<span>{isAdmin ? 'Task History' : 'My Work History'}</span>
										</Link>
									</div>
								)}
							</div>

							{/* 3. TIME & ATTENDANCE SUBMENU */}
							<div className="sidebar-group">
								<div
									className={`sidebar-group-header ${pathname.startsWith(`${basePath}/punch`) || pathname.startsWith(`${basePath}/attendance`) || pathname.startsWith(`${basePath}/punch-in-out`) ? 'active-group' : ''}`}
									onClick={() => toggleGroup('time')}
								>
									<div className="sidebar-group-title">
										<Clock size={17} />
										<span>Time & Attendance</span>
									</div>
									<ChevronDown
										size={14}
										className="chevron-icon"
										style={{
											transform: openGroups.time ? 'rotate(180deg)' : 'rotate(0deg)',
											transition: 'transform 0.2s ease',
											color: 'var(--text-muted)',
										}}
									/>
								</div>

								{(openGroups.time || isCollapsed) && (
									<div className="sidebar-submenu">
										<Link
											href={`${basePath}/punch`}
											className={`sidebar-link ${pathname === `${basePath}/punch` ? 'active' : ''}`}
											onMouseEnter={(e) => handleItemMouseEnter('Punch In/Out', e)}
											onMouseLeave={handleItemMouseLeave}
										>
											<Clock size={15} />
											<span>Punch In/Out</span>
										</Link>

										<Link
											href={`${basePath}/attendance`}
											className={`sidebar-link ${pathname === `${basePath}/attendance` ? 'active' : ''}`}
											onMouseEnter={(e) => handleItemMouseEnter(isAdmin ? 'Punch Logs' : 'Attendance', e)}
											onMouseLeave={handleItemMouseLeave}
										>
											<Calendar size={15} />
											<span>{isAdmin ? 'Punch Logs' : 'Attendance'}</span>
										</Link>
									</div>
								)}
							</div>

							{/* 4. ORGANISATION / TEAM SUBMENU (Admin & Allowed Staff) */}
							{(isAdmin || canAccessFeatures) && (
								<div className="sidebar-group">
									<div
										className={`sidebar-group-header ${pathname.startsWith(`${basePath}/employees`) || pathname.startsWith(`${basePath}/departments`) || pathname.startsWith(`${basePath}/roles`) || pathname.startsWith(`${basePath}/clients`) ? 'active-group' : ''}`}
										onClick={() => toggleGroup('org')}
									>
										<div className="sidebar-group-title">
											<Users size={17} />
											<span>Organisation</span>
										</div>
										<ChevronDown
											size={14}
											className="chevron-icon"
											style={{
												transform: openGroups.org ? 'rotate(180deg)' : 'rotate(0deg)',
												transition: 'transform 0.2s ease',
												color: 'var(--text-muted)',
											}}
										/>
									</div>

									{(openGroups.org || isCollapsed) && (
										<div className="sidebar-submenu">
											{isAdmin && (
												<Link
													href={`${basePath}/employees`}
													className={`sidebar-link ${pathname === `${basePath}/employees` ? 'active' : ''}`}
													onMouseEnter={(e) => handleItemMouseEnter('Employee', e)}
													onMouseLeave={handleItemMouseLeave}
												>
													<Users size={15} />
													<span>Employees</span>
												</Link>
											)}

											<Link
												href={`${basePath}/departments`}
												className={`sidebar-link ${pathname === `${basePath}/departments` ? 'active' : ''}`}
												onMouseEnter={(e) => handleItemMouseEnter('Departments', e)}
												onMouseLeave={handleItemMouseLeave}
											>
												<Folder size={15} />
												<span>Departments</span>
											</Link>

											{isAdmin && (
												<>
													<Link
														href={`${basePath}/roles`}
														className={`sidebar-link ${pathname === `${basePath}/roles` ? 'active' : ''}`}
														onMouseEnter={(e) => handleItemMouseEnter('Roles', e)}
														onMouseLeave={handleItemMouseLeave}
													>
														<Briefcase size={15} />
														<span>Roles</span>
													</Link>

													<Link
														href={`${basePath}/clients`}
														className={`sidebar-link ${pathname === `${basePath}/clients` ? 'active' : ''}`}
														onMouseEnter={(e) => handleItemMouseEnter('Clients', e)}
														onMouseLeave={handleItemMouseLeave}
													>
														<Briefcase size={15} />
														<span>Clients</span>
													</Link>
												</>
											)}
										</div>
									)}
								</div>
							)}

							{/* 5. PERSONAL WORKSPACE */}
							<Link
								href={`${basePath}/keep-notes`}
								className={`sidebar-link ${pathname === `${basePath}/keep-notes` ? 'active' : ''}`}
								onMouseEnter={(e) => handleItemMouseEnter('Keep Notes', e)}
								onMouseLeave={handleItemMouseLeave}
							>
								<FileText size={17} />
								<span>Keep Notes</span>
							</Link>

							{/* 6. SYSTEM SETTINGS (Admin Only) */}
							{isAdmin && (
								<Link
									href={`${basePath}/settings`}
									className={`sidebar-link ${pathname === `${basePath}/settings` ? 'active' : ''}`}
									onMouseEnter={(e) => handleItemMouseEnter('Settings', e)}
									onMouseLeave={handleItemMouseLeave}
								>
									<Settings size={17} />
									<span>Settings</span>
								</Link>
							)}

						</nav>
					</div>

					{/* BOTTOM STICKY FOOTER SECTION (User Info & Logout) */}
					{user && (
						<div
							style={{
								marginTop: 'auto',
								borderTop: '1px solid var(--border-color)',
								paddingTop: '12px',
								paddingBottom: '4px',
								flexShrink: 0,
								background: 'var(--bg-secondary)',
								zIndex: 10,
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isCollapsed ? '8px' : '12px', padding: '0 4px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
								<div className="avatar" style={{ backgroundColor: user.avatarColor || '#3b82f6', width: isCollapsed ? '32px' : '28px', height: isCollapsed ? '32px' : '28px', fontSize: '0.75rem', flexShrink: 0 }} title={user.name}>
									{user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
								</div>
								{!isCollapsed && (
									<div style={{ overflow: 'hidden' }}>
										<div style={{ fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
										<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.userType}</div>
									</div>
								)}
							</div>
							{!isAdmin && isPunchedIn && (
								<button
									onClick={canPunchOut ? openPunchOutModal : undefined}
									className="btn btn-punchout"
									disabled={!canPunchOut}
									style={{
										width: '100%',
										padding: isCollapsed ? '10px 8px' : '10px 12px',
										fontSize: isCollapsed ? '0' : '0.8rem',
										fontWeight: 700,
										marginBottom: isCollapsed ? '6px' : '10px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: isCollapsed ? '0' : '6px',
									}}
									title={canPunchOut ? 'Punch Out Now' : 'Punch out is currently restricted outside shift hours'}
								>
									<Clock size={18} />
									{!isCollapsed && <span>Punch Out</span>}
								</button>
							)}
							{(isAdmin || !isPunchedIn) && (
								<button
									onClick={handleLogout}
									className="btn btn-danger"
									style={{
										width: '100%',
										padding: isCollapsed ? '10px 8px' : '10px 12px',
										fontSize: isCollapsed ? '0' : '0.8rem',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: isCollapsed ? '0' : '6px'
									}}
									title="Logout"
								>
									<LogOut size={16} />
									{!isCollapsed && <span>Logout</span>}
								</button>
							)}
						</div>
					)}
				</div>

				{/* Punch Out & Daily Work Mail Modal */}
				{showPunchOutModal && (
					<div
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							background: 'rgba(0,0,0,0.7)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 99999,
							padding: '20px',
						}}
						onClick={() => setShowPunchOutModal(false)}
					>
						<div
							className="card"
							style={{
								maxWidth: '550px',
								width: '100%',
								maxHeight: '90vh',
								overflow: 'auto',
								position: 'relative',
								background: 'var(--bg-secondary)',
								color: 'var(--text-primary)',
								borderRadius: '12px',
								padding: '24px',
								boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
								<h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
									<Mail size={20} style={{ color: 'var(--accent-primary)' }} />
									Daily Work Mail & Punch Out
								</h3>
								<button
									onClick={() => setShowPunchOutModal(false)}
									className="btn"
									style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
								>
									✕
								</button>
							</div>

							<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
								Review your generated daily work report mail before finalizing your punch out:
							</p>

							<div style={{ marginBottom: '16px' }}>
								<textarea
									className="form-control"
									readOnly
									rows={10}
									style={{
										fontFamily: 'monospace',
										fontSize: '0.78rem',
										lineHeight: '1.5',
										background: 'var(--bg-tertiary)',
										resize: 'vertical',
										width: '100%'
									}}
									value={mailReportContent}
								/>
							</div>

							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
								<button
									type="button"
									className="btn btn-secondary"
									onClick={() => setShowPunchOutModal(false)}
									disabled={isPunchingOut}
								>
									Cancel
								</button>
								<button
									type="button"
									className="btn btn-secondary"
									onClick={() => {
										navigator.clipboard.writeText(mailReportContent);
										alert('Mail report copied to clipboard!');
									}}
									style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
								>
									<Copy size={14} />
									<span>Copy Mail</span>
								</button>
								<button
									type="button"
									className="btn btn-primary"
									onClick={confirmPunchOut}
									disabled={isPunchingOut}
									style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
								>
									{isPunchingOut ? (
										<>
											<Loader2 className="animate-spin" size={14} />
											<span>Punching Out...</span>
										</>
									) : (
										<>
											<Clock size={14} />
											<span>Confirm Punch Out</span>
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				)}
				{/* FIXED TOOLTIP PORTAL FOR COLLAPSED SIDEBAR */}
				{isCollapsed && hoveredTooltip && (
					<div
						style={{
							position: 'fixed',
							left: '74px',
							top: `${hoveredTooltip.top}px`,
							transform: 'translateY(-50%)',
							background: '#0f172a',
							color: '#ffffff',
							padding: '5px 11px',
							borderRadius: '6px',
							fontSize: '0.73rem',
							fontWeight: 700,
							whiteSpace: 'nowrap',
							boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
							zIndex: 999999,
							pointerEvents: 'none',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<div
							style={{
								position: 'absolute',
								left: '-5px',
								top: '50%',
								transform: 'translateY(-50%)',
								width: 0,
								height: 0,
								borderTop: '5px solid transparent',
								borderBottom: '5px solid transparent',
								borderRight: '5px solid #0f172a',
							}}
						/>
						{hoveredTooltip.title}
					</div>
				)}
			</aside>
		</>
	);
}
