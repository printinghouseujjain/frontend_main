
"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import {
	ArrowRight,
	Mail,
	Lock,
	Eye,
	EyeOff,
	Gift,
	CheckCircle2,
} from "lucide-react";

type FormErrors = {
	email?: string;
	password?: string;
	general?: string;
};

type LoginResponse = {
	status?: number;
	message?: string;
	type?: "admin" | "user";
};

export default function LoginPage() {
	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<FormErrors>({});
	const [isLoading, setIsLoading] = useState(false);

	// ------------------------------------------------------------
	// Validation
	// ------------------------------------------------------------

	const validateForm = (): FormErrors => {
		const newErrors: FormErrors = {};

		const normalizedEmail = email.trim().toLowerCase();

		if (!normalizedEmail) {
			newErrors.email = "Email address is required.";
		} else if (normalizedEmail.length > 254) {
			newErrors.email = "Email address is too long.";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			newErrors.email = "Please enter a valid email address.";
		}

		if (!password) {
			newErrors.password = "Password is required.";
		} else if (password.length > 128) {
			newErrors.password = "Password is too long.";
		}

		return newErrors;
	};

	// ------------------------------------------------------------
	// Submit
	// ------------------------------------------------------------

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isLoading) return;

		setErrors({});

		const validationErrors = validateForm();

		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}

		setIsLoading(true);

		const normalizedEmail = email.trim().toLowerCase();

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					email: normalizedEmail,
					password,
				}),
			});

			let data: LoginResponse = {};

			try {
				data = await response.json();
			} catch {
				// Ignore invalid/non-JSON response.
			}

			// ----------------------------------------------------
			// Login failed
			// ----------------------------------------------------

			if (!response.ok) {
				setErrors({
					general:
						data?.message ||
						"Unable to sign in. Please check your email and password.",
				});

				return;
			}

			// ----------------------------------------------------
			// Login successful
			// Redirect based on account type
			// ----------------------------------------------------

			if (data.type === "admin") {
				window.location.href = "/admin";
				return;
			}

			if (data.type === "user") {
				window.location.href = "/profile";
				return;
			}

			// ----------------------------------------------------
			// Unexpected response
			// ----------------------------------------------------

			setErrors({
				general:
					"Login successful, but user type could not be determined.",
			});
		} catch {
			setErrors({
				general:
					"Unable to connect to the server. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	// ------------------------------------------------------------
	// Input helpers
	// ------------------------------------------------------------

	const handleEmailChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setEmail(event.target.value);

		if (errors.email || errors.general) {
			setErrors((previous) => ({
				...previous,
				email: undefined,
				general: undefined,
			}));
		}
	};

	const handlePasswordChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setPassword(event.target.value);

		if (errors.password || errors.general) {
			setErrors((previous) => ({
				...previous,
				password: undefined,
				general: undefined,
			}));
		}
	};

	return (
		<main
			className="min-h-[calc(100vh-90px)] bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
		>
			<div className="mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl items-center px-5 py-10 sm:px-6 lg:px-8">
				<div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-[0_15px_60px_rgba(80,40,20,0.08)] lg:grid-cols-2">
					{/* =====================================================
					    BRAND PANEL
					===================================================== */}

					<div className="relative hidden min-h-[620px] overflow-hidden bg-[#85161B] p-10 text-white lg:flex lg:flex-col lg:justify-between">
						{/* Decorative circles */}

						<div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />

						<div className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full border border-white/10" />

						<div className="pointer-events-none absolute right-20 top-1/2 h-32 w-32 rounded-full border border-white/5" />

						{/* Logo */}

						<Link
							href="/"
							className="relative z-10 flex w-fit items-center gap-3 transition-opacity hover:opacity-85"
						>
							<div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7D6BF] text-[#85161B]">
								<Gift size={21} />
							</div>

							<div>
								<div className="text-xl font-bold">Printing House</div>

								<div className="text-xs text-white/70">
									You Think... We Create...
								</div>
							</div>
						</Link>

						{/* Main message */}

						<div className="relative z-10 max-w-md">
							<p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#F7D6BF]">
								Welcome back
							</p>

							<h1
								className="text-4xl font-bold leading-tight text-white xl:text-5xl"
								style={{ color: "#ffff" }}
							>
								Your thoughtful
								<br />
								gifts are waiting.
							</h1>

							<p className="mt-5 max-w-sm text-sm leading-7 text-white/80">
								Sign in to manage your orders, save your favourite gifts, and
								keep your personalized creations in one place.
							</p>

							{/* Benefits */}

							<div className="mt-8 space-y-4">
								{[
									"Manage your personalized gifts",
									"Track your orders",
									"Save your favourite products",
								].map((item) => (
									<div key={item} className="flex items-center gap-3">
										<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#F7D6BF]">
											<CheckCircle2 size={14} />
										</div>

										<span className="text-sm text-white/75">{item}</span>
									</div>
								))}
							</div>
						</div>

						{/* Footer */}

						<div className="relative z-10">
							<div className="mb-3 h-px w-full bg-white/15" />

							<p className="text-xs text-white/65">
								Personalized gifts. Beautiful memories.
							</p>
						</div>
					</div>

					{/* =====================================================
					    LOGIN FORM
					===================================================== */}

					<div className="flex min-h-[620px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
						{/* Mobile logo */}

						<div className="mb-10 lg:hidden">
							<Link href="/" className="inline-flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7D6BF] text-[#85161B]">
									<Gift size={19} />
								</div>

								<div>
									<div className="font-bold text-[#2E2E2E]">Printing House</div>

									<div className="text-[10px] text-[#2E2E2E]/50">
										You Think... We Create...
									</div>
								</div>
							</Link>
						</div>

						{/* Heading */}

						<div>
							<h2 className="text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl">
								Sign in
							</h2>

							<p className="mt-2 text-sm text-[#2E2E2E]/55">
								Welcome back! Please enter your details.
							</p>
						</div>

						{/* Form */}

						<form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
							{/* =================================================
							    EMAIL
							================================================== */}

							<div>
								<label
									htmlFor="email"
									className="mb-2 block text-sm font-medium text-[#2E2E2E]"
								>
									Email address
								</label>

								<div
									className={`flex items-center rounded-xl border bg-[#FCFBFA] px-3.5 transition focus-within:ring-2 ${
										errors.email
											? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/10"
											: "border-[#DED6D0] focus-within:border-[#85161B] focus-within:ring-[#85161B]/10"
									}`}
								>
									<Mail
										size={18}
										aria-hidden="true"
										className="mr-3 shrink-0 text-[#2E2E2E]/35"
									/>

									<input
										id="email"
										name="email"
										type="email"
										value={email}
										onChange={handleEmailChange}
										autoComplete="email"
										inputMode="email"
										maxLength={254}
										required
										disabled={isLoading}
										placeholder="you@example.com"
										aria-invalid={Boolean(errors.email)}
										aria-describedby={errors.email ? "email-error" : undefined}
										className="w-full bg-transparent py-3.5 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30 disabled:cursor-not-allowed disabled:opacity-60"
									/>
								</div>

								{errors.email && (
									<p
										id="email-error"
										role="alert"
										className="mt-1.5 text-xs text-red-600"
									>
										{errors.email}
									</p>
								)}
							</div>

							{/* =================================================
							    PASSWORD
							================================================== */}

							<div>
								<div className="mb-2 flex items-center justify-between">
									<label
										htmlFor="password"
										className="text-sm font-medium text-[#2E2E2E]"
									>
										Password
									</label>

									<Link
										href="/forgot-password"
										className="text-xs font-medium text-[#85161B] hover:underline"
									>
										Forgot password?
									</Link>
								</div>

								<div
									className={`flex items-center rounded-xl border bg-[#FCFBFA] px-3.5 transition focus-within:ring-2 ${
										errors.password
											? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/10"
											: "border-[#DED6D0] focus-within:border-[#85161B] focus-within:ring-[#85161B]/10"
									}`}
								>
									<Lock
										size={18}
										aria-hidden="true"
										className="mr-3 shrink-0 text-[#2E2E2E]/35"
									/>

									<input
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={handlePasswordChange}
										autoComplete="current-password"
										maxLength={128}
										required
										disabled={isLoading}
										placeholder="Enter your password"
										aria-invalid={Boolean(errors.password)}
										aria-describedby={
											errors.password ? "password-error" : undefined
										}
										className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30 disabled:cursor-not-allowed disabled:opacity-60"
									/>

									<button
										type="button"
										onClick={() => setShowPassword((value) => !value)}
										disabled={isLoading}
										aria-label={
											showPassword ? "Hide password" : "Show password"
										}
										className="ml-2 shrink-0 rounded-md p-1 text-[#2E2E2E]/40 transition-colors hover:text-[#85161B] disabled:cursor-not-allowed disabled:opacity-50"
									>
										{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>

								{errors.password && (
									<p
										id="password-error"
										role="alert"
										className="mt-1.5 text-xs text-red-600"
									>
										{errors.password}
									</p>
								)}
							</div>

							{/* =================================================
							    REMEMBER ME
							================================================== */}

							{/* <label className="flex cursor-pointer items-center gap-2.5">
								<input
									type="checkbox"
									name="remember"
									disabled={isLoading}
									className="h-4 w-4 rounded border-[#D8CEC8] accent-[#85161B]"
								/>

								<span className="text-xs text-[#2E2E2E]/55">Remember me</span>
							</label> */}

							{/* =================================================
							    GENERAL ERROR
							================================================== */}

							{errors.general && (
								<div
									role="alert"
									aria-live="polite"
									className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
								>
									{errors.general}
								</div>
							)}

							{/* =================================================
							    SUBMIT
							================================================== */}

							<button
								type="submit"
								disabled={isLoading}
								className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#721318] hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#85161B] disabled:hover:shadow-none"
							>
								{isLoading ? (
									<>
										<span
											className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
											aria-hidden="true"
										/>
										Signing in...
									</>
								) : (
									<>
										Sign in
										<ArrowRight
											size={17}
											className="transition-transform duration-200 group-hover:translate-x-1"
										/>
									</>
								)}
							</button>
						</form>

						{/* Register */}

						<div className="mt-7 border-t border-[#2E2E2E]/10 pt-6 text-center">
							<p className="text-sm text-[#2E2E2E]/50">
								Don't have an account?{" "}
								<Link
									href="/register"
									className="font-semibold text-[#85161B] hover:underline"
								>
									Create one
								</Link>
							</p>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
