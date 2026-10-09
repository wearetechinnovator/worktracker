'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { ExternalLinkIcon } from '@/components/animate-ui/icons/external-link';

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const loginImage = '/login_image.png';
	const tisLogo = '/tis.png'

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;

		setSubmitting(true);
		try {
			const response = await fetch(
				"/api/auth/login",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						email,
						password,
					}),
				}
			);

			const data = await response.json();

			if (!response.ok) {
				alert(data.message);
				return;
			}

			if (data.data?.user_role === 1) {
				router.push('/admin/dashboard');
			} else if (data.data?.user_role === 2) {
				router.push('/user/dashboard');
			} else {
				alert('Invalid user role');
			}

		} catch (error) {
			console.error(error);
			alert("Something went wrong");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<>
			<div className="h-screen w-screen bg-orange-200/20 flex items-center justify-center">
				<div className="h-[80%] w-[70%] bg-white flex overflow-hidden rounded-2xl shadow-lg">

					{/* Left - Image */}
					<div className="w-1/2 h-full relative overflow-hidden">
						<img
							src={loginImage}
							alt="Login"
							className="h-full w-full object-cover"
						/>

						{/* Gradient */}
						<div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />

						{/* Top Content */}
						<div className="absolute top-8 left-10 text-white flex items-center gap-20 w-full">
							

							<div>
								<span className="text-sm font-bold tracking-wide">
									QUANTO TRACK
								</span>

								<p className="mt-1 text-xs text-white/75">
									Organize your work. Stay in control.
								</p>
							</div>

							<img
								src={tisLogo}
								alt="Quanto Track"
								className="w-[100px] h-[100px] object-contain"
							/>
						</div>

						{/* Bottom Content */}
						<div className="absolute bottom-10 left-10 text-white max-w-sm">
							<h2 className="text-3xl font-bold leading-tight">
								From tasks to done.
							</h2>

							<p className="mt-2 text-sm text-white/80">
								Simple tracking. Better productivity.
							</p>
						</div>
					</div>

					{/* Right - Login */}
					<div className="w-1/2 h-full flex items-center justify-center">
						<div
							className="card"
							style={{
								width: "100%",
								maxWidth: "380px",
								padding: "24px 30px",
								boxShadow: "var(--shadow-md)",
							}}
						>
							{/* Header */}
							<div style={{ textAlign: "center", marginBottom: "24px" }}>
								<h2
									style={{
										fontSize: "1.4rem",
										fontWeight: 800,
										color: "var(--text-primary)",
										marginBottom: "4px",
									}}
								>
									Login
								</h2>

								<p
									style={{
										fontSize: "0.8rem",
										color: "var(--text-muted)",
									}}
								>
									Login to Quanto Track
								</p>
							</div>

							<form
								onSubmit={handleLogin}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "14px",
								}}
							>
								{/* Email */}
								<div className="form-group" style={{ margin: 0 }}>
									<label className="form-label">Email Address</label>

									<div
										style={{
											position: "relative",
											display: "flex",
											alignItems: "center",
										}}
									>
										<Mail
											size={16}
											style={{
												position: "absolute",
												left: "10px",
												color: "var(--text-muted)",
											}}
										/>

										<input
											type="email"
											className="form-control"
											style={{ paddingLeft: "32px" }}
											placeholder="you@company.com"
											required
											value={email}
											onChange={(e) => setEmail(e.target.value)}
										/>
									</div>
								</div>

								{/* Password */}
								<div className="form-group" style={{ margin: 0 }}>
									<label className="form-label">Password</label>

									<div
										style={{
											position: "relative",
											display: "flex",
											alignItems: "center",
										}}
									>
										<Lock
											size={16}
											style={{
												position: "absolute",
												left: "10px",
												color: "var(--text-muted)",
											}}
										/>

										<input
											type={showPassword ? "text" : "password"}
											className="form-control"
											style={{
												paddingLeft: "32px",
												paddingRight: "42px",
											}}
											placeholder="••••••••"
											required
											value={password}
											onChange={(e) => setPassword(e.target.value)}
										/>

										<button
											type="button"
											onClick={() =>
												setShowPassword((visible) => !visible)
											}
											style={{
												position: "absolute",
												right: "6px",
												display: "grid",
												placeItems: "center",
												width: "30px",
												height: "30px",
												border: 0,
												borderRadius: "8px",
												background: "transparent",
												color: "var(--text-muted)",
												cursor: "pointer",
											}}
										>
											{showPassword ? (
												<EyeOff size={17} />
											) : (
												<Eye size={17} />
											)}
										</button>
									</div>
								</div>

								{/* Login */}
								<Button
									type="submit"
									loading={submitting}
									className="btn btn-primary"
									style={{
										padding: "8px 16px",
										fontSize: "0.85rem",
										marginTop: "10px",
										width: "100%",
										height: "38px",
									}}
								>
									Login
								</Button>

								{/* Register */}
								<p className="flex gap-2 justify-center">
									Don't have an account?

									<AnimateIcon
										animateOnHover
										className="flex gap-1 text-blue-500 cursor-pointer"
									>
										<a href="/register" className="text-blue-500!">
											Register
										</a>

										<ExternalLinkIcon size={15} />
									</AnimateIcon>
								</p>
							</form>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
