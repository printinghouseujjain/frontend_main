"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Zap,
	Plus,
	RefreshCw,
	AlertCircle,
	PenLine,
	Trash2,
	Store,
	LogOut,
	X,
	Upload,
} from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

type Occasion = {
	id: number;
	name: string;
	icon_path?: string;
};

type FormData = {
	mode: "new" | "edit";
	id?: number;
	name: string;
	Icon?: File;
};

/* ============================================================================
   PAGE
============================================================================ */

export default function OccasionsPage() {
	const router = useRouter();

	const [occasions, setOccasions] = useState<Occasion[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	/* MODAL */
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);

	/* FORM */
	const [formData, setFormData] = useState<FormData>({
		mode: "new",
		name: "",
		Icon: undefined,
	});

	/* LOGOUT */
	const [loggingOut, setLoggingOut] = useState(false);

	/* ========================================================================
	   LOAD OCCASIONS
	========================================================================= */

	const loadOccasions = async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/admin/occasions", {
				method: "GET",
				credentials: "include",
				cache: "no-store",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.message || "Failed to load occasions",
				);
			}

			setOccasions(
				Array.isArray(data)
					? data
					: data.occasions || [],
			);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to load occasions";

			setError(message);

			console.error(
				"Error loading occasions:",
				err,
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadOccasions();
	}, []);

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
	   OPEN EDIT MODAL
	========================================================================= */

	const handleEdit = (occasion: Occasion) => {
		setEditingId(occasion.id);

		setFormData({
			mode: "edit",
			id: occasion.id,
			name: occasion.name,
			Icon: undefined,
		});

		setError(null);
		setShowForm(true);
	};

	/* ========================================================================
	   CLOSE MODAL
	========================================================================= */

	const closeModal = () => {
		if (loading) return;

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
	   CREATE / EDIT OCCASION
	========================================================================= */

	const handleSubmit = async (
		e: React.FormEvent<HTMLFormElement>,
	) => {
		e.preventDefault();

		if (!formData.name.trim()) {
			setError("Occasion name is required.");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const body = new FormData();

			body.append(
				"mode",
				formData.mode,
			);

			body.append(
				"name",
				formData.name.trim(),
			);

			body.append(
				"command_type",
				"admin",
			);

			if (
				formData.mode === "edit" &&
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

			const response = await fetch(
				"/api/admin/occasions",
				{
					method: "POST",
					body,
					credentials: "include",
				},
			);

			const data =
				await response.json();

			if (!response.ok) {
				throw new Error(
					data.message ||
						"Failed to save occasion",
				);
			}

			closeModal();

			await loadOccasions();
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to save occasion";

			setError(message);

			console.error(
				"Error saving occasion:",
				err,
			);
		} finally {
			setLoading(false);
		}
	};

	/* ========================================================================
	   DELETE OCCASION
	========================================================================= */

	const handleDelete = async (
		id: number,
	) => {
		const confirmed = window.confirm(
			"Are you sure you want to delete this occasion?",
		);

		if (!confirmed) {
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const body = new FormData();

			body.append(
				"mode",
				"delete",
			);

			body.append(
				"id",
				id.toString(),
			);

			body.append(
				"command_type",
				"admin",
			);

			const response = await fetch(
				"/api/admin/occasions",
				{
					method: "POST",
					body,
					credentials: "include",
				},
			);

			const data =
				await response.json();

			if (!response.ok) {
				throw new Error(
					data.message ||
						"Failed to delete occasion",
				);
			}

			await loadOccasions();
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to delete occasion";

			setError(message);

			console.error(
				"Error deleting occasion:",
				err,
			);

			setLoading(false);
		}
	};

	/* ========================================================================
	   LOGOUT
	========================================================================= */

	const handleLogout = async () => {
		if (loggingOut) return;

		setLoggingOut(true);

		try {
			const response = await fetch(
				"/api/admin/logout?command_type=admin",
				{
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type":
							"application/json",
					},
					cache: "no-store",
				},
			);

			if (!response.ok) {
				const data =
					await response
						.json()
						.catch(
							() => ({}),
						);

				throw new Error(
					(
						data as {
							message?: string;
						}
					)?.message ||
						"Unable to logout.",
				);
			}

			router.replace("/login");
		} catch (error) {
			console.error(
				"Admin logout failed:",
				error,
			);

			alert(
				error instanceof Error
					? error.message
					: "Unable to logout. Please try again.",
			);

			setLoggingOut(false);
		}
	};

	/* ========================================================================
	   RENDER
	========================================================================= */

	return (
		<div className="min-h-screen bg-[#FBF9F7]">
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');

				.font-display {
					font-family: 'Fraunces', Georgia, serif;
				}
			`}</style>

			{/* =================================================================
			    TOP NAVBAR
			================================================================= */}

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

					<Link
						href="/admin"
						className="group flex items-center gap-3"
					>
						<div
							className="
								flex
								h-10
								w-10
								items-center
								justify-center
								rounded-xl
								shadow-sm
								transition
								group-hover:scale-[1.02]
							"
						>
							<img
								src="https://api.printinghouseujjain.in/assets/logo.png"
								alt="Printing House"
								className="h-10 w-10 shrink-0 object-contain"
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
							<Store
								size={16}
								strokeWidth={1.8}
							/>

							<span>
								Storefront
							</span>
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
								<p className="text-xs font-semibold text-[#2E2E2E]">
									Admin
								</p>

								<p className="text-[10px] text-[#2E2E2E]/45">
									Administrator
								</p>
							</div>
						</div>

						{/* LOGOUT */}

						<button
							type="button"
							onClick={
								handleLogout
							}
							disabled={
								loggingOut
							}
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
								<LogOut
									size={16}
									strokeWidth={1.9}
								/>
							)}

							<span className="hidden sm:inline">
								{loggingOut
									? "Logging out..."
									: "Logout"}
							</span>
						</button>
					</div>
				</div>
			</header>

			{/* =================================================================
			    MAIN CONTENT
			================================================================= */}

			<div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
				{/* PAGE HEADER */}

				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div
							className="
								flex
								h-11
								w-11
								items-center
								justify-center
								rounded-xl
								bg-[#F7D6BF]/40
							"
						>
							<Zap
								className="text-[#85161B]"
								size={24}
							/>
						</div>

						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]">
								Manage
							</p>

							<h1 className="font-display text-2xl font-bold text-[#2E2E2E] sm:text-3xl">
								Occasions
							</h1>
						</div>
					</div>

					<button
						type="button"
						onClick={
							openCreateModal
						}
						className="
							inline-flex
							items-center
							justify-center
							gap-2
							rounded-xl
							bg-[#85161B]
							px-4
							py-2.5
							text-sm
							font-semibold
							text-white
							shadow-sm
							transition
							hover:bg-[#A01E23]
							active:scale-[0.98]
						"
					>
						<Plus size={18} />

						<span>
							New Occasion
						</span>
					</button>
				</div>

				{/* =================================================================
				    ERROR
				================================================================= */}

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

						<div>
							<p className="font-medium">
								Error
							</p>

							<p className="mt-1">
								{error}
							</p>
						</div>
					</div>
				)}

				{/* =================================================================
				    LOADING
				================================================================= */}

				{loading && (
					<div className="flex min-h-[250px] items-center justify-center">
						<div className="flex flex-col items-center gap-3">
							<RefreshCw
								className="animate-spin text-[#85161B]"
								size={26}
							/>

							<p className="text-sm text-[#2E2E2E]/60">
								Loading occasions...
							</p>
						</div>
					</div>
				)}

				{/* =================================================================
				    OCCASIONS TABLE
				================================================================= */}

				{!loading &&
					occasions.length >
						0 && (
						<div
							className="
								overflow-hidden
								rounded-2xl
								border
								border-[#E8DED7]
								bg-white
								shadow-sm
							"
						>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[620px]">
									<thead>
										<tr className="border-b border-[#E8DED7] bg-[#FBF9F7]">
											<th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#2E2E2E]/55 sm:px-6">
												Icon
											</th>

											<th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#2E2E2E]/55">
												Name
											</th>

											<th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[#2E2E2E]/55 sm:px-6">
												Actions
											</th>
										</tr>
									</thead>

									<tbody>
										{occasions.map(
											(
												occasion,
											) => (
												<tr
													key={
														occasion.id
													}
													className="
														border-b
														border-[#E8DED7]
														last:border-b-0
														transition
														hover:bg-[#FBF9F7]
													"
												>
													{/* ICON */}

													<td className="px-5 py-4 sm:px-6">
														{occasion.icon_path ? (
															<img
																src={`https://api.printinghouseujjain.in/assets/occasions/${occasion.icon_path}`}
																alt={
																	occasion.name
																}
																className="
																	h-14
																	w-14
																	rounded-xl
																	object-cover
																	border
																	border-[#E8DED7]
																"
															/>
														) : (
															<div
																className="
																	flex
																	h-14
																	w-14
																	items-center
																	justify-center
																	rounded-xl
																	bg-[#FBF9F7]
																	text-xs
																	text-[#2E2E2E]/40
																"
															>
																No image
															</div>
														)}
													</td>

													{/* NAME */}

													<td className="px-5 py-4">
														<p className="font-medium text-[#2E2E2E]">
															{
																occasion.name
															}
														</p>
													</td>

													{/* ACTIONS */}

													<td className="px-5 py-4 sm:px-6">
														<div className="flex justify-end gap-2">
															<button
																type="button"
																onClick={() =>
																	handleEdit(
																		occasion,
																	)
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
																		occasion.id,
																	)
																}
																disabled={
																	loading
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
																<Trash2
																	size={
																		14
																	}
																/>

																<span>
																	Delete
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
						</div>
					)}

				{/* =================================================================
				    EMPTY STATE
				================================================================= */}

				{!loading &&
					occasions.length ===
						0 && (
						<div
							className="
								rounded-2xl
								border
								border-[#E8DED7]
								bg-white
								px-6
								py-16
								text-center
							"
						>
							<div
								className="
									mx-auto
									mb-4
									flex
									h-14
									w-14
									items-center
									justify-center
									rounded-full
									bg-[#F7D6BF]/40
								"
							>
								<Zap
									className="text-[#85161B]"
									size={24}
								/>
							</div>

							<p className="mb-4 text-sm text-[#2E2E2E]/60">
								No occasions yet.
								Create your first
								one!
							</p>

							<button
								type="button"
								onClick={
									openCreateModal
								}
								className="
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
								<Plus
									size={18}
								/>

								<span>
									Create Occasion
								</span>
							</button>
						</div>
					)}
			</div>

			{/* =====================================================================
			    CREATE / EDIT MODAL
			===================================================================== */}

			{showForm && (
				<div
					className="
						fixed
						inset-0
						z-[100]
						flex
						items-center
						justify-center
						bg-black/40
						p-4
						backdrop-blur-[2px]
					"
					onMouseDown={(e) => {
						if (
							e.target ===
							e.currentTarget
						) {
							closeModal();
						}
					}}
				>
					<div
						className="
							w-full
							max-w-lg
							overflow-hidden
							rounded-2xl
							border
							border-[#E8DED7]
							bg-white
							shadow-2xl
						"
						onMouseDown={(e) =>
							e.stopPropagation()
						}
					>
						{/* MODAL HEADER */}

						<div
							className="
								flex
								items-center
								justify-between
								border-b
								border-[#E8DED7]
								px-5
								py-4
								sm:px-6
							"
						>
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#85161B]">
									Occasion
								</p>

								<h2 className="font-display mt-1 text-xl font-bold text-[#2E2E2E]">
									{editingId
										? "Edit Occasion"
										: "Create New Occasion"}
								</h2>
							</div>

							<button
								type="button"
								onClick={
									closeModal
								}
								disabled={
									loading
								}
								className="
									flex
									h-9
									w-9
									items-center
									justify-center
									rounded-lg
									text-[#2E2E2E]/50
									transition
									hover:bg-[#FBF9F7]
									hover:text-[#2E2E2E]
									disabled:cursor-not-allowed
									disabled:opacity-50
								"
								aria-label="Close"
							>
								<X size={19} />
							</button>
						</div>

						{/* MODAL BODY */}

						<form
							onSubmit={
								handleSubmit
							}
						>
							<div className="space-y-5 px-5 py-5 sm:px-6">
								{/* MODAL ERROR */}

								{error && (
									<div
										className="
											flex
											items-start
											gap-2.5
											rounded-xl
											border
											border-red-200
											bg-red-50
											px-3.5
											py-3
											text-sm
											text-red-700
										"
									>
										<AlertCircle
											size={
												17
											}
											className="mt-0.5 shrink-0"
										/>

										<div>
											<p className="font-medium">
												Unable to save occasion
											</p>

											<p className="mt-0.5 text-xs">
												{
													error
												}
											</p>
										</div>
									</div>
								)}

								{/* NAME */}

								<div>
									<label
										htmlFor="occasion-name"
										className="
											mb-2
											block
											text-sm
											font-semibold
											text-[#2E2E2E]
										"
									>
										Occasion Name
										<span className="ml-1 text-[#85161B]">
											*
										</span>
									</label>

									<input
										id="occasion-name"
										type="text"
										value={
											formData.name
										}
										onChange={(
											e,
										) =>
											setFormData(
												(
													prev,
												) => ({
													...prev,
													name: e
														.target
														.value,
												}),
											)
										}
										placeholder="e.g. Wedding, Anniversary"
										autoFocus
										className="
											w-full
											rounded-xl
											border
											border-[#E8DED7]
											bg-[#FBF9F7]/50
											px-3.5
											py-3
											text-sm
											text-[#2E2E2E]
											outline-none
											transition
											placeholder:text-[#2E2E2E]/30
											focus:border-[#85161B]/50
											focus:bg-white
											focus:ring-2
											focus:ring-[#85161B]/10
										"
									/>
								</div>

								{/* ICON */}

								<div>
									<label
										htmlFor="occasion-icon"
										className="
											mb-2
											block
											text-sm
											font-semibold
											text-[#2E2E2E]
										"
									>
										Icon
										<span className="ml-1 text-xs font-normal text-[#2E2E2E]/40">
											(Image)
										</span>
									</label>

									<label
										htmlFor="occasion-icon"
										className="
											flex
											cursor-pointer
											items-center
											gap-3
											rounded-xl
											border
											border-dashed
											border-[#D8CBC3]
											bg-[#FBF9F7]/60
											px-4
											py-4
											transition
											hover:border-[#85161B]/40
											hover:bg-[#FBF9F7]
										"
									>
										<div
											className="
												flex
												h-10
												w-10
												shrink-0
												items-center
												justify-center
												rounded-lg
												bg-white
												text-[#85161B]
												shadow-sm
											"
										>
											<Upload
												size={
													18
												}
											/>
										</div>

										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium text-[#2E2E2E]">
												{formData.Icon
													? formData.Icon
															.name
													: editingId
														? "Choose a new icon (optional)"
														: "Choose an icon image"}
											</p>

											<p className="mt-0.5 text-xs text-[#2E2E2E]/40">
												PNG, JPG, WEBP
											</p>
										</div>

										<input
											id="occasion-icon"
											type="file"
											accept="image/*"
											className="hidden"
											onChange={(
												e,
											) =>
												setFormData(
													(
														prev,
													) => ({
														...prev,
														Icon: e
															.target
															.files?.[0],
													}),
												)
											}
										/>
									</label>

									{editingId && (
										<p className="mt-2 text-xs text-[#2E2E2E]/40">
											Leave this
											empty to keep
											the existing
											icon.
										</p>
									)}
								</div>
							</div>

							{/* MODAL FOOTER */}

							<div
								className="
									flex
									flex-col-reverse
									gap-2
									border-t
									border-[#E8DED7]
									bg-[#FBF9F7]/50
									px-5
									py-4
									sm:flex-row
									sm:justify-end
									sm:px-6
								"
							>
								<button
									type="button"
									onClick={
										closeModal
									}
									disabled={
										loading
									}
									className="
										w-full
										rounded-xl
										border
										border-[#E8DED7]
										bg-white
										px-4
										py-2.5
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
										loading
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
										py-2.5
										text-sm
										font-semibold
										text-white
										transition
										hover:bg-[#A01E23]
										disabled:cursor-not-allowed
										disabled:opacity-60
										sm:w-auto
									"
								>
									{loading && (
										<RefreshCw
											size={
												15
											}
											className="animate-spin"
										/>
									)}

									{loading
										? editingId
											? "Updating..."
											: "Creating..."
										: editingId
											? "Update Occasion"
											: "Create Occasion"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}