'use client';

import { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  Filter,
  Search,
  TrendingUp,
  Users
} from 'lucide-react';

type DepartmentStatus = 'Healthy' | 'Hiring' | 'At Risk';

interface Department {
  id: string;
  name: string;
  lead: string;
  members: number;
  activeProjects: number;
  monthlyHours: number;

  status: DepartmentStatus;
  focus: string;
}

const departmentData: Department[] = [
  {
    id: 'dep-design',
    name: 'Design Studio',
    lead: 'Aarav Menon',
    members: 11,
    activeProjects: 4,
    monthlyHours: 1392,

    status: 'Healthy',
    focus: 'Product flows, motion systems, accessibility polish'
  },
  {
    id: 'dep-engineering',
    name: 'Engineering',
    lead: 'Rhea Patel',
    members: 24,
    activeProjects: 8,
    monthlyHours: 3056,

    status: 'Hiring',
    focus: 'Platform reliability, API throughput, observability'
  },
  {
    id: 'dep-growth',
    name: 'Growth Lab',
    lead: 'Kabir Sinha',
    members: 9,
    activeProjects: 5,
    monthlyHours: 1138,

    status: 'Healthy',
    focus: 'Acquisition funnels, lifecycle automation'
  },
  {
    id: 'dep-operations',
    name: 'Operations',
    lead: 'Naina Sharma',
    members: 7,
    activeProjects: 3,
    monthlyHours: 816,
    
    status: 'At Risk',
    focus: 'Resource balancing, vendor turnaround time'
  },
  {
    id: 'dep-people',
    name: 'People & Culture',
    lead: 'Ishita Rao',
    members: 6,
    activeProjects: 2,
    monthlyHours: 702,
    status: 'Hiring',
    focus: 'Onboarding system, policy modernization'
  }
];

const statusStyles: Record<DepartmentStatus, { bg: string; color: string }> = {
  Healthy: { bg: '#dcfce7', color: '#166534' },
  Hiring: { bg: '#ffedd5', color: '#9a3412' },
  'At Risk': { bg: '#fee2e2', color: '#991b1b' }
};

const DepartmentPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | DepartmentStatus>('All');

  const filteredDepartments = useMemo(() => {
    return departmentData.filter((department) => {
      const matchesSearch =
        department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        department.lead.toLowerCase().includes(searchQuery.toLowerCase()) ||
        department.focus.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'All' || department.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const summary = useMemo(() => {
    const totals = filteredDepartments.reduce(
      (acc, department) => {
        acc.members += department.members;
        acc.projects += department.activeProjects;
        acc.hours += department.monthlyHours;

        return acc;
      },
      { members: 0, projects: 0, hours: 0, budget: 0 }
    );

    const utilization = totals.members > 0 ? Math.round((totals.hours / (totals.members * 160)) * 100) : 0;

    return {
      departments: filteredDepartments.length,
      members: totals.members,
      projects: totals.projects,
      utilization,
      budget: totals.budget
    };
  }, [filteredDepartments]);

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <section className="department-hero">
        <div>
          <p className="hero-eyebrow">Workspace Overview</p>
          <h1 className="hero-title">Departments</h1>
          <p className="hero-copy">
            Track department capacity, hiring pressure, and active delivery streams in one place.
          </p>
        </div>
        <button className="btn btn-primary" type="button">
          Create Department
        </button>
      </section>

      <section className="summary-grid">
        <article className="summary-card reveal delay-1">
          <div className="summary-icon"><Building2 size={14} /></div>
          <p className="summary-label">Departments</p>
          <p className="summary-value">{summary.departments}</p>
        </article>
        <article className="summary-card reveal delay-2">
          <div className="summary-icon"><Users size={14} /></div>
          <p className="summary-label">Team Members</p>
          <p className="summary-value">{summary.members}</p>
        </article>
        <article className="summary-card reveal delay-3">
          <div className="summary-icon"><Briefcase size={14} /></div>
          <p className="summary-label">Active Projects</p>
          <p className="summary-value">{summary.projects}</p>
        </article>
        <article className="summary-card reveal delay-4">
          <div className="summary-icon"><TrendingUp size={14} /></div>
          <p className="summary-label">Capacity Utilization</p>
          <p className="summary-value">{summary.utilization}%</p>
        </article>
      </section>

      <section className="control-bar card">
        <label className="search-box" htmlFor="department-search">
          <Search size={14} />
          <input
            id="department-search"
            type="text"
            placeholder="Search by department, lead, or focus"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        <label className="filter-box" htmlFor="department-status">
          <Filter size={14} />
          <select
            id="department-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'All' | DepartmentStatus)}
          >
            <option value="All">All status</option>
            <option value="Healthy">Healthy</option>
            <option value="Hiring">Hiring</option>
            <option value="At Risk">At Risk</option>
          </select>
        </label>
      </section>

      <section className="department-grid">
        {filteredDepartments.length === 0 ? (
          <div className="card empty-state">
            <p>No departments match the current search and filter.</p>
          </div>
        ) : (
          filteredDepartments.map((department, index) => {
            const statusStyle = statusStyles[department.status];

            return (
              <article key={department.id} className={`card department-card reveal delay-${(index % 4) + 1}`}>
                <div className="department-top">
                  <div>
                    <h3>{department.name}</h3>
                    <p>Lead: {department.lead}</p>
                  </div>
                  <span
                    className="status-pill"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    {department.status}
                  </span>
                </div>

                <p className="department-focus">{department.focus}</p>

                <div className="department-metrics">
                  <div>
                    <span>Members</span>
                    <strong>{department.members}</strong>
                  </div>
                  <div>
                    <span>Projects</span>
                    <strong>{department.activeProjects}</strong>
                  </div>
                  <div>
                    <span>Hours</span>
                    <strong>{department.monthlyHours}</strong>
                  </div>
                </div>

            
              </article>
            );
          })
        )}
      </section>

     
      <style jsx>{`
        .department-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          background:
            radial-gradient(circle at 18% 16%, rgba(59, 130, 246, 0.18), transparent 44%),
            radial-gradient(circle at 82% 12%, rgba(16, 185, 129, 0.15), transparent 40%),
            var(--bg-secondary);
        }

        .hero-eyebrow {
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.11em;
          font-size: 0.63rem;
          font-weight: 700;
        }

        .hero-title {
          font-size: 1.45rem;
          font-weight: 800;
          margin-top: 4px;
        }

        .hero-copy {
          margin-top: 4px;
          color: var(--text-secondary);
          max-width: 560px;
        }

        .summary-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .summary-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          padding: 10px;
          display: grid;
          gap: 5px;
        }

        .summary-icon {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          background: var(--bg-tertiary);
          color: var(--accent-primary);
        }

        .summary-label {
          color: var(--text-secondary);
          font-size: 0.72rem;
        }

        .summary-value {
          font-size: 1.22rem;
          font-weight: 780;
          letter-spacing: -0.015em;
        }

        .control-bar {
          display: grid;
          grid-template-columns: 1fr 190px;
          gap: 10px;
          align-items: center;
          padding: 10px;
        }

        .search-box,
        .filter-box {
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          border-radius: var(--border-radius-sm);
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          padding: 0 10px;
          height: 36px;
        }

        .search-box input,
        .filter-box select {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          color: var(--text-primary);
        }

        .department-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
        }

        .department-card {
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          background: var(--bg-secondary);
        }

        .department-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .department-top h3 {
          font-size: 0.95rem;
          font-weight: 780;
        }

        .department-top p {
          color: var(--text-secondary);
          font-size: 0.74rem;
          margin-top: 2px;
        }

        .status-pill {
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 0.65rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .department-focus {
          color: var(--text-secondary);
          font-size: 0.74rem;
          min-height: 32px;
        }

        .department-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }

        .department-metrics div {
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 7px;
          display: grid;
          gap: 3px;
          background: var(--bg-tertiary);
        }

        .department-metrics span {
          color: var(--text-secondary);
          font-size: 0.67rem;
        }

        .department-metrics strong {
          font-size: 0.86rem;
        }

        .department-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .department-footer p {
          color: var(--text-secondary);
          font-size: 0.72rem;
        }

        .department-footer strong {
          color: var(--text-primary);
          font-size: 0.8rem;
        }

        .empty-state {
          text-align: center;
          color: var(--text-muted);
          padding: 24px;
        }

        .budget-callout {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          background:
            linear-gradient(95deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96)),
            var(--bg-secondary);
          color: #f8fafc;
          border-radius: var(--border-radius-md);
          border: none;
          padding: 12px;
        }

        .budget-callout p {
          font-size: 0.76rem;
          color: rgba(248, 250, 252, 0.8);
        }

        .budget-callout h2 {
          font-size: 1.2rem;
          font-weight: 820;
          letter-spacing: -0.01em;
        }

        .reveal {
          opacity: 0;
          transform: translateY(10px);
          animation: rise-in 520ms ease forwards;
        }

        .delay-1 {
          animation-delay: 60ms;
        }

        .delay-2 {
          animation-delay: 120ms;
        }

        .delay-3 {
          animation-delay: 180ms;
        }

        .delay-4 {
          animation-delay: 240ms;
        }

        @keyframes rise-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .department-hero {
            flex-direction: column;
            align-items: stretch;
          }

          .control-bar {
            grid-template-columns: 1fr;
          }

          .department-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DepartmentPage;
