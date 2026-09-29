"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, LogOut } from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

type AdminInfo = {
	name: string;
};

/* ============================================================================
   HELPERS
============================================================================ */

function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

/* ============================================================================
   ADMIN NAVBAR
============================================================================ */

export default function AdminHeader() {
	const router = useRouter();

	const [adminInfo, setAdminInfo] = useState<AdminInfo>({
		name: "Admin",
	});

	const [adminLoading, setAdminLoading] = useState(true);
	const [loggingOut, setLoggingOut] = useState(false);

	/* =====================================================
	   FETCH ADMIN INFO
	===================================================== */

	useEffect(() => {
		const fetchAdminInfo = async () => {
			setAdminLoading(true);

			try {
				const response = await fetch("/api/auth/init", {
					method: "GET",
					credentials: "include",
					cache: "no-store",
				});

				const data = await response.json().catch(() => ({}));

				console.log("ADMIN INIT RESPONSE:", data);

				if (!response.ok) {
					throw new Error("Unable to load admin information.");
				}

				if (data?.login_status === true && data?.type === "admin") {
					setAdminInfo({
						name:
							typeof data?.name === "string" && data.name.trim()
								? data.name.trim()
								: "Admin",
					});
				}
			} catch (error) {
				console.error("Fetch admin info failed:", error);
			} finally {
				setAdminLoading(false);
			}
		};

		fetchAdminInfo();
	}, []);

	/* =====================================================
	   LOGOUT
	===================================================== */

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

	/* =====================================================
	   RENDER
	===================================================== */

	return (
		<header
			className="
				sticky
				top-0
				z-30
				h-[76px]
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
				{/* =====================================================
				    BRAND
				===================================================== */}

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

				{/* =====================================================
				    RIGHT NAV
				===================================================== */}

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
							{adminLoading ? "..." : getInitials(adminInfo.name) || "A"}
						</div>

						<div className="hidden text-left md:block">
							<p className="text-xs font-semibold text-[#2E2E2E]">
								{adminLoading ? "Loading..." : adminInfo.name}
							</p>

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
	);
}
