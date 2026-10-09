'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';

export default function RegisterPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [fullname, setFullname] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const registerImage = '/register_image.png';
	const tisLogo = '/tis.png'

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;

		setSubmitting(true);
		try {
			const response = await fetch(
				"/api/users/register",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						full_name: fullname,
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

			// Register success -> OTP page
			router.push(
				`/otp?email=${encodeURIComponent(email)}`
			);

		} catch (error) {
			console.error(error);
			alert("Something went wrong");
		} finally {
			setSubmitting(false);
		}
	};
	

	return (
		<div className="h-screen w-screen bg-blue-100 flex items-center justify-center">
	<div className="h-[80%] w-[70%] bg-white flex overflow-hidden rounded-2xl shadow-lg">

		{/* Left - Register Image */}
		<div className="w-1/2 h-full relative overflow-hidden">
			<img
				src={registerImage}
				alt="Register"
				className="h-full w-full object-cover"
			/>

			{/* Gradient */}
			<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />


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
					Start getting things done.
				</h2>

				<p className="mt-2 text-sm text-white/80">
					Create your workspace and take control of your tasks.
				</p>
			</div>
		</div>

		{/* Right - Register Form */}
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
				<div
					style={{
						textAlign: "center",
						marginBottom: "24px",
					}}
				>
					<h2
						style={{
							fontSize: "1.4rem",
							fontWeight: 800,
							color: "var(--text-primary)",
							marginBottom: "4px",
						}}
					>
						Create your account
					</h2>

					<p
						style={{
							fontSize: "0.8rem",
							color: "var(--text-muted)",
						}}
					>
						Get started with Quanto Track
					</p>
				</div>

				<form
					onSubmit={handleRegister}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "14px",
					}}
				>
					{/* Full Name */}
					<div className="form-group" style={{ margin: 0 }}>
						<label className="form-label">
							Full Name
						</label>

						<div
							style={{
								position: "relative",
								display: "flex",
								alignItems: "center",
							}}
						>
							<User
								size={16}
								style={{
									position: "absolute",
									left: "10px",
									color: "var(--text-muted)",
								}}
							/>

							<input
								type="text"
								className="form-control"
								style={{ paddingLeft: "32px" }}
								placeholder="Full Name"
								required
								value={fullname}
								onChange={(e) =>
									setFullname(e.target.value)
								}
							/>
						</div>
					</div>

					{/* Email */}
					<div className="form-group" style={{ margin: 0 }}>
						<label className="form-label">
							Email Address
						</label>

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
								placeholder="example@gmail.com"
								required
								value={email}
								onChange={(e) =>
									setEmail(e.target.value)
								}
							/>
						</div>
					</div>

					{/* Password */}
					<div className="form-group" style={{ margin: 0 }}>
						<label className="form-label">
							Password
						</label>

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
								type={
									showPassword
										? "text"
										: "password"
								}
								className="form-control"
								style={{
									paddingLeft: "32px",
									paddingRight: "42px",
								}}
								placeholder="••••••••"
								required
								value={password}
								onChange={(e) =>
									setPassword(e.target.value)
								}
							/>

							<button
								type="button"
								onClick={() =>
									setShowPassword(
										(visible) => !visible
									)
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

					{/* Register Button */}
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
						Create Account
					</Button>

					{/* Login Link */}
					<p className="flex gap-2 justify-center">
						Already have an account?

						<AnimateIcon
							animateOnHover
							className="flex gap-1 text-blue-500 cursor-pointer"
						>
							<a
								href="/login"
								className="text-blue-500!"
							>
								Login
							</a>

							<ExternalLink size={15} />
						</AnimateIcon>
					</p>
				</form>
			</div>
		</div>
	</div>
</div>
	);
}

