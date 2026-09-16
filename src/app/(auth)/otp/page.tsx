'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft } from 'lucide-react';
import { sanitizeNumericInput } from '@/lib/inputValidation';


export default function OtpPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const email = searchParams.get("email") || "";

	const [otp, setOtp] = useState(['', '', '', '', '', '']);
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = otp.join("");

    if (code.length !== 6) {
        alert("Enter 6 digit OTP");
        return;
    }

    try {
        const response = await fetch("/api/otp/verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                email,
                otp: code,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.message || "OTP verification failed");
            return;
        }

        // OTP verification API now creates the DB session
        // and sets the worktracker_session cookie.
        router.push("/admin/dashboard");
        router.refresh();

    } catch (error) {
        console.error(error);
        alert("Something went wrong");
    }
};
	const handleChange = (index: number, value: string) => {
		const digit = sanitizeNumericInput(value).slice(-1);

		const newOtp = [...otp];
		newOtp[index] = digit;
		setOtp(newOtp);

		if (digit && index < 5) {
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (
		index: number,
		e: React.KeyboardEvent<HTMLInputElement>
	) => {
		if (e.key === 'Backspace' && !otp[index] && index > 0) {
			inputRefs.current[index - 1]?.focus();
		}
	};

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();

		const pasted = sanitizeNumericInput(
			e.clipboardData.getData('text')
		).slice(0, 6);

		if (!pasted) return;

		const newOtp = ['', '', '', '', '', ''];

		pasted.split('').forEach((digit, index) => {
			newOtp[index] = digit;
		});

		setOtp(newOtp);

		const nextIndex = Math.min(pasted.length, 5);
		inputRefs.current[nextIndex]?.focus();
	};



	const isComplete = otp.every(Boolean);

	return (<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '85vh',
				width: '100%',
			}}
		>
			<div
				className="card"
				style={{
					width: '100%',
					maxWidth: '380px',
					padding: '28px 30px',
					boxShadow: 'var(--shadow-md)',
				}}
			>
				{/* Header */}
				<div
					style={{
						textAlign: 'center',
						marginBottom: '24px',
					}}
				>
					<div
						style={{
							width: '42px',
							height: '42px',
							margin: '0 auto 14px',
							borderRadius: '10px',
							background: '#eff6ff',
							color: 'var(--accent-primary)',
							display: 'grid',
							placeItems: 'center',
						}}
					>
						<Mail size={20} />
					</div>

					<h2
						style={{
							fontSize: '1.4rem',
							fontWeight: 800,
							color: 'var(--text-primary)',
							marginBottom: '6px',
						}}
					>
						Verify your email
					</h2>

					<p
						style={{
							fontSize: '0.8rem',
							color: 'var(--text-muted)',
							lineHeight: 1.5,
							margin: 0,
						}}
					>
						Enter the 6-digit code sent to
						<br />
						<strong
							style={{
								color: 'var(--text-secondary)',
								fontWeight: 600,
							}}
						>
							{email}
						</strong>
					</p>
				</div>

				<form
					onSubmit={handleVerify}
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '18px',
					}}
				>
					{/* OTP Inputs */}
					<div
						style={{
							display: 'flex',
							justifyContent: 'center',
							gap: '8px',
						}}
					>
						{otp.map((digit, index) => (
							<input
								key={index}
								ref={(el) => {
									inputRefs.current[index] = el;
								}}
								type="text"
								inputMode="numeric"
								maxLength={1}
								value={digit}
								onChange={(e) =>
									handleChange(index, e.target.value)
								}
								onKeyDown={(e) =>
									handleKeyDown(index, e)
								}
								onPaste={handlePaste}
								autoComplete={index === 0 ? 'one-time-code' : 'off'}
								style={{
									width: '44px',
									height: '48px',
									textAlign: 'center',
									fontSize: '1.1rem',
									fontWeight: 700,
									color: 'var(--text-primary)',
									background: 'var(--bg-secondary)',
									border: `1px solid ${digit
										? 'var(--accent-primary)'
										: 'var(--border-color)'
										}`,
									borderRadius: 'var(--border-radius-sm)',
									outline: 'none',
									transition: 'var(--transition-fast)',
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor =
										'var(--accent-primary)';
									e.currentTarget.style.boxShadow =
										'0 0 0 2px rgba(59, 130, 246, 0.12)';
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = digit
										? 'var(--accent-primary)'
										: 'var(--border-color)';
									e.currentTarget.style.boxShadow = 'none';
								}}
							/>
						))}
					</div>

					<button
						type="submit"
						className="btn btn-primary"
						disabled={!isComplete}
						style={{
							padding: '8px 16px',
							fontSize: '0.85rem',
							width: '100%',
							height: '38px',
							opacity: isComplete ? 1 : 0.55,
							cursor: isComplete ? 'pointer' : 'not-allowed',
						}}
					>
						Verify OTP
					</button>

					{/* Resend */}
					<div
						style={{
							textAlign: 'center',
							fontSize: '0.75rem',
							color: 'var(--text-muted)',
						}}
					>
						Didn't receive the code?{' '}
						<button
							type="button"
							style={{
								border: 0,
								background: 'transparent',
								color: 'var(--accent-primary)',
								fontWeight: 700,
								cursor: 'pointer',
								padding: 0,
							}}
						>
							Resend OTP
						</button>
					</div>

					{/* Back */}
					<button
						type="button"
						onClick={() => router.back()}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '5px',
							border: 0,
							background: 'transparent',
							color: 'var(--text-muted)',
							fontSize: '0.75rem',
							cursor: 'pointer',
							padding: '2px',
						}}
					>
						<ArrowLeft size={13} />
						Back
					</button>
				</form>
			</div>
		</div>
	);
}