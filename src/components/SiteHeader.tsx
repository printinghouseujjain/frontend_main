"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
	ShoppingCart,
	Search,
	User,
	Heart,
	Menu,
	X,
	ClipboardList,
	ArrowRight,
	House,
	Store,
} from "lucide-react";

/* ============================================================================
   CART COUNT
============================================================================ */

/*
 * ASSUMPTION: /api/cart_count returns the count under one of these keys.
 * The exact response shape wasn't specified, so this checks several
 * likely names. Adjust the list below if the real field name differs.
 */
type CartCountResponse = {
	status?: number;
	message?: string;
	count?: number | string;
	cart_count?: number | string;
	products_count?: number | string;
	total?: number | string;
};

function extractCartCount(data: CartCountResponse): number {
	const raw =
		data.count ?? data.cart_count ?? data.products_count ?? data.total ?? 0;

	const number = Number(raw);

	return Number.isFinite(number) && number >= 0 ? number : 0;
}

export default function SiteHeader() {
	const [mobileOpen, setMobileOpen] = React.useState(false);
	const [searchOpen, setSearchOpen] = React.useState(false);
	const [searchValue, setSearchValue] = React.useState("");

	const [cartCount, setCartCount] = useState(0);

	/* ==========================================================================
	   FETCH CART COUNT
	========================================================================== */

	useEffect(() => {
		const fetchCartCount = async () => {
			try {
				/*
				 * No body needed — the backend identifies the cart
				 * purely from the forwarded cookie.
				 */
				const response = await fetch("/api/cart_count", {
					method: "GET",
					credentials: "include",
					cache: "no-store",
				});

				const data: CartCountResponse = await response
					.json()
					.catch(() => ({}));

				console.log("CART COUNT RESPONSE:", data);

				if (!response.ok) {
					return;
				}

				setCartCount(extractCartCount(data));
			} catch (error) {
				console.error("Fetch cart count failed:", error);
			}
		};

		fetchCartCount();
	}, []);

	const closeMobileMenu = () => {
		setMobileOpen(false);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();

		const value = searchValue.trim();

		if (!value) return;

		window.location.href = `/shop?search=${encodeURIComponent(value)}`;
	};

	return (
		<>
			{/* =========================================================
			    FIXED NAVBAR
			========================================================= */}

			<header
				className="
					fixed
					left-0
					right-0
					top-0
					z-[100]
					w-full
					border-b
					border-[#e9dfd8]
					bg-[#fffaf7]
				"
			>
				<div
					className="
						mx-auto
						flex
						h-16
						w-full
						max-w-7xl
						items-center
						gap-2
						px-3
						sm:h-[72px]
						sm:gap-4
						sm:px-6
						lg:px-8
					"
				>
					{/* =================================================
					    BRAND
					================================================= */}

					<Link
						href="/"
						onClick={closeMobileMenu}
						className="
							flex
							min-w-0
							shrink-0
							items-center
							gap-2
							transition-opacity
							hover:opacity-80
							sm:gap-2.5
						"
					>
						<img
							src="https://api.printinghouseujjain.in/assets/logo.png"
							alt="Printing House"
							className="
								h-9
								w-9
								shrink-0
								object-contain
								sm:h-10
								sm:w-10
							"
						/>

						<div className="min-w-0">
							<div
								className="
									whitespace-nowrap
									text-[15px]
									font-bold
									leading-none
									tracking-tight
									text-[#171717]
									sm:text-lg
								"
							>
								Printing House
							</div>

							<div
								className="
									mt-1
									whitespace-nowrap
									text-[7px]
									font-medium
									uppercase
									tracking-[0.12em]
									text-[#8c817b]
									sm:text-[9px]
									sm:tracking-[0.16em]
								"
							>
								You Think... We Create...
							</div>
						</div>
					</Link>

					{/* =================================================
					    DESKTOP NAV
					    HOME + SHOP ONLY
					================================================= */}

					<nav
						className="
							ml-5
							hidden
							items-center
							gap-1
							md:flex
							lg:ml-16
						"
					>
						<Link
							href="/"
							className="
								rounded-lg
								px-3.5
								py-2
								text-sm
								font-medium
								text-[#625b57]
								transition
								hover:bg-[#f5eee9]
								hover:text-[#85161b]
							"
						>
							Home
						</Link>

						<Link
							href="/shop"
							className="
								rounded-lg
								px-3.5
								py-2
								text-sm
								font-medium
								text-[#625b57]
								transition
								hover:bg-[#f5eee9]
								hover:text-[#85161b]
							"
						>
							Shop
						</Link>
					</nav>

					{/* =================================================
					    RIGHT SIDE
					================================================= */}

					<div
						className="
							ml-auto
							flex
							shrink-0
							items-center
							gap-1
							sm:gap-2
						"
					>
						{/* =================================================
						    SEARCH
						================================================= */}

						<AnimatePresence mode="wait">
							{searchOpen ? (
								<motion.form
									key="search-form"
									initial={{
										width: 40,
										opacity: 0,
									}}
									animate={{
										width: 250,
										opacity: 1,
									}}
									exit={{
										width: 40,
										opacity: 0,
									}}
									transition={{
										duration: 0.2,
									}}
									onSubmit={handleSearch}
									className="
										flex
										h-10
										overflow-hidden
										rounded-xl
										border
										border-[#e5dbd5]
										bg-white
										focus-within:border-[#85161b]
									"
								>
									<button
										type="submit"
										aria-label="Search"
										className="
											flex
											h-10
											w-10
											shrink-0
											items-center
											justify-center
											text-[#625b57]
											hover:text-[#85161b]
										"
									>
										<Search size={20} strokeWidth={1.8} />
									</button>

									<input
										autoFocus
										type="search"
										value={searchValue}
										onChange={(e) => setSearchValue(e.target.value)}
										placeholder="Search products..."
										className="
											min-w-0
											flex-1
											bg-white
											text-sm
											text-[#171717]
											outline-none
											placeholder:text-[#aaa19b]
										"
									/>

									<button
										type="button"
										onClick={() => {
											setSearchOpen(false);
											setSearchValue("");
										}}
										aria-label="Close search"
										className="
											mr-1
											flex
											h-8
											w-8
											items-center
											justify-center
											rounded-lg
											text-[#8b817c]
											hover:bg-[#f5eee9]
										"
									>
										<X size={17} strokeWidth={1.8} />
									</button>
								</motion.form>
							) : (
								<button
									type="button"
									aria-label="Search"
									onClick={() => setSearchOpen(true)}
									className="
										flex
										h-10
										w-10
										items-center
										justify-center
										rounded-xl
										text-[#625b57]
										transition
										hover:bg-[#f5eee9]
										hover:text-[#85161b]
									"
								>
									<Search size={21} strokeWidth={1.8} />
								</button>
							)}
						</AnimatePresence>

						{/* =================================================
						    WISHLIST
						================================================= */}

						<Link
							href="/wishlist"
							aria-label="Wishlist"
							className="
								hidden
								h-10
								w-10
								items-center
								justify-center
								rounded-xl
								text-[#625b57]
								transition
								hover:bg-[#f5eee9]
								hover:text-[#85161b]
								sm:flex
							"
						>
							<Heart size={21} strokeWidth={1.8} />
						</Link>

						{/* =================================================
						    PROFILE
						================================================= */}

						<Link
							href="/profile"
							aria-label="Profile"
							className="
								hidden
								h-10
								w-10
								items-center
								justify-center
								rounded-xl
								text-[#625b57]
								transition
								hover:bg-[#f5eee9]
								hover:text-[#85161b]
								sm:flex
							"
						>
							<User size={21} strokeWidth={1.8} />
						</Link>

						{/* =================================================
						    ORDERS
						    ONE DESKTOP BUTTON
						================================================= */}

						<Link
							href="/orders"
							aria-label="Orders"
							className="
								hidden
								h-10
								items-center
								gap-2
								rounded-xl
								border
								border-[#e7ddd7]
								bg-white
								px-3
								text-sm
								font-medium
								text-[#292421]
								transition
								hover:border-[#85161b]/30
								hover:bg-[#fdf7f3]
								hover:text-[#85161b]
								md:flex
							"
						>
							<ClipboardList size={20} strokeWidth={1.8} />

							<span>Orders</span>
						</Link>

						{/* =================================================
						    CART
						================================================= */}

						<Link
							href="/cart"
							aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
							className="
								flex
								h-10
								items-center
								gap-2
								rounded-xl
								border
								border-[#e7ddd7]
								bg-white
								px-2.5
								text-sm
								font-medium
								text-[#292421]
								transition
								hover:border-[#85161b]/30
								hover:bg-[#fdf7f3]
								hover:text-[#85161b]
								sm:px-3
							"
						>
							<span className="relative flex shrink-0 items-center justify-center">
								<ShoppingCart size={21} strokeWidth={1.8} />

								{cartCount > 0 && (
									<span
										className="
											absolute
											-right-1.5
											-top-1.5
											flex
											h-4
											min-w-4
											items-center
											justify-center
											rounded-full
											bg-[#85161b]
											px-1
											text-[9px]
											font-bold
											leading-none
											text-white
										"
									>
										{cartCount > 99 ? "99+" : cartCount}
									</span>
								)}
							</span>

							<span className="hidden sm:inline">Cart</span>
						</Link>

						{/* =================================================
						    WHATSAPP
						================================================= */}

						<a
							href="https://wa.me/918827882713?text=Hi"
							target="_blank"
							rel="noopener noreferrer"
							className="
								hidden
								h-10
								items-center
								gap-2
								rounded-xl
								bg-[#20c763]
								px-4
								text-sm
								font-semibold
								text-white
								transition
								hover:bg-[#19b956]
								lg:flex
							"
						>
							<span className="text-sm">💬</span>
							WhatsApp
						</a>

						{/* =================================================
						    MOBILE MENU BUTTON
						================================================= */}

						<button
							type="button"
							aria-label={mobileOpen ? "Close menu" : "Open menu"}
							aria-expanded={mobileOpen}
							onClick={() => setMobileOpen((value) => !value)}
							className="
								flex
								h-10
								w-10
								items-center
								justify-center
								rounded-xl
								text-[#625b57]
								transition
								hover:bg-[#f5eee9]
								hover:text-[#85161b]
								md:hidden
							"
						>
							{mobileOpen ? (
								<X size={23} strokeWidth={1.8} />
							) : (
								<Menu size={23} strokeWidth={1.8} />
							)}
						</button>
					</div>
				</div>
			</header>

			{/* =========================================================
			    MOBILE MENU
			========================================================= */}

			<AnimatePresence>
				{mobileOpen && (
					<>
						{/* BACKDROP */}

						<motion.div
							initial={{
								opacity: 0,
							}}
							animate={{
								opacity: 1,
							}}
							exit={{
								opacity: 0,
							}}
							transition={{
								duration: 0.2,
							}}
							className="
								fixed
								inset-0
								z-[110]
								bg-black/40
								md:hidden
							"
							onClick={closeMobileMenu}
						/>

						{/* DRAWER */}

						<motion.aside
							initial={{
								x: "100%",
							}}
							animate={{
								x: 0,
							}}
							exit={{
								x: "100%",
							}}
							transition={{
								type: "spring",
								stiffness: 350,
								damping: 35,
							}}
							className="
								fixed
								right-0
								top-0
								z-[120]
								flex
								h-full
								w-[88%]
								max-w-[420px]
								flex-col
								overflow-hidden
								border-l
								border-[#e7ddd7]
								bg-[#fffaf7]
								shadow-2xl
								md:hidden
							"
						>
							{/* =================================================
							    DRAWER HEADER
							================================================= */}

							<div
								className="
									flex
									h-[76px]
									shrink-0
									items-center
									justify-between
									border-b
									border-[#e7ddd7]
									bg-[#fffaf7]
									px-5
								"
							>
								<Link
									href="/"
									onClick={closeMobileMenu}
									className="
										flex
										items-center
										gap-2.5
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

									<div>
										<div
											className="
												whitespace-nowrap
												text-[17px]
												font-bold
												leading-none
												tracking-tight
												text-[#171717]
											"
										>
											Printing House
										</div>

										<div
											className="
												mt-1
												whitespace-nowrap
												text-[8px]
												font-medium
												uppercase
												tracking-[0.15em]
												text-[#8c817b]
											"
										>
											You Think... We Create...
										</div>
									</div>
								</Link>

								<button
									type="button"
									onClick={closeMobileMenu}
									aria-label="Close menu"
									className="
										flex
										h-10
										w-10
										shrink-0
										items-center
										justify-center
										rounded-xl
										text-[#625b57]
										transition
										hover:bg-[#f5eee9]
										hover:text-[#85161b]
									"
								>
									<X size={25} strokeWidth={1.8} />
								</button>
							</div>

							{/* =================================================
							    DRAWER CONTENT
							================================================= */}

							<div
								className="
									flex-1
									overflow-y-auto
									px-5
									py-8
								"
							>
								{/* SEARCH */}

								<p
									className="
										mb-3
										px-1
										text-[11px]
										font-semibold
										uppercase
										tracking-[0.18em]
										text-[#948983]
									"
								>
									Search
								</p>

								<form
									onSubmit={handleSearch}
									className="
										flex
										h-[54px]
										items-center
										rounded-2xl
										border
										border-[#e5dbd5]
										bg-white
										px-4
										transition
										focus-within:border-[#85161b]
										focus-within:ring-2
										focus-within:ring-[#85161b]/10
									"
								>
									<Search
										size={21}
										strokeWidth={1.8}
										className="
											mr-3
											shrink-0
											text-[#948983]
										"
									/>

									<input
										type="search"
										value={searchValue}
										onChange={(e) => setSearchValue(e.target.value)}
										placeholder="Search products..."
										className="
											w-full
											bg-transparent
											text-[16px]
											text-[#171717]
											outline-none
											placeholder:text-[#aaa19b]
										"
									/>
								</form>

								{/* =================================================
								    MENU
								================================================= */}

								<div className="mt-10">
									<p
										className="
											mb-3
											px-1
											text-[11px]
											font-semibold
											uppercase
											tracking-[0.18em]
											text-[#948983]
										"
									>
										Menu
									</p>

									<nav className="space-y-1">
										{/* HOME */}

										<Link
											href="/"
											onClick={closeMobileMenu}
											className="
												flex
												min-h-[58px]
												items-center
												justify-between
												rounded-xl
												px-4
												text-[16px]
												font-medium
												text-[#171717]
												transition
												hover:bg-[#f5eee9]
												hover:text-[#85161b]
											"
										>
											<span className="flex items-center">
												<span
													className="
														flex
														h-10
														w-10
														shrink-0
														items-center
														justify-center
													"
												>
													<House size={20} strokeWidth={1.8} />
												</span>
												Home
											</span>

											<ArrowRight
												size={16}
												strokeWidth={1.6}
												className="text-[#b1a59e]"
											/>
										</Link>

										{/* SHOP */}

										<Link
											href="/shop"
											onClick={closeMobileMenu}
											className="
												flex
												min-h-[58px]
												items-center
												justify-between
												rounded-xl
												px-4
												text-[16px]
												font-medium
												text-[#171717]
												transition
												hover:bg-[#f5eee9]
												hover:text-[#85161b]
											"
										>
											<span className="flex items-center">
												<span
													className="
														flex
														h-10
														w-10
														shrink-0
														items-center
														justify-center
													"
												>
													<Store size={20} strokeWidth={1.8} />
												</span>
												Shop
											</span>

											<ArrowRight
												size={16}
												strokeWidth={1.6}
												className="text-[#b1a59e]"
											/>
										</Link>

										{/* ORDERS */}

										<Link
											href="/orders"
											onClick={closeMobileMenu}
											className="
												flex
												min-h-[58px]
												items-center
												justify-between
												rounded-xl
												px-4
												text-[16px]
												font-medium
												text-[#171717]
												transition
												hover:bg-[#f5eee9]
												hover:text-[#85161b]
											"
										>
											<span className="flex items-center">
												<span
													className="
														flex
														h-10
														w-10
														shrink-0
														items-center
														justify-center
													"
												>
													<ClipboardList size={20} strokeWidth={1.8} />
												</span>
												Orders
											</span>

											<ArrowRight
												size={16}
												strokeWidth={1.6}
												className="text-[#b1a59e]"
											/>
										</Link>
									</nav>
								</div>

								{/* =================================================
								    ACCOUNT
								================================================= */}

								<div className="mt-10">
									<p
										className="
											mb-3
											px-1
											text-[11px]
											font-semibold
											uppercase
											tracking-[0.18em]
											text-[#948983]
										"
									>
										Account
									</p>

									<div className="space-y-1">
										{/* ACCOUNT */}

										<Link
											href="/profile"
											onClick={closeMobileMenu}
											className="
												flex
												min-h-[58px]
												items-center
												rounded-xl
												px-4
												text-[16px]
												font-medium
												text-[#171717]
												transition
												hover:bg-[#f5eee9]
												hover:text-[#85161b]
											"
										>
											<span
												className="
													flex
													h-10
													w-10
													shrink-0
													items-center
													justify-center
												"
											>
												<User size={20} strokeWidth={1.8} />
											</span>
											Account
										</Link>

										{/* WISHLIST */}

										<Link
											href="/wishlist"
											onClick={closeMobileMenu}
											className="
												flex
												min-h-[58px]
												items-center
												rounded-xl
												px-4
												text-[16px]
												font-medium
												text-[#171717]
												transition
												hover:bg-[#f5eee9]
												hover:text-[#85161b]
											"
										>
											<span
												className="
													flex
													h-10
													w-10
													shrink-0
													items-center
													justify-center
												"
											>
												<Heart size={20} strokeWidth={1.8} />
											</span>
											Wishlist
										</Link>

										{/* CART */}

										<Link
											href="/cart"
											onClick={closeMobileMenu}
											className="
												flex
												min-h-[58px]
												items-center
												justify-between
												rounded-xl
												px-4
												text-[16px]
												font-medium
												text-[#171717]
												transition
												hover:bg-[#f5eee9]
												hover:text-[#85161b]
											"
										>
											<span className="flex items-center">
												<span
													className="
														relative
														flex
														h-10
														w-10
														shrink-0
														items-center
														justify-center
													"
												>
													<ShoppingCart size={20} strokeWidth={1.8} />

													{cartCount > 0 && (
														<span
															className="
																absolute
																right-0
																top-0
																flex
																h-4
																min-w-4
																items-center
																justify-center
																rounded-full
																bg-[#85161b]
																px-1
																text-[9px]
																font-bold
																leading-none
																text-white
															"
														>
															{cartCount > 99 ? "99+" : cartCount}
														</span>
													)}
												</span>
												Cart
											</span>

											{cartCount > 0 && (
												<span className="text-xs text-[#948983]">
													{cartCount} item{cartCount === 1 ? "" : "s"}
												</span>
											)}
										</Link>
									</div>
								</div>
							</div>

							{/* =================================================
							    WHATSAPP
							================================================= */}

							<div
								className="
									shrink-0
									border-t
									border-[#e7ddd7]
									bg-[#fffaf7]
									p-4
								"
							>
								<a
									href="https://wa.me/918827882713?text=Hi"
									target="_blank"
									rel="noopener noreferrer"
									className="
										flex
										h-[54px]
										w-full
										items-center
										justify-center
										gap-2
										rounded-2xl
										bg-[#20c763]
										text-[16px]
										font-semibold
										text-white
										transition
										hover:bg-[#19b956]
									"
								>
									<span>💬</span>

									<span>Chat with us on WhatsApp</span>
								</a>
							</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>
		</>
	);
}