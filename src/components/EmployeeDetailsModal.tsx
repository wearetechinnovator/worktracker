'use client';
import { toast } from '@/lib/toast';
import { useEffect, useState } from 'react';


interface Employee {
	_id: string;
	name?: string;
	full_name?: string;
	email?: string;
	phone_number?: string;
	isVerify?: boolean,
	role?: string;
	designation?: string;
	Project?: string;
	group?: string;
	avatarColor?: string;
	profile_picture?: string | null;
	status?: string | boolean;
	userType?: string;
	user_role?: number;
	workMode?: string;
}

interface Props {
	employee: Employee | null;
	isOpen: boolean;
	onClose: () => void;
}

export default function EmployeeDetailsModal({ employee, isOpen, onClose }: Props) {
	const [empData, setEmpData] = useState<any>();


	// Get Employee data
	useEffect(() => {
		if (!isOpen || !employee) return;
		(async () => {
			try {
				const req = await fetch("/api/users/employees")
				const res = await req.json();
				console.log(res.data[0]);

				setEmpData(res.data[0])
			} catch (err) {
				toast.error("Something went wrong");
			}
		})()
	}, [isOpen])

	if (!isOpen || !employee) return;
	const employeeName = String(employee.full_name ?? employee.name ?? 'Employee').trim() || 'Employee';
	const employeeDesignation = String(employee.designation ?? employee.role ?? '').trim();
	const employeeProject = String(employee.Project ?? '').trim();

	return (
		<div className="modal-overlay" onClick={onClose} style={{ zIndex: 1500 }}>
			<div className="modal-container max-w-187.5! w-[70%] max-h-[92vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
						<div className="avatar w-10.5 h-10.5 text-[17px] font-bold" />
						<div>
							<h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
								{employeeName}
							</h2>
							<p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
								{employeeDesignation || 'Employee'}{' '}
								&bull;{' '}
								<span className="tag-badge">{employeeProject || 'No Project'}</span>
							</p>
						</div>
					</div>
					<button className="modal-close w-8.25!" onClick={onClose}>&times;</button>
				</div>

				{/* Modal Body */}
				<div className='w-full grid grid-cols-1 md:grid-cols-4'>
					<div>
						<p className='text-teal-900'>Full Name</p>
						<p className='text-sm text-gray-800'>{empData?.full_name}</p>
					</div>
					<div>
						<p className='text-teal-900'>Email</p>
						<p className='text-sm text-gray-800'>{empData?.email}</p>
					</div>
					<div>
						<p className='text-teal-900'>Phone</p>
						<p className='text-sm text-gray-800'>{empData?.phone_number || "--"}</p>
					</div>
					<div>
						<p className='text-teal-900'>Role</p>
						<p className='text-sm text-gray-800'>{empData?.role || "--"}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
