"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Eye,
	EyeOff,
	Lock,
	Mail,
	Phone,
	User,
} from "lucide-react";

type FormErrors = {
	name?: string;
	email?: string;
	phone?: string;
	password?: string;
	confirmPassword?: string;
};

type CreateResponse = {
	message?: string;
	success?: boolean;
};

/* =========================================================
   VALIDATION (same rules as the public register page)
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
	if (value.length < 8) return "Password must contain at least 8 characters.";
	if (value.length > 128) return "Password must be less than 128 characters.";

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

export default function AdminCreateCustomerPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const [reseller, setReseller] = useState<"yes" | "no">("no");
	const [credit, setCredit] = useState<"eligible" | "not_eligible">(
		"not_eligible",
	);

	const [showPassword, setShowPassword] = useState(false);

	const [errors, setErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	const [loading, setLoading] = useState(false);
	const [serverError, setServerError] = useState("");
	const [success, setSuccess] = useState("");

	const passwordChecks = {
		length: password.length >= 8,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		number: /[0-9]/.test(password),
		special: /[^A-Za-z0-9]/.test(password),
	};

	const validateConfirmPassword = (value: string) => {
		if (!value) return "Please confirm the password.";
		if (value !== password) return "Passwords do not match.";
		return undefined;
	};

	const validateForm = (): FormErrors => {
		const newErrors: FormErrors = {};

		const nameError = validateName(name);
		const emailError = validateEmail(email);
		const phoneError = validatePhone(phone);
		const passwordError = validatePassword(password);
		const confirmError = validateConfirmPassword(confirmPassword);

		if (nameError) newErrors.name = nameError;
		if (emailError) newErrors.email = emailError;
		if (phoneError) newErrors.phone = phoneError;
		if (passwordError) newErrors.password = passwordError;
		if (confirmError) newErrors.confirmPassword = confirmError;

		return newErrors;
	};

	const resetForm = () => {
		setName("");
		setEmail("");
		setPhone("");
		setPassword("");
		setConfirmPassword("");
		setReseller("no");
		setCredit("not_eligible");
		setShowPassword(false);
		setErrors({});
		setTouched({});
	};

	/* =========================================================
	   SUBMIT
	========================================================= */

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (loading) return;

		setServerError("");
		setSuccess("");

		const validationErrors = validateForm();

		setTouched({
			name: true,
			email: true,
			phone: true,
			password: true,
			confirmPassword: true,
		});

		setErrors(validationErrors);

		if (Object.keys(validationErrors).length > 0) {
			return;
		}

		setLoading(true);

		try {
			/*
			 * FORM DATA, like the public signup. command_type=admin
			 * makes the backend skip the OTP step.
			 */
			const body = new FormData();

			body.append("command_type", "admin");
			body.append("name", name.trim());
			body.append("email", email.trim().toLowerCase());
			body.append("phone", phone.trim());
			body.append("password", password);
			body.append("reseller", reseller);
			body.append("credit", credit);

			const response = await fetch("/api/admin/create_user", {
				method: "POST",
				body,
				credentials: "include",
			});

			const data: CreateResponse = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(
					data?.message || "Unable to create the account. Please try again.",
				);
			}

			setSuccess(data?.message || "Customer account created successfully.");

			resetForm();
		} catch (error) {
			setServerError(
				error instanceof Error
					? error.message
					: "Unable to create the account. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	/* =========================================================
	   INPUT WRAPPER CLASS
	========================================================= */

	const inputWrapper = (hasError: boolean) =>
		`flex items-center rounded-xl border bg-white px-3.5 transition focus-within:border-[#85161B] focus-within:ring-2 focus-within:ring-[#85161B]/10 ${
			hasError ? "border-red-400" : "border-[#E8DED7]"
		}`;

	return (
		<main className="min-h-screen bg-[#FBF9F7] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
			<div className="mx-auto max-w-2xl">
				<Link
					href="/admin/customers"
					className="inline-flex items-center gap-2 text-sm font-medium text-[#2E2E2E]/55 hover:text-[#85161B]"
				>
					<ArrowLeft size={16} />
					All customers
				</Link>

				<div className="mt-6 border-b border-[#E8DED7] pb-6">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]">
						Customers
					</p>

					<h1 className="mt-1 text-3xl font-bold text-[#2E2E2E]">
						Create customer account
					</h1>

					<p className="mt-1 text-sm text-[#2E2E2E]/50">
						The account is created immediately — no OTP verification is needed.
					</p>
				</div>

				{serverError && (
					<div
						role="alert"
						className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
					>
						{serverError}
					</div>
				)}

				{success && (
					<div
						role="status"
						className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
					>
						<span>{success}</span>

						<Link
							href="/admin/customers"
							className="font-semibold underline-offset-2 hover:underline"
						>
							View all customers
						</Link>
					</div>
				)}

				<form
					onSubmit={handleSubmit}
					noValidate
					className="mt-6 space-y-4 rounded-2xl border border-[#E8DED7] bg-white p-5 sm:p-6"
				>
					{/* NAME */}

					<div>
						<label
							htmlFor="name"
							className="mb-2 block text-sm font-medium text-[#2E2E2E]"
						>
							Full name
						</label>

						<div className={inputWrapper(!!(touched.name && errors.name))}>
							<User size={18} className="mr-3 shrink-0 text-[#2E2E2E]/35" />

							<input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onBlur={() => {
									setTouched((p) => ({ ...p, name: true }));
									setErrors((p) => ({ ...p, name: validateName(name) }));
								}}
								disabled={loading}
								autoComplete="off"
								placeholder="Customer name"
								className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
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

						<div className={inputWrapper(!!(touched.email && errors.email))}>
							<Mail size={18} className="mr-3 shrink-0 text-[#2E2E2E]/35" />

							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onBlur={() => {
									setTouched((p) => ({ ...p, email: true }));
									setErrors((p) => ({ ...p, email: validateEmail(email) }));
								}}
								disabled={loading}
								autoComplete="off"
								placeholder="customer@example.com"
								className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
							/>
						</div>

						{touched.email && errors.email && (
							<p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
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

						<div className={inputWrapper(!!(touched.phone && errors.phone))}>
							<Phone size={18} className="mr-3 shrink-0 text-[#2E2E2E]/35" />

							<input
								id="phone"
								type="tel"
								value={phone}
								onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
								onBlur={() => {
									setTouched((p) => ({ ...p, phone: true }));
									setErrors((p) => ({ ...p, phone: validatePhone(phone) }));
								}}
								maxLength={10}
								disabled={loading}
								autoComplete="off"
								placeholder="10-digit phone number"
								className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
							/>
						</div>

						{touched.phone && errors.phone && (
							<p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>
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
							className={inputWrapper(!!(touched.password && errors.password))}
						>
							<Lock size={18} className="mr-3 shrink-0 text-[#2E2E2E]/35" />

							<input
								id="password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onBlur={() => {
									setTouched((p) => ({ ...p, password: true }));
									setErrors((p) => ({
										...p,
										password: validatePassword(password),
									}));
								}}
								disabled={loading}
								autoComplete="new-password"
								placeholder="Create a password"
								className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
							/>

							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								aria-label={showPassword ? "Hide password" : "Show password"}
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
							<Lock size={18} className="mr-3 shrink-0 text-[#2E2E2E]/35" />

							<input
								id="confirmPassword"
								type={showPassword ? "text" : "password"}
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								onBlur={() => {
									setTouched((p) => ({ ...p, confirmPassword: true }));
									setErrors((p) => ({
										...p,
										confirmPassword: validateConfirmPassword(confirmPassword),
									}));
								}}
								disabled={loading}
								autoComplete="new-password"
								placeholder="Confirm the password"
								className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#2E2E2E] outline-none placeholder:text-[#2E2E2E]/30"
							/>
						</div>

						{touched.confirmPassword && errors.confirmPassword && (
							<p className="mt-1.5 text-xs text-red-600">
								{errors.confirmPassword}
							</p>
						)}
					</div>

					{/* RESELLER + CREDIT */}

					<div className="grid gap-4 sm:grid-cols-2">
						<label className="block text-sm font-medium text-[#2E2E2E]">
							Reseller
							<select
								value={reseller}
								onChange={(e) => setReseller(e.target.value as "yes" | "no")}
								disabled={loading}
								className="mt-2 w-full rounded-xl border border-[#E8DED7] bg-white px-3 py-3 text-sm outline-none focus:border-[#85161B]"
							>
								<option value="no">No</option>
								<option value="yes">Yes</option>
							</select>
						</label>

						<label className="block text-sm font-medium text-[#2E2E2E]">
							Credit eligibility
							<select
								value={credit}
								onChange={(e) =>
									setCredit(e.target.value as "eligible" | "not_eligible")
								}
								disabled={loading}
								className="mt-2 w-full rounded-xl border border-[#E8DED7] bg-white px-3 py-3 text-sm outline-none focus:border-[#85161B]"
							>
								<option value="not_eligible">Not eligible</option>
								<option value="eligible">Eligible</option>
							</select>
						</label>
					</div>

					{/* SUBMIT */}

					<button
						type="submit"
						disabled={loading}
						className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#721318] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading ? (
							<>
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								Creating account...
							</>
						) : (
							<>
								Create account
								<ArrowRight
									size={17}
									className="transition-transform group-hover:translate-x-1"
								/>
							</>
						)}
					</button>
				</form>
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
