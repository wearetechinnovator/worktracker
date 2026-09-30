'use client';

import {
	useState,
	useEffect,
	useCallback,
	useMemo,
} from 'react';

import {
	UserPlus,
	AlertCircle,
	LayoutGrid,
	List,
	Eye,
	Pencil,
	Trash2,
} from 'lucide-react';

import { formatMinutesToDuration } from '@/lib/time';
import EmployeeAttendanceCalendarModal from '@/components/EmployeeAttendanceCalendarModal';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';
import PageShimmer from '@/components/PageShimmer';
import EmployeeCard from '@/components/EmployeeCard';
import { toast } from '@/lib/toast';
import EmployeeDetailsModal from '@/components/EmployeeDetailsModal';

type Employee = {
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

	// Attendance data if API provides it
	totalMinutes?: number;

	todayAttendance?: {
		allowPunchInDate?: string;
		allowPunchOutDate?: string;
	};
};

export default function EmployeesPage() {
	const [user, setUser] = useState<any>(null);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

	// View mode: card or tabular
	const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

	const ITEMS_PER_PAGE = 10;

	const tableHeaderStyle: React.CSSProperties = {
		padding: '12px 14px',
		textAlign: 'left',
		fontSize: '0.72rem',
		fontWeight: 750,
		color: 'var(--text-secondary)',
		whiteSpace: 'nowrap',
	};

	const tableCellStyle: React.CSSProperties = {
		padding: '12px 14px',
		fontSize: '0.8rem',
		color: 'var(--text-secondary)',
		verticalAlign: 'middle',
		whiteSpace: 'nowrap',
	};

	/*
	 * =========================================================
	 * GET CURRENT USER
	 * =========================================================
	 */

	const fetchCurrentUser = useCallback(async () => {
		try {
			const response = await fetch('/api/auth/me', {
				method: 'GET',
				credentials: 'include',
				cache: 'no-store',
			});

			const result = await response.json();

			if (
				!response.ok ||
				!result.success ||
				!result.user
			) {
				throw new Error(
					result.message ||
					'Authentication required'
				);
			}

			setUser(result.user);

			return result.user;
		} catch (error) {
			console.error(
				'Failed to fetch current user:',
				error
			);

			setUser(null);

			throw error;
		}
	}, []);

	/*
	 * =========================================================
	 * GET EMPLOYEES FROM DATABASE
	 * =========================================================
	 */

	const fetchEmployees = useCallback(async () => {
		try {
			setLoading(true);

			const response = await fetch(
				"/api/users/employees",
				{
					method: "GET",
					credentials: "include",
					cache: "no-store",
				}
			);

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(
					result.message || "Failed to load employees"
				);
			}

			setEmployees(result.data || []);
		} catch (error: any) {
			console.error("Failed to fetch employees:", error);
			setError(
				error.message || "Failed to load employees"
			);
		} finally {
			setLoading(false);
		}
	}, []);

	/*
	 * =========================================================
	 * INITIAL LOAD
	 * =========================================================
	 */

	useEffect(() => {
		const initializePage = async () => {
			try {
				const currentUser =
					await fetchCurrentUser();

				/*
				 * Only fetch employees after
				 * authentication is confirmed.
				 */
				if (currentUser) {
					await fetchEmployees();
				}
			} catch {
				setLoading(false);
				setError(
					'Authentication required'
				);
			}
		};

		initializePage();
	}, [
		fetchCurrentUser,
		fetchEmployees,
	]);

	/*
	 * =========================================================
	 * OPEN EMPLOYEE FROM URL
	 * /employees?select=<employeeId>
	 * =========================================================
	 */

	useEffect(() => {
		if (
			typeof window === 'undefined' ||
			employees.length === 0
		) {
			return;
		}

		const selectId =
			new URLSearchParams(
				window.location.search
			).get('select');

		if (!selectId) {
			return;
		}

		const matchedEmployee =
			employees.find(
				(employee) =>
					String(employee._id) ===
					String(selectId)
			);

		if (matchedEmployee) {
			setSelectedEmployee(
				matchedEmployee
			);

			setIsDetailModalOpen(true);
		}
	}, [employees]);

	const filteredEmployees = useMemo(() => {
		return employees;
	}, [employees]);

	/*
	 * =========================================================
	 * PAGINATION
	 * =========================================================
	 */

	useEffect(() => {
		const totalPages = Math.max(
			1,
			Math.ceil(
				filteredEmployees.length /
				ITEMS_PER_PAGE
			)
		);

		if (
			currentPage > totalPages
		) {
			setCurrentPage(totalPages);
		}
	}, [
		filteredEmployees.length,
		currentPage,
	]);

	const paginatedEmployees =
		filteredEmployees.slice(
			(currentPage - 1) *
			ITEMS_PER_PAGE,
			currentPage *
			ITEMS_PER_PAGE
		);

	/*
	 * =========================================================
	 * EDIT
	 * =========================================================
	 */

	const openEditModal = (
		employee: Employee
	) => {
		setSelectedEmployee(employee);
		setIsEditModalOpen(true);
	};

	/*
	 * =========================================================
	 * DETAILS
	 * =========================================================
	 */

	const openEmployeeDetails = (employee: Employee) => {
		setSelectedEmployee(employee);
		setIsDetailModalOpen(true);
	};

	/*
	 * =========================================================
	 * DELETE
	 *
	 * NOTE:
	 * This UI handler currently removes from state.
	 * Connect DELETE API here when your delete endpoint
	 * is ready.
	 * =========================================================
	 */
	const handleDelete = async (empId: string) => {
		const emp = employees.find(
			(e) => String(e._id) === String(empId)
		);

		const empName =
			(emp as any)?.full_name ||
			(emp as any)?.name ||
			"Employee";

		if (
			!confirm(
				`Are you sure you want to delete ${empName}? This action is irreversible.`
			)
		) {
			return;
		}

		try {
			const response = await fetch(
				`/api/users/employees?id=${encodeURIComponent(empId)}`,
				{
					method: "DELETE",
					credentials: "include",
				}
			);

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(
					data.message || "Failed to delete employee"
				);
			}

			setEmployees((prev) =>
				prev.filter(
					(e) => String(e._id) !== String(empId)
				)
			);

			toast.success(
				`${empName} deleted successfully`
			);
		} catch (error: any) {
			console.error("Delete employee error:", error);

			toast.error(
				error.message || "Failed to delete employee"
			);
		}
	};
	/*
	 * =========================================================
	 * PUNCH OVERRIDE
	 * =========================================================
	 */

	const handleTogglePunchOverride =
		async (
			employeeId: string,
			action:
				| 'allowPunchIn'
				| 'allowPunchOut'
		) => {
			try {
				/*
				 * TODO:
				 * Connect this to attendance API.
				 */

				console.log(
					'Punch override',
					employeeId,
					action
				);

				toast.success(
					`Permission updated for ${action}`
				);
			} catch (error) {
				console.error(
					'Punch override error:',
					error
				);

				toast.error(
					'Failed to update permission'
				);
			}
		};

	/*
	 * =========================================================
	 * PAGINATION UI
	 * =========================================================
	 */

	const renderPagination = (
		totalItems: number,
		itemsPerPage: number,
		page: number,
		onPageChange: (
			page: number
		) => void
	) => {
		const totalPages = Math.ceil(
			totalItems / itemsPerPage
		);

		if (totalPages <= 1) {
			return null;
		}

		return (
			<div
				style={{
					display: 'flex',
					justifyContent:
						'space-between',
					alignItems: 'center',
					marginTop: '20px',
					padding: '12px 16px',
					background:
						'var(--bg-secondary)',
					borderRadius: '8px',
					border:
						'1px solid var(--border-color)',
					width: '100%',
					gridColumn: '1 / -1',
				}}
				className="no-print"
			>
				<div
					style={{
						fontSize: '0.8rem',
						color:
							'var(--text-secondary)',
					}}
				>
					Showing{' '}
					<strong>
						{totalItems === 0
							? 0
							: (page - 1) *
							itemsPerPage +
							1}
						-
						{Math.min(
							totalItems,
							page * itemsPerPage
						)}
					</strong>{' '}
					of{' '}
					<strong>
						{totalItems}
					</strong>{' '}
					entries
				</div>

				<div
					style={{
						display: 'flex',
						gap: '6px',
					}}
				>
					<button
						className="btn btn-secondary"
						onClick={() =>
							onPageChange(page - 1)
						}
						disabled={page === 1}
						style={{
							padding: '4px 10px',
							fontSize: '0.75rem',
							opacity:
								page === 1 ? 0.5 : 1,
						}}
					>
						Previous
					</button>

					{Array.from({
						length: totalPages,
					}).map((_, index) => {
						const pageNumber =
							index + 1;

						if (
							pageNumber === 1 ||
							pageNumber ===
							totalPages ||
							Math.abs(
								pageNumber - page
							) <= 1
						) {
							return (
								<button
									key={pageNumber}
									className={
										page === pageNumber
											? 'btn btn-primary'
											: 'btn btn-secondary'
									}
									onClick={() =>
										onPageChange(
											pageNumber
										)
									}
									style={{
										padding:
											'4px 10px',
										fontSize:
											'0.75rem',
									}}
								>
									{pageNumber}
								</button>
							);
						}

						if (
							pageNumber === 2 ||
							pageNumber ===
							totalPages - 1
						) {
							return (
								<span
									key={pageNumber}
									style={{
										color:
											'var(--text-muted)',
										alignSelf:
											'center',
										padding:
											'0 4px',
									}}
								>
									...
								</span>
							);
						}

						return null;
					})}

					<button
						className="btn btn-secondary"
						onClick={() =>
							onPageChange(page + 1)
						}
						disabled={
							page === totalPages
						}
						style={{
							padding: '4px 10px',
							fontSize: '0.75rem',
							opacity:
								page === totalPages
									? 0.5
									: 1,
						}}
					>
						Next
					</button>
				</div>
			</div>
		);
	};

	/*
	 * =========================================================
	 * LOADING
	 * =========================================================
	 */

	if (
		loading &&
		employees.length === 0
	) {
		return (
			<PageShimmer variant="employees" />
		);
	}

	/*
	 * =========================================================
	 * PAGE
	 * =========================================================
	 */

	return (
		<div>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					justifyContent:
						'space-between',
					alignItems: 'center',
					flexWrap: 'wrap',
					gap: '20px',
					marginBottom: '20px',
				}}
			>
				<div>
					<h1
						style={{
							fontSize: '1.4rem',
							fontWeight: 800,
						}}
					>
						Team Directory
					</h1>

					<p>
						See your employees and
						their details here
					</p>
				</div>

				<button
					className="btn btn-primary"
					onClick={() =>
						setIsAddModalOpen(true)
					}
				>
					<UserPlus size={14} />

					<span>
						Add Employee
					</span>
				</button>
			</div>


			{/* Error */}
			{error && (
				<div
					className="card"
					style={{
						borderLeft:
							'4px solid #ef4444',
						display: 'flex',
						alignItems: 'center',
						gap: '12px',
						marginBottom: '20px',
					}}
				>
					<AlertCircle
						style={{
							color: '#ef4444',
						}}
					/>

					<p
						style={{
							fontWeight: 650,
						}}
					>
						{error}
					</p>
				</div>
			)}

			{/* View Toggle + Employee List */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'flex-end',
					alignItems: 'center',
					marginBottom: '14px',
				}}
				className="no-print"
			>
				<div
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '3px',
						padding: '4px',
						borderRadius: '10px',
						border: '1px solid var(--border-color)',
						background: 'var(--bg-secondary)',
					}}
					role="group"
					aria-label="Employee view"
				>
					<button
						type="button"
						onClick={() => setViewMode('card')}
						aria-label="Card view"
						aria-pressed={viewMode === 'card'}
						title="Card view"
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '6px',
							padding: '7px 10px',
							border: 'none',
							borderRadius: '7px',
							cursor: 'pointer',
							background:
								viewMode === 'card'
									? 'var(--bg-primary)'
									: 'transparent',
							color:
								viewMode === 'card'
									? 'var(--text-primary)'
									: 'var(--text-secondary)',
							boxShadow:
								viewMode === 'card'
									? '0 1px 4px rgba(0,0,0,0.10)'
									: 'none',
							fontSize: '0.78rem',
							fontWeight: 650,
						}}
					>
						<LayoutGrid size={15} />
						Cards
					</button>

					<button
						type="button"
						onClick={() => setViewMode('table')}
						aria-label="Tabular view"
						aria-pressed={viewMode === 'table'}
						title="Tabular view"
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '6px',
							padding: '7px 10px',
							border: 'none',
							borderRadius: '7px',
							cursor: 'pointer',
							background:
								viewMode === 'table'
									? 'var(--bg-primary)'
									: 'transparent',
							color:
								viewMode === 'table'
									? 'var(--text-primary)'
									: 'var(--text-secondary)',
							boxShadow:
								viewMode === 'table'
									? '0 1px 4px rgba(0,0,0,0.10)'
									: 'none',
							fontSize: '0.78rem',
							fontWeight: 650,
						}}
					>
						<List size={15} />
						Table
					</button>
				</div>
			</div>

			{/* Employee List */}
			{viewMode === 'card' ? (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns:
							'repeat(auto-fill, minmax(280px, 1fr))',
						gap: '14px',
					}}
				>
					{filteredEmployees.length === 0 ? (
						<p
							style={{
								color: 'var(--text-muted)',
								textAlign: 'center',
								padding: '32px',
								gridColumn: '1 / -1',
							}}
						>
							No registered employees found. Click Add Employee to create one.
						</p>
					) : (
						paginatedEmployees.map((employee) => (
							<EmployeeCard
								key={employee._id}
								employee={employee}
								onOpenDetails={openEmployeeDetails}
								onEdit={openEditModal}
								onDelete={handleDelete}
								onTogglePunchOverride={handleTogglePunchOverride}
								openEmployeeDetails={openEmployeeDetails}
							/>
						))
					)}
				</div>
			) : (
				<div
					style={{
						width: '100%',
						overflowX: 'auto',
						border: '1px solid var(--border-color)',
						borderRadius: '10px',
						// background: 'var(--bg-secondary)',
					}}
				>
					{filteredEmployees.length === 0 ? (
						<p
							style={{
								color: 'var(--text-muted)',
								textAlign: 'center',
								padding: '32px',
							}}
						>
							No registered employees found. Click Add Employee to create one.
						</p>
					) : (
						<table
							style={{
								width: '100%',
								minWidth: '850px',
								borderCollapse: 'collapse',
							}}
						>
							<thead>
								<tr
									style={{
										borderBottom: '1px solid var(--border-color)',
										background: 'var(--bg-primary)',
									}}
								>
									<th style={tableHeaderStyle}>Employee</th>
									<th style={tableHeaderStyle}>Email</th>
									{/* <th style={tableHeaderStyle}>Phone</th> */}
									<th style={tableHeaderStyle}>Designation</th>
									<th style={tableHeaderStyle}>Group</th>
									<th style={tableHeaderStyle}>Status</th>
									<th
										style={{
											...tableHeaderStyle,
											textAlign: 'right',
										}}
									>
										Actions
									</th>
								</tr>
							</thead>

							<tbody>
								{paginatedEmployees.map((employee) => {
									const isActive = employee.status !== false;

									return (
										<tr
											key={employee._id}
											style={{
												borderBottom:
													'1px solid var(--border-color)',
											}}
										>
											<td style={tableCellStyle}>
												<div
													style={{
														display: 'flex',
														alignItems: 'center',
														gap: '10px',
														minWidth: '180px',
													}}
												>
													{employee.profile_picture ? (
														<img
															src={employee.profile_picture}
															alt={employee.full_name}
															style={{
																width: '36px',
																height: '36px',
																borderRadius: '50%',
																objectFit: 'cover',
																flexShrink: 0,
															}}
														/>
													) : (
														<div
															style={{
																width: '36px',
																height: '36px',
																borderRadius: '50%',
																display: 'flex',
																alignItems: 'center',
																justifyContent: 'center',

																border:
																	'1px solid var(--border-color)',
																fontSize: '0.78rem',
																fontWeight: 750,
																flexShrink: 0,
															}}
														>
															{employee.full_name
																?.split(' ')
																.map((name) => name[0])
																.slice(0, 2)
																.join('')
																.toUpperCase()}
														</div>
													)}

													<div>
														<div
															style={{
																fontWeight: 700,
																color: 'var(--text-primary)',
															}}
														>
															{employee.full_name}
														</div>

														<div
															style={{
																fontSize: '0.72rem',
																color: 'var(--text-muted)',
																marginTop: '2px',
															}}
														>
															{employee.user_role === 1
																? 'Admin'
																: 'Employee'}
														</div>
													</div>
												</div>
											</td>

											<td style={tableCellStyle}>
												{employee.email || '—'}
											</td>

											{/* <td style={tableCellStyle}>
                        {employee.phone_number || '—'}
                      </td> */}

											<td style={tableCellStyle}>
												{employee.designation || '—'}
											</td>

											<td style={tableCellStyle}>
												{employee.group || '—'}
											</td>

											<td style={tableCellStyle}>
												<span
													style={{
														display: 'inline-flex',
														alignItems: 'center',
														padding: '4px 9px',
														borderRadius: '999px',
														fontSize: '0.72rem',
														fontWeight: 700,
														background: isActive
															? 'rgba(34,197,94,0.12)'
															: 'rgba(239,68,68,0.12)',
														color: isActive
															? '#16a34a'
															: '#dc2626',
													}}
												>
													{isActive ? 'Active' : 'Inactive'}
												</span>
											</td>

											<td
												style={{
													...tableCellStyle,
													textAlign: 'right',
												}}
											>
												<div
													style={{
														display: 'inline-flex',
														alignItems: 'center',
														gap: '5px',
													}}
												>
													<button
														type="button"
														className="btn btn-secondary"
														title="View details"
														aria-label={`View ${employee.full_name}`}
														onClick={() => {
															openEmployeeDetails(employee)
														}}
														style={{
															padding: '6px 8px',
														}}
													>
														<Eye size={14} />
													</button>

													<button
														type="button"
														className="btn btn-secondary"
														title="Edit employee"
														aria-label={`Edit ${employee.full_name}`}
														onClick={() =>
															openEditModal(employee)
														}
														style={{
															padding: '6px 8px',
														}}
													>
														<Pencil size={14} />
													</button>

													<button
														type="button"
														className="btn btn-secondary"
														title="Delete employee"
														aria-label={`Delete ${employee.full_name}`}
														onClick={() =>
															handleDelete(employee._id)
														}
														style={{
															padding: '6px 8px',
															color: '#ef4444',
														}}
													>
														<Trash2 size={14} />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>
			)}

			{/* Pagination */}
			{renderPagination(
				filteredEmployees.length,
				ITEMS_PER_PAGE,
				currentPage,
				setCurrentPage
			)}

			{/* Details Modal */}
			<EmployeeDetailsModal
				employee={selectedEmployee as any}
				isOpen={isDetailModalOpen}
				onClose={() => setIsDetailModalOpen(false)}
			/>

			{/* Add Employee */}
			<AddTeamMemberModal
				isOpen={isAddModalOpen}
				onClose={() =>
					setIsAddModalOpen(false)
				}
				onSuccess={async () => {
					setIsAddModalOpen(false);
					await fetchEmployees();
				}}
			/>

			{/* Edit Employee */}
			<AddTeamMemberModal
				isOpen={
					isEditModalOpen
				}
				mode="edit"
				employee={
					selectedEmployee as any
				}
				onClose={() =>
					setIsEditModalOpen(false)
				}
				onSuccess={async () => {
					setIsEditModalOpen(false);
					await fetchEmployees();
				}}
			/>
		</div>
	);
}