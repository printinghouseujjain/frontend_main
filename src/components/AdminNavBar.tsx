
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	LayoutDashboard,
	ShoppingBag,
	Package,
	Users,
	Menu,
	X,
	Store,
	Tag,
	SlidersHorizontal,
	Zap,
	Boxes,
} from "lucide-react";

const NAV_ITEMS = [
	{
		label: "Dashboard",
		href: "/admin",
		icon: LayoutDashboard,
	},
	{
		label: "Orders",
		href: "/admin/orders",
		icon: ShoppingBag,
	},
	{
		label: "Products",
		href: "/admin/products",
		icon: Package,
	},
	{
		label: "Categories",
		href: "/admin/categories",
		icon: Tag,
	},
	{
		label:"Inventory",
		href: "/admin/inventory",
		icon: Package,
	},
	{
		label: "Occasions",
		href: "/admin/occasions",
		icon: Zap,
	},
	{
		label: "Customers",
		href: "/admin/customers",
		icon: Users,
	},
	{
		label: "Resellers",
		href: "/admin/resellers",
		icon: Boxes,
	},
	{
		href: "/admin/store-customisation",
		label: "Store Customisation",
		icon: SlidersHorizontal,
	},
];

export default function AdminNavbar() {
	const pathname = usePathname();
	const [mobileOpen, setMobileOpen] = useState(false);

	const isActive = (href: string) => {
		if (href === "/admin") {
			return pathname === "/admin";
		}

		return pathname.startsWith(href);
	};

	return (
		<>
			{/* =====================================================
			    DESKTOP SIDEBAR
			===================================================== */}

			<aside
				className="
					fixed
					inset-y-0
					left-0
					z-50
					hidden
					w-64
					border-r
					border-[#E8DED7]
					bg-white
					lg:flex
					lg:flex-col
				"
			>
				{/* BRAND */}

				<div className="flex h-20 items-center border-b border-[#E8DED7] px-6">
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#85161B]">
							Printing House
						</p>

						<h1 className="mt-1 text-lg font-bold text-[#2E2E2E]">
							Admin Panel
						</h1>
					</div>
				</div>

				{/* NAVIGATION */}

				<nav className="flex-1 space-y-1 overflow-y-auto p-4">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const active = isActive(item.href);

						return (
							<Link
								key={item.href}
								href={item.href}
								className={`
									flex
									items-center
									gap-3
									rounded-xl
									px-4
									py-3
									text-sm
									font-medium
									transition-all
									duration-200
									${
										active
											? "bg-[#85161B] text-white shadow-sm"
											: "text-[#2E2E2E]/60 hover:bg-[#FBF9F7] hover:text-[#85161B]"
									}
								`}
							>
								<Icon size={18} strokeWidth={2} />

								<span>{item.label}</span>
							</Link>
						);
					})}
				</nav>

				{/* BACK TO STORE */}

				<div className="border-t border-[#E8DED7] p-4">
					<Link
						href="/"
						className="
							flex
							items-center
							gap-3
							rounded-xl
							px-4
							py-3
							text-sm
							font-medium
							text-[#2E2E2E]/55
							transition-all
							duration-200
							hover:bg-[#FBF9F7]
							hover:text-[#85161B]
						"
					>
						<Store size={18} />

						<span>Back to Store</span>
					</Link>
				</div>
			</aside>

			{/* =====================================================
			    MOBILE HEADER
			===================================================== */}

			<header
				className="
					sticky
					top-0
					z-50
					border-b
					border-[#E8DED7]
					bg-white
					lg:hidden
				"
			>
				<div className="flex h-16 items-center justify-between px-4">
					{/* BRAND */}

					<div>
						<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#85161B]">
							Printing House
						</p>

						<p className="text-sm font-bold text-[#2E2E2E]">
							Admin Panel
						</p>
					</div>

					{/* MENU BUTTON */}

					<button
						type="button"
						onClick={() => setMobileOpen((open) => !open)}
						aria-label="Toggle admin navigation"
						aria-expanded={mobileOpen}
						className="
							flex
							h-10
							w-10
							items-center
							justify-center
							rounded-xl
							border
							border-[#E8DED7]
							bg-white
							text-[#2E2E2E]
							transition-all
							duration-200
							hover:border-[#85161B]/30
							hover:text-[#85161B]
							active:scale-95
						"
					>
						{mobileOpen ? <X size={20} /> : <Menu size={20} />}
					</button>
				</div>

				{/* =================================================
				    MOBILE MENU
				================================================= */}

				{mobileOpen && (
					<div className="border-t border-[#E8DED7] bg-white px-4 py-3">
						<nav className="max-h-[calc(100vh-4rem)] space-y-1 overflow-y-auto">
							{NAV_ITEMS.map((item) => {
								const Icon = item.icon;
								const active = isActive(item.href);

								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setMobileOpen(false)}
										className={`
											flex
											items-center
											gap-3
											rounded-xl
											px-4
											py-3
											text-sm
											font-medium
											transition-all
											${
												active
													? "bg-[#85161B] text-white"
													: "text-[#2E2E2E]/60 hover:bg-[#FBF9F7] hover:text-[#85161B]"
											}
										`}
									>
										<Icon size={18} strokeWidth={2} />

										<span>{item.label}</span>
									</Link>
								);
							})}

							{/* BACK TO STORE */}

							<Link
								href="/"
								onClick={() => setMobileOpen(false)}
								className="
									mt-2
									flex
									items-center
									gap-3
									rounded-xl
									px-4
									py-3
									text-sm
									font-medium
									text-[#2E2E2E]/55
									transition
									hover:bg-[#FBF9F7]
									hover:text-[#85161B]
								"
							>
								<Store size={18} />

								<span>Back to Store</span>
							</Link>
						</nav>
					</div>
				)}
			</header>
		</>
	);
}
