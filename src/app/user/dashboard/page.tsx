'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TasksOverviewPanel from '@/components/TasksOverviewPanel';


export default function Dashboard() {
	const router = useRouter();
	const [user, setUser] = useState<any>(null);

	useEffect(() => {
		const loadCurrentUser = async () => {
			try {
				const response = await fetch('/api/auth/me', {
					method: 'GET',
					credentials: 'include',
					cache: 'no-store',
				});
				const result = await response.json();
				if (response.ok && result.success && result.user) {
					setUser({
						...result.user,
						user_role: Number(result.user.user_role),
						userType: Number(result.user.user_role) === 1 ? 'admin' : 'employee',
					});
				}
			} catch (error) {
				console.error('Failed to load user in dashboard:', error);
			}
		};
		loadCurrentUser();
	}, []);


	return (
		<div className="w-full">
			<aside className="">
				<TasksOverviewPanel />
			</aside>
		</div>
	);
}
