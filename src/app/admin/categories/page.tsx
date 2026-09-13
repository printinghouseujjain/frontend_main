"use client";

import React, {
	useEffect,
	useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Tag,
	Plus,
	RefreshCw,
	AlertCircle,
	PenLine,
	Trash2,
	X,Store,LogOut,
	Image as ImageIcon,
} from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

type Category = {
	id: number;
	name: string;
	icon_path?: string;
};

type CategoryFormData = {
	mode: "new" | "edit";
	id?: number;
	name: string;
	Icon?: File;
};

/* ============================================================================
   CONSTANTS
============================================================================ */

const API_BASE_URL =
	"https://api.printinghouseujjain.in";

const CATEGORY_IMAGE_URL =
	`${API_BASE_URL}/assets/categories`;

/* ============================================================================
   PAGE
============================================================================ */

export default function CategoriesPage() {
	const router = useRouter();
	const [categories, setCategories] =
		useState<Category[]>([]);

	const [loading, setLoading] =
		useState(true);

	const [saving, setSaving] =
		useState(false);

	const [deletingId, setDeletingId] =
		useState<number | null>(null);

	const [error, setError] =
		useState<string | null>(null);

	const [showForm, setShowForm] =
		useState(false);

	const [editingId, setEditingId] =
		useState<number | null>(null);

	const [formData, setFormData] =
		useState<CategoryFormData>({
			mode: "new",
			name: "",
			Icon: undefined,
		});

	/* ========================================================================
	   RESET FORM
	========================================================================= */

	const resetForm = () => {
		setShowForm(false);
		setEditingId(null);

		setFormData({
			mode: "new",
			name: "",
			Icon: undefined,
		});

		setError(null);
	};

	/* ========================================================================
	   OPEN CREATE MODAL
	========================================================================= */

	const openCreateModal = () => {
		setEditingId(null);

		setFormData({
			mode: "new",
			name: "",
			Icon: undefined,
		});

		setError(null);
		setShowForm(true);
	};

	/* ========================================================================
	   LOAD CATEGORIES
	========================================================================= */

	const loadCategories = async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(
				"/api/admin/categories",
				{
					method: "GET",
					credentials: "include",
					cache: "no-store",
				},
			);

			const text =
				await response.text();

			let data: unknown;

			try {
				data = text
					? JSON.parse(text)
					: {};
			} catch {
				throw new Error(
					"Invalid response from categories API.",
				);
			}

			if (!response.ok) {
				const message =
					typeof data === "object" &&
					data !== null &&
					"message" in data &&
					typeof data.message ===
						"string"
						? data.message
						: "Failed to load categories.";

				throw new Error(message);
			}

			let fetchedCategories: Category[] =
				[];

			if (
				Array.isArray(data)
			) {
				fetchedCategories =
					data as Category[];
			} else if (
				typeof data === "object" &&
				data !== null &&
				"categories" in data &&
				Array.isArray(
					(data as {
						categories?: unknown;
					}).categories,
				)
			) {
				fetchedCategories =
					(data as {
						categories: Category[];
					}).categories;
			}

			setCategories(
				fetchedCategories,
			);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to load categories.";

			setError(message);

			console.error(
				"Error loading categories:",
				err,
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadCategories();
	}, []);

	/* ========================================================================
	   ESCAPE KEY
	========================================================================= */

	useEffect(() => {
		if (!showForm) return;

		const handleKeyDown = (
			event: KeyboardEvent,
		) => {
			if (
				event.key === "Escape" &&
				!saving
			) {
				resetForm();
			}
		};

		window.addEventListener(
			"keydown",
			handleKeyDown,
		);

		return () => {
			window.removeEventListener(
				"keydown",
				handleKeyDown,
			);
		};
	}, [showForm, saving]);

	/* ========================================================================
	   CREATE / EDIT CATEGORY
	========================================================================= */

	const handleSubmit = async (
		e: React.FormEvent<HTMLFormElement>,
	) => {
		e.preventDefault();

		const trimmedName =
			formData.name.trim();

		if (!trimmedName) {
			setError(
				"Category name is required.",
			);
			return;
		}

		setSaving(true);
		setError(null);

		try {
			const body =
				new FormData();

			body.append(
				"mode",
				formData.mode,
			);

			body.append(
				"name",
				trimmedName,
			);

			body.append(
				"command_type",
				"admin",
			);

			if (
				formData.mode ===
					"edit" &&
				formData.id
			) {
				body.append(
					"id",
					formData.id.toString(),
				);
			}

			if (formData.Icon) {
				body.append(
					"icon",
					formData.Icon,
				);
			}

			const response =
				await fetch(
					"/api/admin/categories",
					{
						method: "POST",
						credentials:
							"include",
						body,
					},
				);

			const text =
				await response.text();

			let data: {
				message?: string;
			} = {};

			try {
				data = text
					? JSON.parse(text)
					: {};
			} catch {
				// Keep empty object if backend
				// returned non-JSON.
			}

			if (!response.ok) {
				throw new Error(
					data.message ||
						"Failed to save category.",
				);
			}

			/* ============================================================
			   CLOSE MODAL
			============================================================ */

			resetForm();

			/* ============================================================
			   REFRESH CATEGORY LIST
			============================================================ */

			await loadCategories();
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to save category.";

			setError(message);

			console.error(
				"Error saving category:",
				err,
			);
		} finally {
			setSaving(false);
		}
	};

	/* ========================================================================
	   EDIT CATEGORY
	========================================================================= */

	const handleEdit = (
		category: Category,
	) => {
		setEditingId(category.id);

		setFormData({
			mode: "edit",
			id: category.id,
			name: category.name,
			Icon: undefined,
		});

		setError(null);
		setShowForm(true);
	};

	/* ========================================================================
	   DELETE CATEGORY
	========================================================================= */

	const handleDelete = async (
		id: number,
	) => {
		const confirmed =
			window.confirm(
				"Are you sure you want to delete this category?",
			);

		if (!confirmed) {
			return;
		}

		setDeletingId(id);
		setError(null);

		try {
			const body =
				new FormData();

			body.append(
				"mode",
				"delete",
			);

			body.append(
				"command_type",
				"admin",
			);

			body.append(
				"id",
				id.toString(),
			);

			const response =
				await fetch(
					"/api/admin/categories",
					{
						method: "POST",
						credentials:
							"include",
						body,
					},
				);

			const text =
				await response.text();

			let data: {
				message?: string;
			} = {};

			try {
				data = text
					? JSON.parse(text)
					: {};
			} catch {
				// Ignore invalid JSON.
			}

			if (!response.ok) {
				throw new Error(
					data.message ||
						"Failed to delete category.",
				);
			}

			await loadCategories();
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to delete category.";

			setError(message);

			console.error(
				"Error deleting category:",
				err,
			);
		} finally {
			setDeletingId(null);
		}
	};

	/* ========================================================================
	   RENDER
	========================================================================= */
	
	const [loggingOut, setLoggingOut] = useState(false);
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
	return (
		<div className="min-h-screen bg-[#FBF9F7] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
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
													group-hover:border-white/30
													group-hover:border-t-white
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
			<div className="mx-auto max-w-7xl mt-6">

				{/* ============================================================
				    HEADER
				============================================================ */}

				<div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#85161B]/10">
							<Tag
								className="text-[#85161B]"
								size={22}
							/>
						</div>

						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#85161B]">
								Admin
							</p>

							<h1 className="text-2xl font-bold text-[#2E2E2E] sm:text-3xl">
								Categories
							</h1>
						</div>
					</div>

					<button
						type="button"
						onClick={openCreateModal}
						className="
							inline-flex
							w-full
							items-center
							justify-center
							gap-2
							rounded-xl
							bg-[#85161B]
							px-4
							py-3
							text-sm
							font-semibold
							text-white
							shadow-sm
							transition-all
							duration-200
							hover:bg-[#A01E23]
							active:scale-[0.98]
							sm:w-auto
						"
					>
						<Plus size={18} />

						<span>
							New Category
						</span>
					</button>
				</div>

				{/* ============================================================
				    GLOBAL ERROR
				============================================================ */}

				{error && !showForm && (
					<div
						className="
							mb-6
							flex
							items-start
							gap-3
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
						<AlertCircle
							size={18}
							className="mt-0.5 shrink-0"
						/>

						<div className="min-w-0">
							<p className="font-semibold">
								Error
							</p>

							<p className="mt-1 break-words text-xs">
								{error}
							</p>
						</div>

						<button
							type="button"
							onClick={() =>
								setError(null)
							}
							className="ml-auto shrink-0 text-red-500 hover:text-red-700"
							aria-label="Dismiss error"
						>
							<X size={16} />
						</button>
					</div>
				)}

				{/* ============================================================
				    LOADING
				============================================================ */}

				{loading && (
					<div className="flex min-h-[300px] items-center justify-center">
						<div className="flex flex-col items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#85161B]/10">
								<RefreshCw
									className="animate-spin text-[#85161B]"
									size={22}
								/>
							</div>

							<p className="text-sm font-medium text-[#2E2E2E]/60">
								Loading categories...
							</p>
						</div>
					</div>
				)}

				{/* ============================================================
				    CATEGORY LIST
				============================================================ */}

				{!loading &&
					categories.length >
						0 && (
						<div className="overflow-hidden rounded-2xl border border-[#E8DED7] bg-white shadow-sm">

							{/* ------------------------------------------------
							    DESKTOP TABLE
							------------------------------------------------- */}

							<div className="hidden overflow-x-auto md:block">
								<table className="w-full">
									<thead>
										<tr className="border-b border-[#E8DED7] bg-[#FBF9F7]">
											<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#2E2E2E]/50">
												Icon
											</th>

											<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#2E2E2E]/50">
												Name
											</th>

											<th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[#2E2E2E]/50">
												Actions
											</th>
										</tr>
									</thead>

									<tbody>
										{categories.map(
											(
												category,
											) => (
												<tr
													key={
														category.id
													}
													className="
														border-b
														border-[#E8DED7]
														last:border-b-0
														transition-colors
														hover:bg-[#FBF9F7]
													"
												>
													{/* ICON */}

													<td className="px-6 py-4">
														{category.icon_path ? (
															<div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-[#E8DED7] bg-[#FBF9F7]">
																<img
																	src={`${CATEGORY_IMAGE_URL}/${category.icon_path}`}
																	alt={
																		category.name
																	}
																	className="h-full w-full object-cover"
																/>
															</div>
														) : (
															<div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#E8DED7] bg-[#FBF9F7]">
																<ImageIcon
																	size={
																		20
																	}
																	className="text-[#2E2E2E]/30"
																/>
															</div>
														)}
													</td>

													{/* NAME */}

													<td className="px-6 py-4">
														<p className="font-semibold text-[#2E2E2E]">
															{
																category.name
															}
														</p>

														<p className="mt-0.5 text-xs text-[#2E2E2E]/40">
															ID #
															{
																category.id
															}
														</p>
													</td>

													{/* ACTIONS */}

													<td className="px-6 py-4">
														<div className="flex justify-end gap-2">
															<button
																type="button"
																onClick={() =>
																	handleEdit(
																		category,
																	)
																}
																disabled={
																	deletingId !==
																	null
																}
																className="
																	inline-flex
																	items-center
																	gap-1.5
																	rounded-lg
																	bg-blue-50
																	px-3
																	py-2
																	text-xs
																	font-semibold
																	text-blue-600
																	transition
																	hover:bg-blue-100
																	disabled:cursor-not-allowed
																	disabled:opacity-50
																"
															>
																<PenLine
																	size={
																		14
																	}
																/>

																<span>
																	Edit
																</span>
															</button>

															<button
																type="button"
																onClick={() =>
																	handleDelete(
																		category.id,
																	)
																}
																disabled={
																	deletingId !==
																	null
																}
																className="
																	inline-flex
																	items-center
																	gap-1.5
																	rounded-lg
																	bg-red-50
																	px-3
																	py-2
																	text-xs
																	font-semibold
																	text-red-600
																	transition
																	hover:bg-red-100
																	disabled:cursor-not-allowed
																	disabled:opacity-50
																"
															>
																{deletingId ===
																category.id ? (
																	<RefreshCw
																		size={
																			14
																		}
																		className="animate-spin"
																	/>
																) : (
																	<Trash2
																		size={
																			14
																		}
																	/>
																)}

																<span>
																	{deletingId ===
																	category.id
																		? "Deleting..."
																		: "Delete"}
																</span>
															</button>
														</div>
													</td>
												</tr>
											),
										)}
									</tbody>
								</table>
							</div>

							{/* ------------------------------------------------
							    MOBILE CARDS
							------------------------------------------------- */}

							<div className="divide-y divide-[#E8DED7] md:hidden">
								{categories.map(
									(
										category,
									) => (
										<div
											key={
												category.id
											}
											className="p-4"
										>
											<div className="flex items-center gap-3">
												{/* IMAGE */}

												<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8DED7] bg-[#FBF9F7]">
													{category.icon_path ? (
														<img
															src={`${CATEGORY_IMAGE_URL}/${category.icon_path}`}
															alt={
																category.name
															}
															className="h-full w-full object-cover"
														/>
													) : (
														<ImageIcon
															size={
																20
															}
															className="text-[#2E2E2E]/30"
														/>
													)}
												</div>

												{/* NAME */}

												<div className="min-w-0 flex-1">
													<p className="truncate font-semibold text-[#2E2E2E]">
														{
															category.name
														}
													</p>

													<p className="mt-1 text-xs text-[#2E2E2E]/40">
														ID #
														{
															category.id
														}
													</p>
												</div>
											</div>

											{/* ACTIONS */}

											<div className="mt-3 grid grid-cols-2 gap-2">
												<button
													type="button"
													onClick={() =>
														handleEdit(
															category,
														)
													}
													disabled={
														deletingId !==
														null
													}
													className="
														inline-flex
														items-center
														justify-center
														gap-1.5
														rounded-lg
														bg-blue-50
														px-3
														py-2.5
														text-xs
														font-semibold
														text-blue-600
														transition
														hover:bg-blue-100
														disabled:opacity-50
													"
												>
													<PenLine
														size={
															14
														}
													/>

													Edit
												</button>

												<button
													type="button"
													onClick={() =>
														handleDelete(
															category.id,
														)
													}
													disabled={
														deletingId !==
														null
													}
													className="
														inline-flex
														items-center
														justify-center
														gap-1.5
														rounded-lg
														bg-red-50
														px-3
														py-2.5
														text-xs
														font-semibold
														text-red-600
														transition
														hover:bg-red-100
														disabled:opacity-50
													"
												>
													{deletingId ===
													category.id ? (
														<RefreshCw
															size={
																14
															}
															className="animate-spin"
														/>
													) : (
														<Trash2
															size={
																14
															}
														/>
													)}

													{deletingId ===
													category.id
														? "Deleting..."
														: "Delete"}
												</button>
											</div>
										</div>
									),
								)}
							</div>
						</div>
					)}

				{/* ============================================================
				    EMPTY STATE
				============================================================ */}

				{!loading &&
					categories.length ===
						0 && (
						<div className="rounded-2xl border border-[#E8DED7] bg-white px-6 py-16 text-center shadow-sm">
							<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#85161B]/10">
								<Tag
									className="text-[#85161B]"
									size={24}
								/>
							</div>

							<h2 className="mt-4 text-base font-semibold text-[#2E2E2E]">
								No categories yet
							</h2>

							<p className="mx-auto mt-1 max-w-sm text-sm text-[#2E2E2E]/50">
								Create your first category
								to start organizing your
								products.
							</p>

							<button
								type="button"
								onClick={
									openCreateModal
								}
								className="
									mt-5
									inline-flex
									items-center
									gap-2
									rounded-xl
									bg-[#85161B]
									px-4
									py-2.5
									text-sm
									font-semibold
									text-white
									transition
									hover:bg-[#A01E23]
								"
							>
								<Plus size={17} />

								Create Category
							</button>
						</div>
					)}
			</div>

			{/* ==================================================================
			    CREATE / EDIT MODAL
			================================================================== */}

			{showForm && (
				<div
					className="
						fixed
						inset-0
						z-[100]
						flex
						items-center
						justify-center
						bg-black/50
						p-3
						backdrop-blur-sm
						sm:p-5
					"
					onMouseDown={(
						event,
					) => {
						if (
							event.target ===
								event.currentTarget &&
							!saving
						) {
							resetForm();
						}
					}}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="category-modal-title"
						className="
							flex
							max-h-[calc(100vh-24px)]
							w-full
							max-w-lg
							flex-col
							overflow-hidden
							rounded-2xl
							border
							border-[#E8DED7]
							bg-white
							shadow-2xl
							sm:max-h-[calc(100vh-40px)]
						"
					>
						{/* ====================================================
						    MODAL HEADER
						==================================================== */}

						<div
							className="
								flex
								shrink-0
								items-center
								justify-between
								border-b
								border-[#E8DED7]
								bg-[#FBF9F7]
								px-4
								py-4
								sm:px-6
							"
						>
							<div className="min-w-0">
								<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#85161B]">
									Category
								</p>

								<h2
									id="category-modal-title"
									className="mt-1 truncate text-lg font-bold text-[#2E2E2E] sm:text-xl"
								>
									{editingId
										? "Edit Category"
										: "Create New Category"}
								</h2>
							</div>

							<button
								type="button"
								onClick={
									resetForm
								}
								disabled={
									saving
								}
								aria-label="Close"
								className="
									ml-3
									flex
									h-9
									w-9
									shrink-0
									items-center
									justify-center
									rounded-full
									border
									border-[#E8DED7]
									bg-white
									text-[#2E2E2E]/60
									transition
									hover:border-[#85161B]/30
									hover:bg-[#85161B]
									hover:text-white
									disabled:cursor-not-allowed
									disabled:opacity-50
								"
							>
								<X size={18} />
							</button>
						</div>

						{/* ====================================================
						    MODAL BODY
						==================================================== */}

						<div className="overflow-y-auto">
							<form
								onSubmit={
									handleSubmit
								}
								className="space-y-5 p-4 sm:p-6"
							>
								{/* ==================================================
								    ERROR
								================================================== */}

								{error && (
									<div
										className="
											flex
											items-start
											gap-3
											rounded-xl
											border
											border-red-200
											bg-red-50
											p-3.5
											text-sm
											text-red-700
										"
									>
										<AlertCircle
											size={
												18
											}
											className="mt-0.5 shrink-0"
										/>

										<div className="min-w-0 flex-1">
											<p className="font-semibold">
												Unable to save
											</p>

											<p className="mt-0.5 break-words text-xs">
												{
													error
												}
											</p>
										</div>

										<button
											type="button"
											onClick={() =>
												setError(
													null,
												)
											}
											className="shrink-0 text-red-500 hover:text-red-700"
										>
											<X
												size={
													15
												}
											/>
										</button>
									</div>
								)}

								{/* ==================================================
								    NAME
								================================================== */}

								<div>
									<label
										htmlFor="category-name"
										className="mb-2 block text-sm font-semibold text-[#2E2E2E]"
									>
										Category Name
										<span className="ml-1 text-[#85161B]">
											*
										</span>
									</label>

									<input
										id="category-name"
										type="text"
										value={
											formData.name
										}
										onChange={(
											event,
										) =>
											setFormData(
												(
													previous,
												) => ({
													...previous,
													name: event
														.target
														.value,
												}),
											)
										}
										placeholder="e.g. Mugs, T-Shirts"
										autoFocus
										disabled={
											saving
										}
										className="
											w-full
											rounded-xl
											border
											border-[#E8DED7]
											bg-white
											px-4
											py-3
											text-sm
											text-[#2E2E2E]
											outline-none
											transition
											placeholder:text-[#2E2E2E]/35
											focus:border-[#85161B]
											focus:ring-2
											focus:ring-[#85161B]/10
											disabled:bg-[#FBF9F7]
										"
									/>
								</div>

								{/* ==================================================
								    ICON
								================================================== */}

								<div>
									<label
										htmlFor="category-icon"
										className="mb-2 block text-sm font-semibold text-[#2E2E2E]"
									>
										Category Icon
									</label>

									<div className="rounded-xl border border-dashed border-[#E8DED7] bg-[#FBF9F7] p-4">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
											<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E8DED7] bg-white">
												{formData.Icon ? (
													<img
														src={URL.createObjectURL(
															formData.Icon,
														)}
														alt="Selected icon"
														className="h-full w-full object-cover"
													/>
												) : (
													<ImageIcon
														size={
															20
														}
														className="text-[#2E2E2E]/30"
													/>
												)}
											</div>

											<div className="min-w-0 flex-1">
												<input
													id="category-icon"
													type="file"
													accept="image/*"
													disabled={
														saving
													}
													onChange={(
														event,
													) =>
														setFormData(
															(
																previous,
															) => ({
																...previous,
																Icon: event
																	.target
																	.files?.[0],
															}),
														)
													}
													className="
														block
														w-full
														cursor-pointer
														text-xs
														text-[#2E2E2E]/60
														file:mr-3
														file:rounded-lg
														file:border-0
														file:bg-[#85161B]
														file:px-3
														file:py-2
														file:text-xs
														file:font-semibold
														file:text-white
														hover:file:bg-[#A01E23]
														disabled:cursor-not-allowed
														disabled:opacity-50
													"
												/>

												{formData.Icon ? (
													<p className="mt-2 truncate text-xs text-[#2E2E2E]/50">
														{
															formData
																.Icon
																.name
														}
													</p>
												) : (
													<p className="mt-2 text-xs text-[#2E2E2E]/40">
														Upload an
														image for
														this category.
													</p>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* ==================================================
								    ACTIONS
								================================================== */}

								<div
									className="
										flex
										flex-col-reverse
										gap-2
										border-t
										border-[#E8DED7]
										pt-5
										sm:flex-row
										sm:justify-end
									"
								>
									<button
										type="button"
										onClick={
											resetForm
										}
										disabled={
											saving
										}
										className="
											w-full
											rounded-xl
											border
											border-[#E8DED7]
											bg-white
											px-5
											py-3
											text-sm
											font-semibold
											text-[#2E2E2E]
											transition
											hover:bg-[#FBF9F7]
											disabled:cursor-not-allowed
											disabled:opacity-50
											sm:w-auto
										"
									>
										Cancel
									</button>

									<button
										type="submit"
										disabled={
											saving ||
											!formData.name.trim()
										}
										className="
											inline-flex
											w-full
											items-center
											justify-center
											gap-2
											rounded-xl
											bg-[#85161B]
											px-5
											py-3
											text-sm
											font-semibold
											text-white
											shadow-sm
											transition
											hover:bg-[#A01E23]
											active:scale-[0.98]
											disabled:cursor-not-allowed
											disabled:opacity-50
											sm:w-auto
										"
									>
										{saving && (
											<RefreshCw
												size={
													16
												}
												className="animate-spin"
											/>
										)}

										{saving
											? "Saving..."
											: editingId
												? "Update Category"
												: "Create Category"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}