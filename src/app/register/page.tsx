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
	User,
	Phone,
	Check,
} from "lucide-react";

type FormErrors = {
	name?: string;
	email?: string;
	phone?: string;
	password?: string;
	confirmPassword?: string;
	terms?: string;
	otp?: string;
};

type SignupResponse = {
	message?: string;
	transaction_id?: string;
	transactionId?: string;
	transaction?: string;
	success?: boolean;
};

type VerifyResponse = {
	message?: string;
	success?: boolean;
};

export default function RegisterPage() {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const [otp, setOtp] = useState("");
	const [transactionId, setTransactionId] = useState("");

	const [termsAccepted, setTermsAccepted] = useState(false);

	const [errors, setErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	const [loading, setLoading] = useState(false);
	const [verifying, setVerifying] = useState(false);

	const [serverError, setServerError] = useState("");
	const [success, setSuccess] = useState("");

	const [otpStep, setOtpStep] = useState(false);

	/* =========================================================
	   VALIDATION
	========================================================= */

	const validateName = (value: string) => {
		const clean = value.trim();

		if (!clean) return "Full name is required.";
		if (clean.length < 2) return "Name must contain at least 2 characters.";
		if (clean.length > 100) return "Name must be less than 100 characters.";

		if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(clean)) {
			return "Name can only contain letters, spaces, hyphens and apostrophes.";
		}

		return undefined;
	};

	const validateEmail = (value: string) => {
		const clean = value.trim();

		if (!clean) return "Email address is required.";
		if (clean.length > 254) return "Email address is too long.";

		const emailRegex =
			/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

		if (!emailRegex.test(clean)) {
			return "Please enter a valid email address.";
		}

		return undefined;
	};

	const validatePhone = (value: string) => {
		const clean = value.trim();

		if (!clean) return "Phone number is required.";

		if (!/^[0-9]{10}$/.test(clean)) {
			return "Please enter a valid 10-digit phone number.";
		}

		return undefined;
	};

	const validatePassword = (value: string) => {
		if (!value) return "Password is required.";
		if (value.length < 8) {
			return "Password must contain at least 8 characters.";
		}

		if (value.length > 128) {
			return "Password must be less than 128 characters.";
		}

		if (!/[A-Z]/.test(value)) {
			return "Password must contain at least one uppercase letter.";
		}

		if (!/[a-z]/.test(value)) {
			return "Password must contain at least one lowercase letter.";
		}

		if (!/[0-9]/.test(value)) {
			return "Password must contain at least one number.";
		}

		if (!/[^A-Za-z0-9]/.test(value)) {
			return "Password must contain at least one special character.";
		}

		return undefined;
	};

	const validateConfirmPassword = (value: string) => {
		if (!value) return "Please confirm your password.";

		if (value !== password) {
			return "Passwords do not match.";
		}

		return undefined;
	};

	const validateForm = (): FormErrors => {
		const newErrors: FormErrors = {};

		const nameError = validateName(name);
		const emailError = validateEmail(email);
		const phoneError = validatePhone(phone);
		const passwordError = validatePassword(password);
		const confirmPasswordError = validateConfirmPassword(confirmPassword);

		if (nameError) newErrors.name = nameError;
		if (emailError) newErrors.email = emailError;
		if (phoneError) newErrors.phone = phoneError;
		if (passwordError) newErrors.password = passwordError;

		if (confirmPasswordError) {
			newErrors.confirmPassword = confirmPasswordError;
		}

		if (!termsAccepted) {
			newErrors.terms =
				"You must accept the Terms of Service and Privacy Policy.";
		}

		return newErrors;
	};

	/* =========================================================
	   SUBMIT SIGNUP
	========================================================= */

	const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		setServerError("");
		setSuccess("");

		const validationErrors = validateForm();

		setTouched({
			name: true,
			email: true,
			phone: true,
			password: true,
			confirmPassword: true,
			terms: true,
		});

		setErrors(validationErrors);

		if (Object.keys(validationErrors).length > 0) {
			return;
		}

		setLoading(true);

		try {
			/*
			 * IMPORTANT:
			 *
			 * Send FORM DATA, NOT JSON.
			 */
			const formData = new FormData();

			formData.append("email", email.trim().toLowerCase());
			formData.append("name", name.trim());
			formData.append("phone", phone.trim());
			formData.append("password", password);

			/*
			 * Browser
			 *   ↓
			 * /api/auth/signup
			 *   ↓
			 * https://api.printinghouseujjain.in/api/signup
			 */

			const response = await fetch("/api/auth/signup", {
				method: "POST",
				body: formData,
			});

			const data: SignupResponse = await response.json().catch(() => ({}));

			console.log("Signup response:", data);

			if (!response.ok) {
				throw new Error(
					data?.message || "Unable to create your account. Please try again.",
				);
			}

			/*
			 * Backend may call this:
			 * transaction_id
			 * transactionId
			 * transaction
			 */
			const transaction =
				data.transaction_id ?? data.transactionId ?? data.transaction;

			if (!transaction) {
				console.error("Signup response did not contain transaction ID:", data);

				throw new Error(
					"Signup succeeded, but no transaction ID was returned.",
				);
			}

			setTransactionId(String(transaction));

			/*
			 * Move to OTP verification step.
			 */
			setOtpStep(true);

			setSuccess(
				data.message ||
					"OTP has been sent to your email. Please enter it below.",
			);

			/*
			 * Clear password fields after signup request.
			 */
			setPassword("");
			setConfirmPassword("");
		} catch (error) {
			console.error("Signup failed:", error);

			setServerError(
				error instanceof Error
					? error.message
					: "Unable to create your account. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	/* =========================================================
	   VERIFY OTP
	========================================================= */

	const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		setServerError("");
		setSuccess("");

		const cleanOtp = otp.trim();

		if (!cleanOtp) {
			setErrors((previous) => ({
				...previous,
				otp: "Please enter the OTP.",
			}));
			return;
		}

		if (!transactionId) {
			setServerError(
				"Transaction ID is missing. Please start the signup process again.",
			);
			return;
		}

		setErrors((previous) => ({
			...previous,
			otp: undefined,
		}));

		setVerifying(true);

		try {
			/*
			 * IMPORTANT:
			 *
			 * Verify also expects FORM DATA.
			 *
			 * Send:
			 * otp
			 * transaction_id
			 */
			const formData = new FormData();

			formData.append("otp", cleanOtp);
			formData.append("transaction_id", transactionId);

			/*
			 * Browser
			 *   ↓
			 * /api/auth/verify
			 *   ↓
			 * https://api.printinghouseujjain.in/api/verify
			 */

			const response = await fetch("/api/auth/verify", {
				method: "POST",
				body: formData,
				credentials: "include",
			});

			const data: VerifyResponse = await response.json().catch(() => ({}));

			console.log("Verify response:", data);

			if (!response.ok) {
				throw new Error(data?.message || "Invalid OTP. Please try again.");
			}

			/*
			 * The backend creates the account and logs
			 * the user in after successful verification.
			 */
			setSuccess(
				data?.message ||
					"Account verified successfully. You are now logged in.",
			);

			setOtp("");

			/*
			 * Redirect to home page after successful
			 * account verification.
			 *
			 * Using a hard redirect (window.location.href)
			 * rather than router.push so the home page
			 * re-reads the session cookie set by the
			 * backend during verification.
			 */
			window.location.href = "/";
		} catch (error) {
			console.error("OTP verification failed:", error);

			setServerError(
				error instanceof Error
					? error.message
					: "Unable to verify OTP. Please try again.",
			);
		} finally {
			setVerifying(false);
		}
	};

	/* =========================================================
	   PASSWORD CHECKS
	========================================================= */

	const passwordChecks = {
		length: password.length >= 8,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		number: /[0-9]/.test(password),
		special: /[^A-Za-z0-9]/.test(password),
	};

	const isFormValid =
		!validateName(name) &&
		!validateEmail(email) &&
		!validatePhone(phone) &&
		!validatePassword(password) &&
		!validateConfirmPassword(confirmPassword) &&
		termsAccepted;

	/* =========================================================
	   INPUT CLASS
	========================================================= */

	const inputWrapper = (hasError: boolean) =>
		`
		flex
		items-center
		rounded-xl
		border
		bg-[#FCFBFA]
		px-3.5
		transition
		focus-within:border-[#85161B]
		focus-within:ring-2
		focus-within:ring-[#85161B]/10
		${hasError ? "border-red-400" : "border-[#DED6D0]"}
	`;

	return (
		<main
			className="min-h-[calc(100vh-72px)] bg-[#FBF9F7] pt-[112px]
					sm:pt-[120px]"
		>
			<div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl items-center px-5 py-8 sm:px-6 lg:px-8">
				<div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-[0_15px_60px_rgba(80,40,20,0.08)] lg:grid-cols-2">
					{/* =====================================================
					    LEFT PANEL
					===================================================== */}

					<div className="relative hidden overflow-hidden bg-[#85161B] p-10 text-white lg:flex lg:min-h-[650px] lg:flex-col lg:justify-between">
						<div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />

						<div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-white/10" />

						<div className="pointer-events-none absolute right-20 top-1/2 h-32 w-32 rounded-full border border-white/5" />

						<Link href="/" className="relative z-10 flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7D6BF] text-[#85161B]">
								<Gift size={21} />
							</div>

							<div>
								<div className="text-xl font-bold">Printing House</div>

								<div className="text-xs text-white/60">
									You Think... We Create...
								</div>
							</div>
						</Link>

						<div className="relative z-10 max-w-md">
							<p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#F7D6BF]">
								Start your journey
							</p>

							<h1
								className="text-4xl font-bold leading-tight xl:text-5xl"
								style={{ color: "#fff" }}
							>
								Create something
								<br />
								truly personal.
							</h1>

							<p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
								Create your Printing House account and make personalized gifts,
								save your favourites, and keep track of every order in one
								place.
							</p>

							<div className="mt-8 space-y-4">
								{[
									"Save your favourite gifts",
									"Track your personalized orders",
									"Get exclusive offers & updates",
								].map((item) => (
									<div key={item} className="flex items-center gap-3">
										<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#F7D6BF]">
											<Check size={14} />
										</div>

										<span className="text-sm text-white/75">{item}</span>
									</div>
								))}
							</div>
						</div>

						<div className="relative z-10">
							<div className="mb-3 h-px w-full bg-white/10" />

							<p className="text-xs text-white/45">
								Personalized gifts. Beautiful memories.
							</p>
						</div>
					</div>

					{/* =====================================================
					    RIGHT PANEL
					===================================================== */}

					<div className="flex min-h-[650px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
						{/* Mobile logo */}

						<div className="mb-8 lg:hidden">
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

						{/* =================================================
						    HEADING
						================================================= */}

						<div>
							<h2 className="text-3xl font-bold tracking-tight text-[#2E2E2E] sm:text-4xl">
								{otpStep ? "Verify your email" : "Create an account"}
							</h2>

							<p className="mt-2 text-sm text-[#2E2E2E]/55">
								{otpStep
									? `Enter the OTP sent to ${email}.`
									: "Join Printing House and start making moments personal."}
							</p>
						</div>

						{/* SERVER ERROR */}

						{serverError && (
							<div
								role="alert"
								className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
							>
								{serverError}
							</div>
						)}

						{/* SUCCESS */}

						{success && (
							<div
								role="status"
								className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
							>
								{success}
							</div>
						)}

						{/* =================================================
						    SIGNUP FORM
						================================================= */}

						{!otpStep ? (
							<form
								className="mt-7 space-y-4"
								onSubmit={handleSignup}
								noValidate
							>
								{/* NAME */}

								<div>
									<label
										htmlFor="name"
										className="mb-2 block text-sm font-medium text-[#2E2E2E]"
									>
										Full name
									</label>

									<div
										className={inputWrapper(!!(touched.name && errors.name))}
									>
										<User
											size={18}
											className="mr-3 shrink-0 text-[#2E2E2E]/35"
										/>

										<input
											id="name"
											type="text"
											value={name}
											onChange={(e) => setName(e.target.value)}
											onBlur={() => {
												setTouched((p) => ({
													...p,
													name: true,
												}));

												setErrors((p) => ({
													...p,
													name: validateName(name),
												}));
											}}
											autoComplete="name"
											placeholder="Your name"
											className="w-full bg-transparent py-3.5 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
										/>
									</div>

									{touched.name && errors.name && (
										<p className="mt-1.5 text-xs text-red-600">{errors.name}</p>
									)}
								</div>

								{/* EMAIL */}

								<div>
									<label
										htmlFor="email"
										className="mb-2 block text-sm font-medium text-[#2E2E2E]"
									>
										Email address
									</label>

									<div
										className={inputWrapper(!!(touched.email && errors.email))}
									>
										<Mail
											size={18}
											className="mr-3 shrink-0 text-[#2E2E2E]/35"
										/>

										<input
											id="email"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											onBlur={() => {
												setTouched((p) => ({
													...p,
													email: true,
												}));

												setErrors((p) => ({
													...p,
													email: validateEmail(email),
												}));
											}}
											autoComplete="email"
											placeholder="you@example.com"
											className="w-full bg-transparent py-3.5 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
										/>
									</div>

									{touched.email && errors.email && (
										<p className="mt-1.5 text-xs text-red-600">
											{errors.email}
										</p>
									)}
								</div>

								{/* PHONE */}

								<div>
									<label
										htmlFor="phone"
										className="mb-2 block text-sm font-medium text-[#2E2E2E]"
									>
										Phone number
									</label>

									<div
										className={inputWrapper(!!(touched.phone && errors.phone))}
									>
										<Phone
											size={18}
											className="mr-3 shrink-0 text-[#2E2E2E]/35"
										/>

										<input
											id="phone"
											type="tel"
											value={phone}
											onChange={(e) =>
												setPhone(e.target.value.replace(/\D/g, ""))
											}
											maxLength={10}
											autoComplete="tel"
											placeholder="10-digit phone number"
											className="w-full bg-transparent py-3.5 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
										/>
									</div>

									{touched.phone && errors.phone && (
										<p className="mt-1.5 text-xs text-red-600">
											{errors.phone}
										</p>
									)}
								</div>

								{/* PASSWORD */}

								<div>
									<label
										htmlFor="password"
										className="mb-2 block text-sm font-medium text-[#2E2E2E]"
									>
										Password
									</label>

									<div
										className={inputWrapper(
											!!(touched.password && errors.password),
										)}
									>
										<Lock
											size={18}
											className="mr-3 shrink-0 text-[#2E2E2E]/35"
										/>

										<input
											id="password"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											autoComplete="new-password"
											placeholder="Create a password"
											className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
										/>

										<button
											type="button"
											onClick={() => setShowPassword((v) => !v)}
											className="ml-2 shrink-0 text-[#2E2E2E]/40 hover:text-[#85161B]"
										>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									</div>

									<div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
										<PasswordRequirement
											valid={passwordChecks.length}
											text="8+ characters"
										/>

										<PasswordRequirement
											valid={passwordChecks.uppercase}
											text="Uppercase"
										/>

										<PasswordRequirement
											valid={passwordChecks.lowercase}
											text="Lowercase"
										/>

										<PasswordRequirement
											valid={passwordChecks.number}
											text="Number"
										/>

										<PasswordRequirement
											valid={passwordChecks.special}
											text="Special character"
										/>
									</div>
								</div>

								{/* CONFIRM PASSWORD */}

								<div>
									<label
										htmlFor="confirmPassword"
										className="mb-2 block text-sm font-medium text-[#2E2E2E]"
									>
										Confirm password
									</label>

									<div
										className={inputWrapper(
											!!(touched.confirmPassword && errors.confirmPassword),
										)}
									>
										<Lock
											size={18}
											className="mr-3 shrink-0 text-[#2E2E2E]/35"
										/>

										<input
											id="confirmPassword"
											type={showConfirmPassword ? "text" : "password"}
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											autoComplete="new-password"
											placeholder="Confirm your password"
											className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
										/>

										<button
											type="button"
											onClick={() => setShowConfirmPassword((v) => !v)}
											className="ml-2 shrink-0 text-[#2E2E2E]/40 hover:text-[#85161B]"
										>
											{showConfirmPassword ? (
												<EyeOff size={18} />
											) : (
												<Eye size={18} />
											)}
										</button>
									</div>
								</div>

								{/* TERMS */}

								<div>
									<label className="flex cursor-pointer items-start gap-2.5 pt-1">
										<input
											type="checkbox"
											checked={termsAccepted}
											onChange={(e) => setTermsAccepted(e.target.checked)}
											className="mt-0.5 h-4 w-4 rounded accent-[#85161B]"
										/>

										<span className="text-xs leading-5 text-[#2E2E2E]/55">
											I agree to the{" "}
											<Link
												href="/terms"
												className="font-medium text-[#85161B] hover:underline"
											>
												Terms of Service
											</Link>{" "}
											and{" "}
											<Link
												href="/privacy"
												className="font-medium text-[#85161B] hover:underline"
											>
												Privacy Policy
											</Link>
											.
										</span>
									</label>
								</div>

								{/* SUBMIT */}

								<button
									type="submit"
									disabled={loading || !isFormValid}
									className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] disabled:cursor-not-allowed disabled:opacity-50"
								>
									{loading ? (
										<>
											<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
											Sending OTP...
										</>
									) : (
										<>
											Create account
											<ArrowRight size={17} />
										</>
									)}
								</button>
							</form>
						) : (
							/* =================================================
							   OTP FORM
							================================================= */

							<form className="mt-7 space-y-5" onSubmit={handleVerifyOtp}>
								<div>
									<label
										htmlFor="otp"
										className="mb-2 block text-sm font-medium text-[#2E2E2E]"
									>
										Verification code
									</label>

									<input
										id="otp"
										type="text"
										inputMode="numeric"
										autoComplete="one-time-code"
										value={otp}
										onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
										maxLength={6}
										placeholder="Enter OTP"
										className="w-full rounded-xl border border-[#DED6D0] bg-[#FCFBFA] px-4 py-3.5 text-center text-lg tracking-[0.4em] outline-none focus:border-[#85161B] focus:ring-2 focus:ring-[#85161B]/10"
									/>

									{errors.otp && (
										<p className="mt-1.5 text-xs text-red-600">{errors.otp}</p>
									)}
								</div>

								<button
									type="submit"
									disabled={verifying || !otp.trim()}
									className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] disabled:cursor-not-allowed disabled:opacity-50"
								>
									{verifying ? (
										<>
											<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
											Verifying...
										</>
									) : (
										<>
											Verify & create account
											<ArrowRight size={17} />
										</>
									)}
								</button>

								<button
									type="button"
									onClick={() => {
										setOtpStep(false);
										setOtp("");
										setTransactionId("");
										setServerError("");
										setSuccess("");
									}}
									className="w-full text-sm font-medium text-[#85161B] hover:underline"
								>
									Back to signup
								</button>
							</form>
						)}

						{/* LOGIN */}

						<div className="mt-6 border-t border-[#2E2E2E]/10 pt-5 text-center">
							<p className="text-sm text-[#2E2E2E]/50">
								Already have an account?{" "}
								<Link
									href="/login"
									className="font-semibold text-[#85161B] hover:underline"
								>
									Sign in
								</Link>
							</p>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}

function PasswordRequirement({
	valid,
	text,
}: {
	valid: boolean;
	text: string;
}) {
	return (
		<div
			className={`flex items-center gap-1.5 ${
				valid ? "text-green-600" : "text-[#2E2E2E]/40"
			}`}
		>
			<div
				className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
					valid ? "bg-green-100" : "bg-[#2E2E2E]/5"
				}`}
			>
				{valid && <Check size={9} />}
			</div>

			<span>{text}</span>
		</div>
	);
}
