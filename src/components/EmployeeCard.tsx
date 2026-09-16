'use client';

import { Briefcase, Clock3, Edit3, Mail, Trash2, Trash2Icon } from 'lucide-react';

import { formatMinutesToDuration } from '@/lib/time';
import { AnimateIcon } from './animate-ui/icons/icon';
import { LogIn } from './animate-ui/icons/log-in';
import { LogOut } from './animate-ui/icons/log-out';

export type EmployeeCardEmployee = {
    _id: string;
    full_name: string;
    email: string;

    phone_number?: number | null;

    profile_picture?: string | null;

    designation?: string | null;

    group?: string | null;

    user_role: number;

    isVerify?: boolean;

    status?: boolean;

    createdAt?: string;
    updatedAt?: string;

    totalMinutes?: number;

    todayAttendance?: {
        allowPunchInDate?: string;
        allowPunchOutDate?: string;
    };
};

type EmployeeCardProps = {
    employee: EmployeeCardEmployee;
    onOpenDetails: (employee: EmployeeCardEmployee) => void;
    onEdit: (employee: EmployeeCardEmployee) => void;
    onDelete: (employeeId: string) => void;
    onTogglePunchOverride: (
        employeeId: string,
        action: 'allowPunchIn' | 'allowPunchOut'
    ) => void;
};

export default function EmployeeCard({
    employee,
    onOpenDetails,
    onEdit,
    onDelete,
    onTogglePunchOverride,
}: EmployeeCardProps) {
    const employeeName = employee.full_name || 'Employee';

    const initials = employeeName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const today = new Date().toISOString().split('T')[0];

    const allowPunchIn =
        employee.todayAttendance?.allowPunchInDate === today;

    const allowPunchOut =
        employee.todayAttendance?.allowPunchOutDate === today;

    const isActive = employee.status !== false;

    return (
        <article
            className="card employee-card"
            onClick={() => onOpenDetails(employee)}
            style={{
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                transition:
                    'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '16px 16px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '11px',
                        minWidth: 0,
                    }}
                >
                    <div
                        className="avatar"
                        style={{
                            width: '42px',
                            height: '42px',
                            minWidth: '42px',
                            borderRadius: '12px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'black'
                        }}
                    >
                        {employee.profile_picture ? (
                            <img
                                src={employee.profile_picture}
                                alt={employeeName}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        ) : (
                            initials
                        )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                minWidth: 0,
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '0.9rem',
                                    lineHeight: 1.2,
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {employeeName}
                            </h3>

                            <span
                                style={{
                                    fontSize: '0.52rem',
                                    lineHeight: 1,
                                    padding: '4px 6px',
                                    borderRadius: '999px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Employee
                            </span>
                        </div>

                        <p
                            style={{
                                margin: '4px 0 0',
                                color: 'var(--text-muted)',
                                fontSize: '0.68rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {employee.designation || 'Employee'}
                        </p>
                    </div>
                </div>

                <span
                    className={`badge-status ${isActive ? 'active' : 'inactive'}`}
                    style={{
                        flexShrink: 0,
                        fontSize: '0.56rem',
                        padding: '5px 8px',
                        borderRadius: '999px',
                    }}
                >
                    <span
                        style={{
                            display: 'inline-block',
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            marginRight: '5px',
                            background: 'currentColor',
                            verticalAlign: 'middle',
                        }}
                    />
                    {isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            {/* Contact / metadata */}
            <div
                style={{
                    padding: '11px 16px',
                    borderTop: '1px solid var(--border-color)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: 0,
                    }}
                >
                    <Mail
                        size={13}
                        strokeWidth={1.8}
                        style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                    />
                    <span
                        style={{
                            fontSize: '0.69rem',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {employee.email}
                    </span>
                </div>

                {employee.group && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: 0,
                        }}
                    >
                        <Briefcase
                            size={13}
                            strokeWidth={1.8}
                            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                        />
                        <span
                            style={{
                                fontSize: '0.68rem',
                                color: 'var(--text-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {employee.group}
                        </span>
                    </div>
                )}
            </div>

            {/* Attendance */}
            <div
                onClick={(event) => event.stopPropagation()}
                style={{ padding: '13px 16px 14px' }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                    }}
                >
                    <span
                        style={{
                            fontSize: '0.56rem',
                            fontWeight: 800,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Attendance access
                    </span>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '7px',
                    }}
                ><AnimateIcon animateOnHover>
                        <button
                            type="button"
                            className="btn"
                            onClick={() =>
                                onTogglePunchOverride(employee._id, 'allowPunchIn')
                            }
                            style={{
                                minHeight: '30px',
                                padding: '5px 8px',
                                borderRadius: '7px',
                                fontSize: '0.62rem',
                                fontWeight: 750,
                                background: allowPunchIn ? '#dcfce7' : '#15803d',
                                color: allowPunchIn ? '#15803d' : '#dcfce7',
                                border: '1px solid #86efac',
                                width: '100%'
                            }}
                        >
                            <LogIn size={17} />
                            {allowPunchIn ? '✓ In Allowed' : 'Allow In'}
                        </button>
                    </AnimateIcon>
<AnimateIcon animateOnHover>
                    <button
                        type="button"
                        className="btn"
                        onClick={() =>
                            onTogglePunchOverride(employee._id, 'allowPunchOut')
                        }
                        style={{
                            minHeight: '30px',
                            padding: '5px 8px',
                            borderRadius: '7px',
                            fontSize: '0.62rem',
                            fontWeight: 750,
                            background: allowPunchOut ? '#fee2e2' : '#b91c1c',
                            color: allowPunchOut ? '#b91c1c' : '#fee2e2',
                            border: '1px solid #fca5a5',
                            width: '100%'
                        }}
                    >
                          <LogOut size={17} />
                        {allowPunchOut ? '✓ Out Allowed' : 'Allow Out'}
                    </button>
                    </AnimateIcon>
                </div>
            </div>

            {/* Footer */}
            <div
                style={{
                    borderTop: '1px solid var(--border-color)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--accent-primary)',
                            flexShrink: 0,
                        }}
                    >
                        <Clock3 size={14} />
                    </div>

                    <div>
                        <span
                            style={{
                                display: 'block',
                                fontSize: '0.52rem',
                                color: 'var(--text-muted)',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Today
                        </span>
                        <span
                            style={{
                                display: 'block',
                                marginTop: '1px',
                                fontSize: '0.86rem',
                                lineHeight: 1.1,
                                fontWeight: 850,
                            }}
                        >
                            {formatMinutesToDuration(employee.totalMinutes ?? 0)}
                        </span>
                    </div>
                </div>

                <div
                    className="no-print"
                    onClick={(event) => event.stopPropagation()}
                    style={{
                        display: 'flex',
                        gap: '6px',
                    }}
                >
                    <button
                        type="button"
                        className="action-btn"
                        title="Edit Employee"
                        aria-label={`Edit ${employeeName}`}
                        onClick={() => onEdit(employee)}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#cdfe9c',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Edit3 size={13} />
                    </button>
                    <AnimateIcon animateOnHover>
                        <button
                            type="button"
                            className="action-btn btn-delete-item"
                            title="Delete Employee"
                            aria-label={`Delete ${employeeName}`}
                            onClick={() => onDelete(employee._id)}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: '#f38686',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Trash2 />
                        </button>
                    </AnimateIcon>
                </div>
            </div>
        </article>
    );
}
