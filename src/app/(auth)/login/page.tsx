'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { staticClient } from '@/lib/staticClient';
import { LogIn } from '@/components/animate-ui/icons/log-in';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { ExternalLink, ExternalLinkIcon } from '@/components/animate-ui/icons/external-link';

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);

	const handleLogin = (e: React.FormEvent) => {
		e.preventDefault();
		const demoUser = staticClient.getUser();
		localStorage.setItem('worktracker_user', JSON.stringify(demoUser));
		router.push('/dashboard');
	};

	return (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			minHeight: '85vh',
			width: '100%',
		}}>
			<div className="card" style={{
				width: '100%',
				maxWidth: '380px',
				padding: '24px 30px',
				boxShadow: 'var(--shadow-md)',
			}}>
				{/* Header */}
				<div style={{ textAlign: 'center', marginBottom: '24px' }}>
					<h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
						Login
					</h2>
					<p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
						Login to Quanto Track
					</p>
				</div>

				<form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
					<div className="form-group" style={{ margin: 0 }}>
						<label className="form-label">Email Address</label>
						<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
							<Mail size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
							<input
								type="email"
								className="form-control"
								style={{ paddingLeft: '32px' }}
								placeholder="you@company.com"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
					</div>

					<div className="form-group" style={{ margin: 0 }}>
						<label className="form-label">Password</label>
						<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
							<Lock size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
							<input
								type={showPassword ? 'text' : 'password'}
								className="form-control"
								style={{ paddingLeft: '32px', paddingRight: '42px' }}
								placeholder="••••••••"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<button
								type="button"
								onClick={() => setShowPassword((visible) => !visible)}
								style={{
									position: 'absolute',
									right: '6px',
									display: 'grid',
									placeItems: 'center',
									width: '30px',
									height: '30px',
									border: 0,
									borderRadius: '8px',
									background: 'transparent',
									color: 'var(--text-muted)',
									cursor: 'pointer',
								}}
							>
								{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
							</button>
						</div>
					</div>


						<button
							type="submit"
							className="btn btn-primary"
							style={{
								padding: '8px 16px',
								fontSize: '0.85rem',
								marginTop: '10px',
								width: '100%',
								height: '38px',
							}}
						>
							Login

						</button>

					<p className='flex gap-2 justify-center'>Don't have an account ?
						<AnimateIcon animateOnHover className='flex gap-1 text-blue-500 cursor-pointer'>
							<a href="/register" className='text-blue-500!'>Register</a>
							<ExternalLinkIcon size={15}/>
						</AnimateIcon>
					</p>
				</form>
			</div>
		</div>
	);
}
