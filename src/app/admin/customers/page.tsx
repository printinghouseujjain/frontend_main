"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
	ArrowLeft,
	Search,
	Users,
	Mail,
	Phone,
	Store,
	LogOut,
	RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ============================================================================
   TYPES
============================================================================ */

type Customer = {
	id?: number | string;
	user_id?: number | string;
	name: string;
	email: string;
	phone: string;
	is_reseller: string;
	credit_eligibility: string;
};

type UsersResponse = {
	status: number;
	message: string;
	users: Customer[];
};

/* ============================================================================
   PAGE
============================================================================ */

export default function AdminCustomersPage() {
	const router = useRouter();

	const [query, setQuery] = useState("");
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [loggingOut, setLoggingOut] = useState(false);

	/* ==========================================================================
	   FETCH USERS
	========================================================================== */

	const fetchUsers = async () => {
		try {
			setLoading(true);
			setError("");

			const response = await fetch("/api/admin/users", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data: UsersResponse = await response.json().catch(() => ({
				status: 500,
				message: "Invalid server response.",
				users: [],
			}));

			if (!response.ok || data.status !== 200) {
				throw new Error(data.message || "Unable to fetch customers.");
			}

			setCustomers(Array.isArray(data.users) ? data.users : []);
		} catch (err) {
			console.error("Failed to fetch users:", err);

			setError(
				err instanceof Error ? err.message : "Unable to load customers.",
			);

			setCustomers([]);
		} finally {
			setLoading(false);
		}
	};

	/* ==========================================================================
	   INITIAL FETCH
	========================================================================== */

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchUsers();
	}, []);

	/* ==========================================================================
	   LOGOUT
	========================================================================== */

	const handleLogout = async () => {
		if (loggingOut) return;

		setLoggingOut(true);

		try {
			const response = await fetch("/api/admin/logout?command_type=admin", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));

				throw new Error(
					(data as { message?: string })?.message || "Unable to logout.",
				);
			}

			router.replace("/login");
		} catch (error) {
			console.error("Admin logout failed:", error);

			alert(
				error instanceof Error
					? error.message
					: "Unable to logout. Please try again.",
			);

			setLoggingOut(false);
		}
	};

	/* ==========================================================================
	   FILTER USERS
	========================================================================== */

	const filteredCustomers = useMemo(() => {
		const search = query.trim().toLowerCase();

		if (!search) {
			return customers;
		}

		return customers.filter(
			(customer) =>
				customer.name.toLowerCase().includes(search) ||
				customer.email.toLowerCase().includes(search) ||
				customer.phone.toLowerCase().includes(search),
		);
	}, [query, customers]);

	/* ==========================================================================
	   HELPERS
	========================================================================== */

	const getInitials = (name: string) => {
		return name
			.trim()
			.split(/\s+/)
			.map((part) => part[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	};

	const formatValue = (value: string) => {
		if (!value) return "—";

		return value
			.replace(/_/g, " ")
			.replace(/\b\w/g, (char) => char.toUpperCase());
	};

	/* ==========================================================================
	   UI
	========================================================================== */

	return (
		<main className="min-h-screen bg-[#FBF9F7]">
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');

				.font-display {
					font-family: 'Fraunces', Georgia, serif;
				}
			`}</style>

			{/* ================================================================
			    HEADER
			================================================================ */}

			<header
				className="
					sticky
					top-0
					z-30
					h-19
					border-b
					border-[#E8DED7]
					bg-[#FBF9F7]/95
					backdrop-blur-md
				"
			>
				<div
					className="
						flex
						h-full
						items-center
						justify-between
						px-5
						sm:px-6
						lg:px-8
					"
				>
					{/* BRAND */}

					<Link href="/admin" className="group flex items-center gap-3">
						<div
							className="
								flex
								h-10
								w-10
								items-center
								justify-center
								rounded-xl
								text-white
								shadow-sm
								transition
								group-hover:scale-[1.02]
							"
						>
							<img
								src="https://api.printinghouseujjain.in/assets/logo.png"
								alt="Printing House"
								className="
									h-10
									w-10
									shrink-0
									object-contain
								"
							/>
						</div>

						<div className="hidden sm:block">
							<p
								className="
									text-[10px]
									font-bold
									uppercase
									tracking-[0.22em]
									text-[#85161B]
								"
							>
								Printing House
							</p>

							<p
								className="
									mt-0.5
									text-sm
									font-semibold
									text-[#2E2E2E]
								"
							>
								Admin Dashboard
							</p>
						</div>
					</Link>

					{/* RIGHT NAV */}

					<div className="flex items-center gap-2 sm:gap-3">
						{/* STOREFRONT */}

						<Link
							href="/"
							className="
								hidden
								items-center
								gap-2
								rounded-xl
								border
								border-[#E8DED7]
								bg-white
								px-4
								py-2.5
								text-sm
								font-medium
								text-[#2E2E2E]
								transition
								hover:border-[#85161B]/30
								hover:text-[#85161B]
								sm:flex
							"
						>
							<Store size={16} strokeWidth={1.8} />

							<span>Storefront</span>
						</Link>

						{/* ADMIN PROFILE */}

						<div
							className="
								flex
								items-center
								gap-2.5
								rounded-xl
								border
								border-[#E8DED7]
								bg-white
								px-2.5
								py-2
							"
						>
							<div
								className="
									flex
									h-8
									w-8
									items-center
									justify-center
									rounded-full
									bg-[#85161B]
									text-xs
									font-semibold
									text-white
								"
							>
								A
							</div>

							<div className="hidden text-left md:block">
								<p className="text-xs font-semibold text-[#2E2E2E]">Admin</p>

								<p className="text-[10px] text-[#2E2E2E]/45">Administrator</p>
							</div>
						</div>

						{/* LOGOUT */}

						<button
							type="button"
							onClick={handleLogout}
							disabled={loggingOut}
							className="
								inline-flex
								items-center
								gap-2
								rounded-xl
								border
								border-[#85161B]/20
								bg-white
								px-3.5
								py-2.5
								text-sm
								font-medium
								text-[#85161B]
								transition
								hover:border-[#85161B]
								hover:bg-[#85161B]
								hover:text-white
								disabled:cursor-not-allowed
								disabled:opacity-60
								sm:px-4
							"
						>
							{loggingOut ? (
								<span
									className="
										h-4
										w-4
										animate-spin
										rounded-full
										border-2
										border-[#85161B]/25
										border-t-[#85161B]
									"
								/>
							) : (
								<LogOut size={16} strokeWidth={1.9} />
							)}

							<span className="hidden sm:inline">
								{loggingOut ? "Logging out..." : "Logout"}
							</span>
						</button>
					</div>
				</div>
			</header>

			{/* ================================================================
			    CONTENT
			================================================================ */}

			<div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
				{/* BACK */}

				<Link
					href="/admin"
					className="
						inline-flex
						items-center
						gap-2
						text-sm
						font-medium
						text-[#2E2E2E]/55
						transition-colors
						hover:text-[#85161B]
					"
				>
					<ArrowLeft size={16} />
					Back to dashboard
				</Link>

				{/* TITLE */}

				<div
					className="
						mt-6
						flex
						flex-col
						gap-4
						sm:flex-row
						sm:items-end
						sm:justify-between
					"
				>
					<div>
						<p
							className="
								text-xs
								font-semibold
								uppercase
								tracking-[0.18em]
								text-[#85161B]
							"
						>
							Customers
						</p>

						<h1
							className="
								font-display
								mt-1
								text-3xl
								font-bold
								text-[#2E2E2E]
								sm:text-4xl
							"
						>
							All Customers
						</h1>

						<p className="mt-2 text-sm text-[#2E2E2E]/55">
							{loading
								? "Loading customers..."
								: `${filteredCustomers.length} of ${customers.length} customers`}
						</p>
					</div>

					{/* REFRESH */}

					<button
						type="button"
						onClick={fetchUsers}
						disabled={loading}
						className="
							inline-flex
							w-fit
							items-center
							gap-2
							rounded-xl
							border
							border-[#E8DED7]
							bg-white
							px-4
							py-2.5
							text-sm
							font-medium
							text-[#2E2E2E]
							transition
							hover:border-[#85161B]/30
							hover:text-[#85161B]
							disabled:cursor-not-allowed
							disabled:opacity-50
						"
					>
						<RefreshCw size={15} className={loading ? "animate-spin" : ""} />
						Refresh
					</button>
				</div>

				{/* SEARCH */}

				<div className="relative mt-6 max-w-xs">
					<Search
						size={16}
						className="
							pointer-events-none
							absolute
							left-3.5
							top-1/2
							-translate-y-1/2
							text-[#2E2E2E]/35
						"
					/>

					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search name, email or phone..."
						className="
							w-full
							rounded-xl
							border
							border-[#E8DED7]
							bg-white
							py-2.5
							pl-10
							pr-4
							text-sm
							text-[#2E2E2E]
							outline-none
							transition
							placeholder:text-[#2E2E2E]/35
							focus:border-[#85161B]/40
							focus:ring-2
							focus:ring-[#85161B]/10
						"
					/>
				</div>

				{/* ============================================================
				    ERROR
				============================================================ */}

				{error && (
					<div
						className="
							mt-6
							rounded-xl
							border
							border-red-200
							bg-red-50
							px-4
							py-3
							text-sm
							text-red-700
						"
					>
						<div className="flex items-center justify-between gap-4">
							<span>{error}</span>

							<button
								type="button"
								onClick={fetchUsers}
								className="font-semibold underline"
							>
								Try again
							</button>
						</div>
					</div>
				)}

				{/* ============================================================
				    TABLE
				============================================================ */}

				<div
					className="
						mt-6
						overflow-hidden
						rounded-2xl
						border
						border-[#E9DED7]
						bg-white
					"
				>
					{loading ? (
						/* LOADING */

						<div className="px-6 py-20 text-center">
							<div
								className="
									mx-auto
									h-8
									w-8
									animate-spin
									rounded-full
									border-2
									border-[#85161B]/20
									border-t-[#85161B]
								"
							/>

							<p className="mt-4 text-sm text-[#2E2E2E]/50">
								Loading customers...
							</p>
						</div>
					) : filteredCustomers.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="w-full min-w-212.5 text-left text-sm">
								<thead>
									<tr
										className="
											border-b
											border-[#EEE6E1]
											text-xs
											text-[#2E2E2E]/40
										"
									>
										<th className="px-6 py-3.5 font-medium">Customer</th>

										<th className="px-6 py-3.5 font-medium">Contact</th>

										<th className="px-6 py-3.5 font-medium">Reseller</th>

										<th className="px-6 py-3.5 font-medium">
											Credit Eligibility
										</th>
									</tr>
								</thead>

								<tbody className="divide-y divide-[#EEE6E1]">
									{filteredCustomers.map((customer, index) => (
										<tr
											key={`${customer.email}-${index}`}
											className="
													transition-colors
													hover:bg-[#FBF9F7]
												"
										>
											{/* CUSTOMER */}

											<td className="px-6 py-4">
													<Link href={`/admin/customers/${customer.id ?? customer.user_id ?? encodeURIComponent(customer.email)}`} className="block rounded-lg outline-none focus:ring-2 focus:ring-[#85161B]/20">
												<div className="flex items-center gap-3">
													<div
														className="
																flex
																h-9
																w-9
																shrink-0
																items-center
																justify-center
																rounded-full
																bg-[#F7D6BF]/50
																text-xs
																font-bold
																text-[#85161B]
															"
													>
														{getInitials(customer.name)}
													</div>

													<span className="font-medium text-[#2E2E2E]">
														{customer.name}
													</span>
												</div>
													</Link>
											</td>

											{/* CONTACT */}

											<td className="px-6 py-4">
												<p
													className="
															flex
															items-center
															gap-1.5
															text-xs
															text-[#2E2E2E]/55
														"
												>
													<Mail size={12} />

													{customer.email}
												</p>

												<p
													className="
															mt-1
															flex
															items-center
															gap-1.5
															text-xs
															text-[#2E2E2E]/45
														"
												>
													<Phone size={12} />

													{customer.phone}
												</p>
											</td>

											{/* RESELLER */}

											<td className="px-6 py-4">
												<span
													className={`
															inline-flex
															rounded-full
															px-2.5
															py-1
															text-xs
															font-semibold
															${
																customer.is_reseller === "yes"
																	? "bg-green-100 text-green-700"
																	: "bg-gray-100 text-gray-600"
															}
														`}
												>
													{customer.is_reseller === "yes" ? "Yes" : "No"}
												</span>
											</td>

											{/* CREDIT */}

											<td className="px-6 py-4">
												<span
													className={`
															inline-flex
															rounded-full
															px-2.5
															py-1
															text-xs
															font-semibold
															${
																customer.credit_eligibility === "eligible"
																	? "bg-green-100 text-green-700"
																	: "bg-gray-100 text-gray-600"
															}
														`}
												>
													{formatValue(customer.credit_eligibility)}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						/* EMPTY */

						<div className="px-6 py-16 text-center">
							<div
								className="
									mx-auto
									flex
									h-14
									w-14
									items-center
									justify-center
									rounded-full
									bg-[#F7D6BF]/40
								"
							>
								<Users size={22} className="text-[#85161B]" />
							</div>

							<p className="mt-4 text-sm font-semibold text-[#2E2E2E]">
								{query
									? "No customers match your search"
									: "No customers found"}
							</p>

							{query && (
								<button
									type="button"
									onClick={() => setQuery("")}
									className="
										mt-2
										text-xs
										font-medium
										text-[#85161B]
										underline
									"
								>
									Clear search
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
