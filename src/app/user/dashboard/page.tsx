'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	Clock, Plus, Folder, Calendar, Users, UserPlus, Mail, ChevronRight,
	AlertCircle, X, Loader2, CheckSquare, Activity, ArrowUpRight, ArrowRight, ChevronDown,
	Paperclip, Link as LinkIcon, MessageSquare, MoreVertical, SlidersHorizontal,
	Info, TrendingUp, Bot, Sparkles, Target, Check, RotateCcw, ShieldCheck
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';
import MyTasks from '@/components/MyTasks';
import PageShimmer from '@/components/PageShimmer';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';
import { getClientPunchLocation } from '@/lib/geoClient';
import CreateProjectModal from '@/components/CreateProjectModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import dynamic from 'next/dynamic';

import './dashboard.css';


// ======================================
// ================ Types ===============
// ======================================

import type { WorkEntry } from '../../../types/WorkEntry';
import type { Employee } from '../../../types/Employee';
import type { Project } from '../../../types/Project';
import type { Task } from '../../../types/Task';
import type { DashboardStats } from '../../../types/DashboardStats';




const DEFAULT_DEMO_USER = {
	_id: 'emp-admin-101',
	id: 'emp-admin-101',
	name: 'Alex Johnson',
	email: 'alex.johnson@techinnovator.com',
	role: 'System Administrator',
	userType: 'admin',
	Project: 'AI WorkTracker Pro',
	avatarColor: '#4f46e5',
	workMode: 'Hybrid',
	isSystemAdmin: true,
	permissions: ['dashboard:view', 'projects:read', 'tasks:read', 'employees:read', 'roles:read', 'clients:read'],
	isPunchedIn: true,
};

const DEFAULT_INLINE_EMPLOYEES: Employee[] = [];
const DEFAULT_INLINE_PROJECTS: Project[] = [];

export default function Dashboard() {
	const router = useRouter();
	const [user, setUser] = useState<any>([]);

	// Data State initialized directly with inline data
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [projects, setProjects] = useState<Project[]>([]);
	const [entries, setEntries] = useState<WorkEntry[]>([]);
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Punch status
	const [isPunchedIn, setIsPunchedIn] = useState(true);
	const [canPunchOut, setCanPunchOut] = useState(true);

	// Live Date and Time
	const [liveTime, setLiveTime] = useState<string>('');
	const [liveDate, setLiveDate] = useState<string>('');

	// Modals
	const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
	const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
	const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
	const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

	// KPI Widget Customization & 3-Dot Settings State
	const [isKpiSettingsOpen, setIsKpiSettingsOpen] = useState(false);
	const [isEditWidgetsModalOpen, setIsEditWidgetsModalOpen] = useState(false);
	const [visibleKpiWidgets, setVisibleKpiWidgets] = useState<string[]>([
		'work_hours',
		'efficiency',
		'projects',
		'overdue_work',
		'team_utilization',
		'ai_adoption',
		'ai_impact',
		'ontime_delivery',
	]);
	// Team Punch Pagination
	const [teamPage, setTeamPage] = useState(1);

	// Selected Day for Timeline (default to today)
	const [selectedTimelineDate, setSelectedTimelineDate] = useState('');

	// Client Selection & Tasks State
	const [clientsList, setClientsList] = useState<any[]>([]);
	const [tasksList, setTasksList] = useState<Task[]>([]);

	// Analytics Trend Unit Selector State
	const [trendUnit, setTrendUnit] = useState<'Hours' | 'Days'>('Hours');
	const [isTrendUnitOpen, setIsTrendUnitOpen] = useState(false);

	// Work Log Form State
	const [workProjId, setWorkProjId] = useState('');
	const [workEmpId, setWorkEmpId] = useState('');
	const [workTitle, setWorkTitle] = useState('');
	const [workDate, setWorkDate] = useState('');
	const [workStart, setWorkStart] = useState('09:00');
	const [workEnd, setWorkEnd] = useState('17:00');
	const [workDesc, setWorkDesc] = useState('');
	const [submittingWork, setSubmittingWork] = useState(false);

	// Email Summary Modal State
	const [isMailModalOpen, setIsMailModalOpen] = useState(false);
	const [mailContent, setMailContent] = useState('');

	// Presets
	const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#475569'];
	const Projects = ['Design', 'Development', 'Marketing', 'Human Resource', 'Management'];
	const statuses = ['Active', 'Inactive'];
	const workmodes = ['Hybrid', 'Remote', 'Onsite'];


	const [tasksKey, setTasksKey] = useState(0);

	// AI Activity Tracking State
	const [aiSessionsData, setAiSessionsData] = useState<any[]>([]);
	const [aiMetricsData, setAiMetricsData] = useState<any>(null);
	const [isAiModalOpen, setIsAiModalOpen] = useState(false);

	const [isPunchingOut, setIsPunchingOut] = useState(false);

	// Filter timeline logs
	const timelineEntries = entries.filter(e => e.date === selectedTimelineDate);

	const meEmployee = user ? (employees.find(e => e._id === user._id) || user) : null;
	const featuredEmployee = employees.length > 0 ? employees[0] : meEmployee;
	const isAdmin = user?.userType === 'admin';


	const getTimelineColor = (projColor: string) => {
		if (projColor === '#10b981') return 'green';
		if (projColor === '#f59e0b') return 'orange';
		if (projColor === '#7f56d9') return 'purple';
		return 'blue';
	};

	// Aggregation for Stacked Bar Chart
	const last7Days = Array.from({ length: 7 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() - i);
		return d.getDate();
	}).reverse();


	const toggleKpiWidget = (kpiId: string) => {
		setVisibleKpiWidgets((prev) => {
			const next = prev.includes(kpiId)
				? prev.filter((id) => id !== kpiId)
				: [...prev, kpiId];
			localStorage.setItem('worktracker_visible_kpis', JSON.stringify(next));
			return next;
		});
	};

	const resetAllKpiWidgets = () => {
		const all = [
			'work_hours',
			'efficiency',
			'projects',
			'overdue_work',
			'team_utilization',
			'ai_adoption',
			'ai_impact',
			'ontime_delivery',
		];
		setVisibleKpiWidgets(all);
		localStorage.setItem('worktracker_visible_kpis', JSON.stringify(all));
	};

	const dailyWorkTimes = last7Days.map((dayNum) => {
		const dayEntries = entries.filter((entry) => {
			const entryDay = new Date(entry.date).getDate();
			return entryDay === dayNum;
		});

		let totalMins = dayEntries.reduce((sum, e) => sum + e.actualTime, 0);
		let workHours = parseFloat((totalMins / 60).toFixed(1));
		let overtimeHours = 0;

		if (workHours > 8) {
			overtimeHours = parseFloat((workHours - 8).toFixed(1));
			workHours = 8;
		}

		return {
			day: dayNum,
			workHours,
			overtimeHours
		};
	});

	const totalChartHours = dailyWorkTimes.reduce((sum, d) => sum + d.workHours + d.overtimeHours, 0).toFixed(1);



	const handleCopyToClipboard = () => {
		navigator.clipboard.writeText(mailContent);
		alert('Task summary copied to clipboard!');
	};


	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const getTrendX = (index: number) => 40 + index * 63.3;

	// Dynamic Constants for Visual UI Components
	const realProjectsTotal = projects.length;
	const realProjectsOnTrack = projects.filter(p => (p as any).status !== 'Delayed' && (p as any).status !== 'At Risk').length;
	const realProjectsAtRisk = projects.filter(p => (p as any).status === 'At Risk').length;
	const realProjectsDelayed = projects.filter(p => (p as any).status === 'Delayed').length;

	const totalTrackedMinutes = entries.reduce((acc, e) => acc + ((e as any).minutesWorked || ((e as any).hoursWorked || 0) * 60), 0);
	const trackedHoursStr = `${(totalTrackedMinutes / 60).toFixed(1)} h`;
	const totalUtilizationPct = employees.length > 0 ? 100 : 0;
	const totalCapacityHours = employees.length * 40;
	const totalScheduledHours = Math.round(totalTrackedMinutes / 60);
	const onTimeDeliveryPct = 0;
	const completedTasksCount = tasksList.filter(t => String(t.status) === 'Completed').length;
	const onTimeTasksCount = completedTasksCount;

	const trendDays = [
		{ dateStr: '', dayLabel: 'Sat', trackedH: 0, overtimeH: 0, untrackedH: 0 },
		{ dateStr: '', dayLabel: 'Sun', trackedH: 0, overtimeH: 0, untrackedH: 0 },
		{ dateStr: '', dayLabel: 'Mon', trackedH: 0, overtimeH: 0, untrackedH: 0 },
		{ dateStr: '', dayLabel: 'Tue', trackedH: 0, overtimeH: 0, untrackedH: 0 },
		{ dateStr: '', dayLabel: 'Wed', trackedH: 0, overtimeH: 0, untrackedH: 0 },
		{ dateStr: '', dayLabel: 'Thu', trackedH: 0, overtimeH: 0, untrackedH: 0 },
		{ dateStr: '', dayLabel: 'Fri', trackedH: 0, overtimeH: 0, untrackedH: 0 },
	];

	const maxTrendH = 10;
	const getTrendY = (val: number) => 160 - (val / maxTrendH) * 140;

	const trackedPathD = trendDays.reduce((acc, d, idx) => {
		const x = getTrendX(idx);
		const y = getTrendY(d.trackedH);
		return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
	}, '');

	const trackedAreaD = `${trackedPathD} L ${getTrendX(6)},160 L ${getTrendX(0)},160 Z`;

	const overtimePathD = trendDays.reduce((acc, d, idx) => {
		const x = getTrendX(idx);
		const y = getTrendY(d.overtimeH);
		return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
	}, '');

	const untrackedPathD = trendDays.reduce((acc, d, idx) => {
		const x = getTrendX(idx);
		const y = getTrendY(d.untrackedH);
		return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
	}, '');

	const displayPerformanceProjects = projects.map(p => ({
		id: p._id,
		name: p.name,
		est: '0h',
		act: `${Math.round(((p as any).totalMinutes || 0) / 60)}h`,
		var: '0h',
		varColor: '#16a34a',
		pct: (p as any).progress || 0,
		barColor: p.color || '#4f46e5',
		status: (p as any).status || 'Active',
		statusBg: '#ecfdf5',
		statusColor: '#047857',
	}));

	const healthOnTrack = realProjectsOnTrack;
	const healthAtRisk = realProjectsAtRisk;
	const healthDelayed = realProjectsDelayed;
	const healthCompletedTasks = completedTasksCount;
	const totalHealthProj = projects.length || 1;
	const onTrackPct = Math.round((healthOnTrack / totalHealthProj) * 100);
	const atRiskPct = Math.round((healthAtRisk / totalHealthProj) * 100);
	const delayedPct = Math.round((healthDelayed / totalHealthProj) * 100);

	const totalDistHoursStr = (totalTrackedMinutes / 60).toFixed(1);
	const timeDistBreakdown = totalTrackedMinutes > 0 ? [
		{ name: 'Development', color: '#3b82f6', mins: totalTrackedMinutes, hours: `${(totalTrackedMinutes / 60).toFixed(1)} h`, pct: 100 },
	] : [];

	const teamUtilizationData: any[] = [];

	const realTopEmployees = employees.map(emp => ({
		id: emp._id,
		name: emp.name,
		initials: emp.name ? emp.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?',
		avatarColor: emp.avatarColor || '#4f46e5',
		hours: `${((emp.totalMinutes || 0) / 60).toFixed(1)} h`,
		tasksDone: 0,
		onTimePct: '100%',
		aiAssistedPct: '0%',
		numericHours: emp.totalMinutes || 0,
	}));

	const kpiDefinitions = [
		{
			id: 'work_hours',
			title: 'WORK HOURS',
			icon: Users,
			iconBg: '#eff6ff',
			iconColor: '#3b82f6',
			value: '22',
			infoTooltip: 'Total tracked work hours across all active team members.',
			rows: [
				{ label: 'Tracked', value: '', dotColor: '#3b82f6' },
				{ label: 'Untracked', value: '0.0 h', dotColor: '#94a3b8' },
			],
		},
		{
			id: 'efficiency',
			title: 'EFFICIENCY',
			icon: TrendingUp,
			iconBg: '#ecfdf5',
			iconColor: '#10b981',
			value: '22',
			infoTooltip: 'Percentage of high-value focused time vs administrative overhead.',
			rows: [
				{ label: 'Focused', value: '', dotColor: '#10b981' },
				{ label: 'Overhead', value: '0%', dotColor: '#f59e0b' },
				{ label: 'Unallocated', value: totalTrackedMinutes > 0 ? '0%' : '100%', dotColor: '#94a3b8' },
			],
		},
		{
			id: 'projects',
			title: 'PROJECTS',
			icon: Folder,
			iconBg: '#f3e8ff',
			iconColor: '#8b5cf6',
			value: `${realProjectsTotal}`,
			infoTooltip: 'Active projects overview grouped by health status and milestone risk.',
			rows: [
				{ label: `${realProjectsOnTrack} On Track`, value: '', dotColor: '#10b981' },
				{ label: `${realProjectsAtRisk} At Risk`, value: '', dotColor: '#f59e0b' },
				{ label: `${realProjectsDelayed} Delayed`, value: '', dotColor: '#ef4444' },
			],
		},

		{
			id: 'team_utilization',
			title: 'TEAM UTILIZATION',
			icon: Users,
			iconBg: '#e0e7ff',
			iconColor: '#4f46e5',
			value: `${totalUtilizationPct}%`,
			infoTooltip: 'Ratio of scheduled resource hours against overall workforce capacity.',
			rows: [
				{ label: 'Total Capacity', value: `${totalCapacityHours.toLocaleString('en-US')} h`, dotColor: '' },
				{ label: 'Scheduled', value: `${totalScheduledHours.toLocaleString('en-US')} h`, dotColor: '' },
			],
		},


		{
			id: 'ontime_delivery',
			title: 'ON-TIME DELIVERY',
			icon: Target,
			iconBg: '#fce7f3',
			iconColor: '#ec4899',
			value: `${onTimeDeliveryPct}%`,
			infoTooltip: 'Percentage of tasks and deliverables completed on or before due date.',
			rows: [
				{ label: 'Completed', value: `${completedTasksCount}`, dotColor: '' },
				{ label: 'On-Time', value: `${onTimeTasksCount}`, dotColor: '' },
			],
		},
	];



	if (loading && projects.length === 0 && !error) {
		return <PageShimmer variant="dashboard" />;
	}


	return (
		<div>
			{/* 3-Dot Settings Backdrop */}
			{isKpiSettingsOpen && (
				<div className="menu-backdrop" onClick={() => setIsKpiSettingsOpen(false)} />
			)}

			{error && (
				<div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
					<AlertCircle style={{ color: '#ef4444' }} />
					<p style={{ fontWeight: 650 }}>{error}</p>
				</div>
			)}

			{/* KPI Section Header with 3-Dot Settings Button */}
			<div className="dashboard-section-header">
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<h2 className="dashboard-section-title">Admin Dashboard</h2>
				</div>

				{/* 3-Dot Settings Menu Trigger */}
				<div className="kpi-menu-container">
					<button
						type="button"
						className="kpi-menu-btn"
						onClick={() => setIsKpiSettingsOpen(!isKpiSettingsOpen)}
						title="KPI Settings"
					>
						<MoreVertical size={16} />
					</button>

					{/* 3-Dot Settings Dropdown Menu */}
					{isKpiSettingsOpen && (
						<div className="kpi-dropdown-menu">
							<button
								type="button"
								className="kpi-dropdown-item"
								onClick={() => {
									setIsKpiSettingsOpen(false);
									setIsEditWidgetsModalOpen(true);
								}}
							>
								<SlidersHorizontal size={14} style={{ color: '#3b82f6' }} />
								<span>Edit Widgets</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* KPI Cards Grid - Non-clickable informational cards */}
			<div className="dashboard-kpi-grid">
				{kpiDefinitions
					.filter((kpi) => visibleKpiWidgets.includes(kpi.id))
					.map((kpi) => {
						const IconComp = kpi.icon;
						const isAiCard = kpi.id === 'ai_adoption' || kpi.id === 'ai_impact';
						return (
							<div
								key={kpi.id}
								className="dashboard-kpi-card"
								onClick={() => { if (isAiCard) setIsAiModalOpen(true); }}
								style={{ cursor: isAiCard ? 'pointer' : 'default' }}
							>
								{/* Header: Icon, Title & Info */}
								<div className="kpi-card-header">
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
										<div className="kpi-icon-badge" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
											<IconComp size={16} />
										</div>
										<div className="kpi-card-title-wrap">
											<span className="kpi-card-title">{kpi.title}</span>
											<span title={kpi.infoTooltip} style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
												<Info size={12} style={{ color: '#94a3b8' }} />
											</span>
										</div>
									</div>
								</div>

								{/* Main Metric & Trend */}
								<div>
									<div className="kpi-metric-main">{kpi.value}</div>
									{(kpi as any).trend && (
										<div className="kpi-trend">
											<span>{(kpi as any).trend}</span>
										</div>
									)}
								</div>

								{/* Sub-breakdown rows */}
								<div className="kpi-breakdown-list">
									{kpi.rows.map((row, rIdx) => (
										<div key={rIdx} className="kpi-breakdown-item">
											<span style={{ display: 'inline-flex', alignItems: 'center' }}>
												{row.dotColor && (
													<span
														style={{
															width: '7px',
															height: '7px',
															borderRadius: '50%',
															backgroundColor: row.dotColor,
															display: 'inline-block',
															marginRight: '6px',
														}}
													/>
												)}
												{row.label}
											</span>
											{row.value && <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.value}</span>}
										</div>
									))}
								</div>
							</div>
						);
					})}
			</div>

			{/* EDIT WIDGETS MODAL */}
			{isEditWidgetsModalOpen && (
				<div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setIsEditWidgetsModalOpen(false)}>
					<div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
						<div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<div>
								<h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Edit KPI Widgets</h3>
								<p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
									Unhide or hide KPI section widgets. Cards will align automatically.
								</p>
							</div>
							<button className="modal-close" onClick={() => setIsEditWidgetsModalOpen(false)}>&times;</button>
						</div>

						<div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
							{kpiDefinitions.map((widget) => {
								const WIcon = widget.icon;
								const isChecked = visibleKpiWidgets.includes(widget.id);
								return (
									<label
										key={widget.id}
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											padding: '10px 14px',
											border: '1px solid #e2e8f0',
											borderRadius: '8px',
											background: isChecked ? '#f8fafc' : '#ffffff',
											cursor: 'pointer',
											transition: 'background 0.15s ease',
										}}
									>
										<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
											<div
												style={{
													width: '28px',
													height: '28px',
													borderRadius: '6px',
													background: widget.iconBg,
													color: widget.iconColor,
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
												}}
											>
												<WIcon size={14} />
											</div>
											<span style={{ fontSize: '0.82rem', fontWeight: 650, color: '#1e293b' }}>{widget.title}</span>
										</div>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => toggleKpiWidget(widget.id)}
											style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
										/>
									</label>
								);
							})}
						</div>

						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
							<button
								type="button"
								onClick={resetAllKpiWidgets}
								style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
							>
								Reset to Show All
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => setIsEditWidgetsModalOpen(false)}
								style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 650 }}
							>
								Done
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ========================================================================= */}
			{/* ANALYTICS SECTION: WORK HOURS TREND, PROJECT PERFORMANCE, PROJECT HEALTH */}
			{/* ========================================================================= */}
			<div className="analytics-section-grid">

				{/* CARD 1: WORK HOURS TREND */}
				<div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
					{/* Header */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<h3 style={{ fontSize: '0.98rem', fontWeight: 400, color: 'var(--text-primary)' }}>Work Hours Trend</h3>
							<span title="Weekly trend of tracked hours, overtime, and untracked hours" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
								<Info size={13} style={{ color: '#94a3b8' }} />
							</span>
						</div>
						<div style={{ position: 'relative' }}>
							<button
								type="button"
								onClick={() => setIsTrendUnitOpen(!isTrendUnitOpen)}
								style={{ border: '1px solid #e2e8f0', borderRadius: '7px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', background: '#fff', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
							>
								<span>{trendUnit}</span>
								<ChevronDown size={13} style={{ color: '#64748b' }} />
							</button>
							{isTrendUnitOpen && (
								<div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 100, minWidth: '90px', padding: '4px' }}>
									<button
										type="button"
										onClick={() => { setTrendUnit('Hours'); setIsTrendUnitOpen(false); }}
										style={{ width: '100%', textDecoration: 'none', background: trendUnit === 'Hours' ? '#eff6ff' : 'transparent', color: trendUnit === 'Hours' ? '#2563eb' : '#334155', border: 'none', padding: '6px 10px', textAlign: 'left', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
									>
										Hours
									</button>
									<button
										type="button"
										onClick={() => { setTrendUnit('Days'); setIsTrendUnitOpen(false); }}
										style={{ width: '100%', textDecoration: 'none', background: trendUnit === 'Days' ? '#eff6ff' : 'transparent', color: trendUnit === 'Days' ? '#2563eb' : '#334155', border: 'none', padding: '6px 10px', textAlign: 'left', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
									>
										Days
									</button>
								</div>
							)}
						</div>
					</div>

					{/* Legend */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px', fontSize: '0.73rem', fontWeight: 600 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '12px' }}>
							<span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
							<span >Tracked Hours</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6' }}>
							<span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
							<span>Overtime</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
							<span style={{ width: '12px', height: '0', borderTop: '2px dashed #94a3b8', display: 'inline-block' }} />
							<span>Untracked</span>
						</div>
					</div>

					{/* Smooth Line / Area Chart SVG */}
					<div style={{ width: '100%', height: '180px', position: 'relative' }}>
						<svg viewBox="0 0 440 170" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
							<defs>
								<linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
									<stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
								</linearGradient>
							</defs>

							{/* Grid Lines */}
							<line x1="30" y1="20" x2="430" y2="20" stroke="#f1f5f9" strokeWidth="1" />
							<line x1="30" y1="55" x2="430" y2="55" stroke="#f1f5f9" strokeWidth="1" />
							<line x1="30" y1="90" x2="430" y2="90" stroke="#f1f5f9" strokeWidth="1" />
							<line x1="30" y1="125" x2="430" y2="125" stroke="#f1f5f9" strokeWidth="1" />
							<line x1="30" y1="160" x2="430" y2="160" stroke="#f1f5f9" strokeWidth="1" />

							{/* Y Axis Labels */}
							<text x="18" y="24" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">80</text>
							<text x="18" y="59" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">60</text>
							<text x="18" y="94" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">40</text>
							<text x="18" y="129" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">20</text>
							<text x="18" y="164" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">0</text>

							{/* Tracked Hours Area Fill */}
							{trackedAreaD && (
								<path
									d={trackedAreaD}
									fill="url(#blueGradient)"
								/>
							)}

							{/* Tracked Hours Blue Line */}
							{trackedPathD && (
								<path
									d={trackedPathD}
									fill="none"
									stroke="#3b82f6"
									strokeWidth="2.5"
									strokeLinecap="round"
								/>
							)}

							{/* Overtime Purple Line */}
							{overtimePathD && (
								<path
									d={overtimePathD}
									fill="none"
									stroke="#8b5cf6"
									strokeWidth="2"
									strokeLinecap="round"
								/>
							)}

							{/* Untracked Dashed Line */}
							{untrackedPathD && (
								<path
									d={untrackedPathD}
									fill="none"
									stroke="#94a3b8"
									strokeWidth="1.8"
									strokeDasharray="4 4"
									strokeLinecap="round"
								/>
							)}

							{/* Data Points */}
							{trendDays.map((d, i) => (
								<g key={i}>
									<circle cx={getTrendX(i)} cy={getTrendY(d.trackedH)} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
									<circle cx={getTrendX(i)} cy={getTrendY(d.overtimeH)} r="3" fill="#8b5cf6" />
								</g>
							))}
						</svg>
					</div>

					{/* X Axis Labels */}
					<div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '28px', paddingRight: '4px', fontSize: '0.72rem', color: '#64748b', fontWeight: 550, marginTop: '4px' }}>
						{trendDays.map((td, idx) => (
							<span key={idx}>{td.dayLabel}</span>
						))}
					</div>
				</div>

				{/* CARD 2: PROJECT PERFORMANCE */}
				<div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
					{/* Header */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<h3 style={{ fontSize: '0.98rem', fontWeight: 400, color: 'var(--text-primary)' }}>Project Performance</h3>
							<span title="Compare estimated vs actual hours and track progress variance" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
								<Info size={13} style={{ color: '#94a3b8' }} />
							</span>
						</div>
						<Link href="/project" style={{ fontSize: '0.78rem', fontWeight: 650, color: '#2563eb', border: '1px solid #dbeafe', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', textDecoration: 'none' }}>
							View All
						</Link>
					</div>

					{/* Performance Table */}
					<div style={{ overflowX: 'auto' }}>
						<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
							<thead>
								<tr style={{ borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
									<th style={{ textAlign: 'left', padding: '6px 8px 8px 0', fontWeight: 600 }}>Project</th>
									<th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Estimated (h)</th>
									<th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Actual (h)</th>
									<th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Variance</th>
									<th style={{ textAlign: 'left', padding: '6px 8px 8px 8px', fontWeight: 600, minWidth: '90px' }}>Progress</th>
									<th style={{ textAlign: 'right', padding: '6px 0 8px 8px', fontWeight: 600 }}>Status</th>
								</tr>
							</thead>
							<tbody>
								{displayPerformanceProjects.map((row, idx) => (
									<tr key={idx} style={{ borderBottom: idx === displayPerformanceProjects.length - 1 ? 'none' : '1px solid #f8fafc' }}>
										<td style={{ padding: '9px 8px 9px 0', fontWeight: 400, color: '#0f172a' }}>{row.name}</td>
										<td style={{ textAlign: 'center', padding: '9px 8px', fontWeight: 400, color: '#475569' }}>{row.est}</td>
										<td style={{ textAlign: 'center', padding: '9px 8px', fontWeight: 400, color: '#0f172a' }}>{row.act}</td>
										<td style={{ textAlign: 'center', padding: '9px 8px', fontWeight: 700, color: row.varColor }}>{row.var}</td>
										<td style={{ padding: '9px 8px' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
												<span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#475569', minWidth: '28px' }}>{row.pct}%</span>
												<div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
													<div style={{ width: `${row.pct}%`, height: '100%', background: row.barColor, borderRadius: '3px' }} />
												</div>
											</div>
										</td>
										<td style={{ textAlign: 'right', padding: '9px 0 9px 8px' }}>
											<span style={{ fontSize: '0.7rem', fontWeight: 700, background: row.statusBg, color: row.statusColor, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
												{row.status}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* CARD 3: PROJECT HEALTH */}
				<div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
					{/* Header */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
						<h3 style={{ fontSize: '0.98rem', fontWeight: 400, color: 'var(--text-primary)' }}>Project Health</h3>
						<span title="Overall health distribution of active projects" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
							<Info size={13} style={{ color: '#94a3b8' }} />
						</span>
					</div>

					{/* Donut Chart & Legend Container */}
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flex: 1 }}>
						{/* Donut Chart SVG */}
						<div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
							<svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
								{/* Background Ring */}
								<circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />

								{/* Segment 1: On Track -> Green */}
								<circle
									cx="50"
									cy="50"
									r="38"
									fill="none"
									stroke="#10b981"
									strokeWidth="12"
									strokeDasharray={`${Math.round((healthOnTrack / Math.max(1, displayPerformanceProjects.length)) * 238.76)} 238`}
									strokeDashoffset="0"
								/>

								{/* Segment 2: At Risk -> Amber */}
								<circle
									cx="50"
									cy="50"
									r="38"
									fill="none"
									stroke="#f59e0b"
									strokeWidth="12"
									strokeDasharray={`${Math.round((healthAtRisk / Math.max(1, displayPerformanceProjects.length)) * 238.76)} 238`}
									strokeDashoffset={`-${Math.round((healthOnTrack / Math.max(1, displayPerformanceProjects.length)) * 238.76)}`}
								/>

								{/* Segment 3: Delayed -> Red */}
								<circle
									cx="50"
									cy="50"
									r="38"
									fill="none"
									stroke="#ef4444"
									strokeWidth="12"
									strokeDasharray={`${Math.round((healthDelayed / Math.max(1, displayPerformanceProjects.length)) * 238.76)} 238`}
									strokeDashoffset={`-${Math.round(((healthOnTrack + healthAtRisk) / Math.max(1, displayPerformanceProjects.length)) * 238.76)}`}
								/>
							</svg>

							{/* Donut Center Label */}
							<div style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -50%)',
								textAlign: 'center'
							}}>
								<div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>
									{projects.length || 2}
								</div>
								<div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>
									Total
								</div>
							</div>
						</div>

						{/* Health Breakdown Legend List */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
								<span style={{ fontWeight: 700, color: '#0f172a' }}>{healthOnTrack}</span>
								<span style={{ color: '#475569', fontWeight: 500 }}>On Track ({onTrackPct}%)</span>
							</div>

							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
								<span style={{ fontWeight: 700, color: '#0f172a' }}>{healthAtRisk}</span>
								<span style={{ color: '#475569', fontWeight: 500 }}>At Risk ({atRiskPct}%)</span>
							</div>

							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
								<span style={{ fontWeight: 700, color: '#0f172a' }}>{healthDelayed}</span>
								<span style={{ color: '#475569', fontWeight: 500 }}>Delayed ({delayedPct}%)</span>
							</div>

							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
								<span style={{ fontWeight: 700, color: '#0f172a' }}>{healthCompletedTasks}</span>
								<span style={{ color: '#475569', fontWeight: 500 }}>Completed</span>
							</div>
						</div>
					</div>

					{/* Footer Link */}
					<div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
						<Link
							href="/project"
							style={{
								fontSize: '0.8rem',
								fontWeight: 700,
								color: '#2563eb',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '6px',
								textDecoration: 'none'
							}}
						>
							<span>View All Projects</span>
							<ArrowRight size={14} />
						</Link>
					</div>
				</div>

			</div>

			{/* ========================================================================= */}
			{/* ANALYTICS ROW 2: TIME DISTRIBUTION, TEAM UTILIZATION, TOP EMPLOYEES     */}
			{/* ========================================================================= */}
			<div className="analytics-section-grid" style={{ marginTop: '14px' }}>

				{/* CARD 1: TIME DISTRIBUTION */}
				<div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
					{/* Header */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
						<h3 style={{ fontSize: '0.98rem', fontWeight: 400, color: 'var(--text-primary)' }}>Time Distribution</h3>
						<span title="Work hour breakdown by project category" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
							<Info size={13} style={{ color: '#94a3b8' }} />
						</span>
					</div>

					{/* Donut Chart & Breakdown List */}
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flex: 1 }}>
						{/* Donut Chart SVG */}
						<div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
							<svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
								<circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
								{timeDistBreakdown.map((item, idx) => {
									const dash = Math.round((item.pct / 100) * 238.76);
									const prevPctSum = timeDistBreakdown.slice(0, idx).reduce((sum, x) => sum + x.pct, 0);
									const offset = -Math.round((prevPctSum / 100) * 238.76);
									return (
										<circle
											key={idx}
											cx="50"
											cy="50"
											r="38"
											fill="none"
											stroke={item.color}
											strokeWidth="12"
											strokeDasharray={`${dash} 238`}
											strokeDashoffset={offset}
										/>
									);
								})}
							</svg>
						</div>

						{/* Category Breakdown List */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem', width: '100%' }}>
							{timeDistBreakdown.map((cat, idx) => (
								<div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
										<span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
										<span style={{ color: '#475569', fontWeight: 550 }}>{cat.name}</span>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
										<span style={{ fontWeight: 700, color: '#0f172a' }}>{cat.pct}%</span>
										<span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>({cat.hours})</span>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Footer Total */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
						<span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#475569' }}>Total</span>
						<span style={{ fontSize: '0.95rem', fontWeight: 400, color: '#0f172a' }}>{totalDistHoursStr} h</span>
					</div>
				</div>

				{/* CARD 2: TEAM UTILIZATION */}
				<div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
					{/* Header */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<h3 style={{ fontSize: '0.98rem', fontWeight: 400, color: 'var(--text-primary)' }}>Team Utilization</h3>
							<span title="Scheduled hours vs total department capacity" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
								<Info size={13} style={{ color: '#94a3b8' }} />
							</span>
						</div>
						<Link href="/employees" style={{ fontSize: '0.78rem', fontWeight: 650, color: '#2563eb', border: '1px solid #dbeafe', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', textDecoration: 'none' }}>
							View All
						</Link>
					</div>

					{/* Department Utilization Table */}
					<div style={{ overflowX: 'auto' }}>
						<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
							<thead>
								<tr style={{ borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
									<th style={{ textAlign: 'left', padding: '6px 8px 8px 0', fontWeight: 600 }}>Team</th>
									<th style={{ textAlign: 'left', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Utilization</th>
									<th style={{ textAlign: 'right', padding: '6px 0 8px 8px', fontWeight: 600 }}>Scheduled / Capacity</th>
								</tr>
							</thead>
							<tbody>
								{teamUtilizationData.map((row, idx) => (
									<tr key={idx} style={{ borderBottom: idx === teamUtilizationData.length - 1 ? 'none' : '1px solid #f8fafc' }}>
										<td style={{ padding: '9px 8px 9px 0', fontWeight: 400, color: '#0f172a' }}>{row.name}</td>
										<td style={{ padding: '9px 8px' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
												<span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', minWidth: '30px' }}>{row.pct}%</span>
												<div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
													<div style={{ width: `${row.pct}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
												</div>
											</div>
										</td>
										<td style={{ textAlign: 'right', padding: '9px 0 9px 8px', fontWeight: 650, color: '#475569' }}>{row.schedStr}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* CARD 3: TOP EMPLOYEES THIS WEEK */}
				<div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
					{/* Header */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<h3 style={{ fontSize: '0.98rem', fontWeight: 400, color: 'var(--text-primary)' }}>Top Employees This Week</h3>
							<span title="Highest performing team members by logged hours and completed tasks" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
								<Info size={13} style={{ color: '#94a3b8' }} />
							</span>
						</div>
						<Link href="/employees" style={{ fontSize: '0.78rem', fontWeight: 650, color: '#2563eb', border: '1px solid #dbeafe', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', textDecoration: 'none' }}>
							View All
						</Link>
					</div>

					{/* Top Employees Table */}
					<div style={{ overflowX: 'auto' }}>
						<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
							<thead>
								<tr style={{ borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
									<th style={{ textAlign: 'left', padding: '6px 8px 8px 0', fontWeight: 600 }}>Employee</th>
									<th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Hours</th>
									<th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Tasks Done</th>
									<th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>On-Time %</th>
									<th style={{ textAlign: 'right', padding: '6px 0 8px 8px', fontWeight: 600 }}>AI Assisted</th>
								</tr>
							</thead>
							<tbody>
								{realTopEmployees.map((emp, idx) => (
									<tr key={emp.id || idx} style={{ borderBottom: idx === realTopEmployees.length - 1 ? 'none' : '1px solid #f8fafc' }}>
										<td style={{ padding: '8px 8px 8px 0' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
														<div className="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', background: emp.avatarColor, color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
													{emp.initials}
												</div>
												<span style={{ fontWeight: 400, color: '#0f172a' }}>{emp.name}</span>
											</div>
										</td>
										<td style={{ textAlign: 'center', padding: '8px', fontWeight: 400, color: '#0f172a' }}>{emp.hours}</td>
										<td style={{ textAlign: 'center', padding: '8px', fontWeight: 600, color: '#475569' }}>{emp.tasksDone}</td>
										<td style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: '#0f172a' }}>{emp.onTimePct}</td>
										<td style={{ textAlign: 'right', padding: '8px 0 8px 8px', fontWeight: 700, color: '#0f172a' }}>{emp.aiAssistedPct}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

			</div>

			{/* Main Grid Layout */}
			{/* <div className="dashboard-grid"> */}
				{/* Employee Tasks Section */}
				{/* {!isAdmin && user && (
					<div className="col-12" style={{ marginBottom: '20px' }}>
						<MyTasks userId={user._id} key={tasksKey} />
					</div>
				)} */}
			{/* </div> */}

			{/* MODAL: ADD EMPLOYEE (Admin Only) */}
			<AddTeamMemberModal
				isOpen={isAdmin && isEmployeeModalOpen}
				onClose={() => setIsEmployeeModalOpen(false)}
				projectsList={projects}

			/>

			{/* MODAL: NEW Project */}
			<CreateProjectModal
				isOpen={isProjectModalOpen}
				onClose={() => setIsProjectModalOpen(false)}
				clientsList={clientsList}
				employeesList={employees}

			/>

			{/* MODAL: LOG WORK */}
			{isWorkModalOpen && (
				<div className="modal-overlay" onClick={() => setIsWorkModalOpen(false)}>
					<div className="modal-container" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Log Time Entry</h3>
							<button className="modal-close" onClick={() => setIsWorkModalOpen(false)}>&times;</button>
						</div>
						<form >
							<div className="form-group">
								<label className="form-label">Project / Project *</label>
								<select
									className="form-control"
									required
									value={workProjId}
									onChange={(e) => setWorkProjId(e.target.value)}
								>
									{projects.map((p) => (
										<option key={p._id} value={p._id}>{p.name}</option>
									))}
								</select>
							</div>

							<div className="form-group">
								<label className="form-label">Logging Member *</label>
								<select
									className="form-control"
									required
									value={workEmpId}
									onChange={(e) => setWorkEmpId(e.target.value)}
									disabled={!isAdmin}
								>
									{isAdmin ? (
										employees.map((emp) => (
											<option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
										))
									) : (
										<option value={user?._id}>{user?.name} ({user?.role})</option>
									)}
								</select>
							</div>

							<div className="form-group">
								<label className="form-label">What work was performed? *</label>
								<input
									type="text"
									className="form-control"
									required
									placeholder="e.g. Coded sidebar layouts"
									value={workTitle}
									onChange={(e) => setWorkTitle(e.target.value)}
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Date *</label>
								<input
									type="date"
									className="form-control"
									required
									value={workDate}
									onChange={(e) => setWorkDate(e.target.value)}
								/>
							</div>

							<div className="form-row">
								<div className="form-group">
									<label className="form-label">Start Time *</label>
									<input
										type="time"
										className="form-control"
										required
										value={workStart}
										onChange={(e) => setWorkStart(e.target.value)}
									/>
								</div>
								<div className="form-group">
									<label className="form-label">End Time *</label>
									<input
										type="time"
										className="form-control"
										required
										value={workEnd}
										onChange={(e) => setWorkEnd(e.target.value)}
									/>
								</div>
							</div>

							<div className="form-group">
								<label className="form-label">Session Notes (Optional)</label>
								<textarea
									className="form-control"
									placeholder="Details, progress, blockers..."
									value={workDesc}
									onChange={(e) => setWorkDesc(e.target.value)}
								/>
							</div>

							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
								<button type="button" className="btn btn-secondary" onClick={() => setIsWorkModalOpen(false)}>Cancel</button>
								<button type="submit" className="btn btn-primary" disabled={submittingWork}>
									{submittingWork ? 'Saving...' : 'Save Log'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
			{/* MODAL: DAILY MAIL SUMMARY */}
			{isMailModalOpen && (
				<div className="modal-overlay" onClick={() => setIsMailModalOpen(false)}>
					<div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
						<div className="modal-header">
							<h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daily Email Summary</h3>
							<button className="modal-close" onClick={() => setIsMailModalOpen(false)}>&times;</button>
						</div>
						<div style={{ marginBottom: '14px' }}>
							<p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
								Here is your formatted task summary for today ({selectedTimelineDate}). Click Copy to save it to your clipboard.
							</p>
						</div>
						<div className="form-group">
							<textarea
								className="form-control"
								readOnly
								style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4', background: 'var(--bg-tertiary)' }}
								value={mailContent}
							/>
						</div>
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
							<button type="button" className="btn btn-secondary" onClick={() => setIsMailModalOpen(false)} disabled={isPunchingOut}>Close</button>
							<button type="button" className="btn btn-secondary" onClick={handleCopyToClipboard}>Copy to Clipboard</button>
							{!isAdmin && isPunchedIn && (
								<button
									type="button"
									className="btn btn-primary"

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
							)}
						</div>
					</div>
				</div>
			)}

			{/* MODAL: CREATE TASK */}
			{/* <CreateTaskModal
				isOpen={isTaskModalOpen}
				onClose={() => setIsTaskModalOpen(false)}
				user={user}
				projectsOptions={projects}
				employeesList={employees}
				onSuccess={async () => {
					setIsTaskModalOpen(false);
					setTasksKey((prev) => prev + 1);
					window.dispatchEvent(new CustomEvent('worktracker-refresh'));
				}}
			/> */}

		</div>
	);
}
