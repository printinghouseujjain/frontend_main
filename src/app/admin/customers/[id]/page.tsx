"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	ArrowLeft,
	CalendarDays,
	Edit3,
	Mail,
	Phone,
	Save,
	ShoppingBag,
	User,
} from "lucide-react";

type Customer = {
	id?: number | string;
	user_id?: number | string;
	name?: string;
	email?: string;
	phone?: string;
	is_reseller?: string;
	credit_eligibility?: string;

	/*
	 * The fetch response for a customer does NOT currently include
	 * this field (confirmed sample response only has id, name, email,
	 * phone, is_reseller, credit_eligibility). It's kept here so that
	 * if/when the backend starts returning it, formFromCustomer()
	 * below picks it up automatically instead of always falling back
	 * to the "yes" default.
	 */
	reseller_toggle?: string;

	created_at?: string;
	address?: string | Record<string, unknown>;
};

type Order = {
	id: string;
	date: string;
	status: string;
	amount: number;
	items: number;
};

type RawOrder = {
	id?: number | string;
	order_id?: string;
	user_id?: number | string | null;
	order_status?: string;
	grand_total?: number | string;
	products_count?: number | string;
	created_at?: string;
};

type UserForm = {
	name: string;
	email: string;
	phone: string;
	reseller: "yes" | "no";

	/*
	 * Whether an existing reseller is currently active. Only
	 * meaningful (and only shown/sent) when reseller === "yes" —
	 * toggling activity for a non-reseller has no effect on the
	 * backend and would be confusing in the UI.
	 */
	resellerActive: "yes" | "no";

	credit: "eligible" | "not_eligible";
};

function numberValue(value: unknown) {
	const number = Number(value ?? 0);
	return Number.isFinite(number) ? number : 0;
}

function formatDate(value?: string) {
	if (!value) return "—";
	const date = new Date(value.replace(" ", "T"));
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString("en-IN", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			});
}

function normalizeStatus(value?: string) {
	const status = String(value ?? "pending").toLowerCase();
	if (status.includes("deliver") || status.includes("complete"))
		return "Delivered";
	if (status.includes("ship") || status.includes("dispatch")) return "Shipped";
	if (status.includes("process") || status.includes("confirm"))
		return "Processing";
	if (status.includes("cancel")) return "Cancelled";
	return "Pending";
}

function parseUsers(data: unknown): Customer[] {
	if (!data || typeof data !== "object") return [];
	const value = data as {
		users?: Customer | Customer[];
		user?: Customer;
		result?: Customer | Customer[];
	};
	if (Array.isArray(value.users)) return value.users;
	if (value.users) return [value.users];
	if (value.user) return [value.user];
	if (Array.isArray(value.result)) return value.result;
	if (value.result) return [value.result];
	return [];
}

function parseOrders(data: unknown, customerId: string): Order[] {
	if (!data || typeof data !== "object") return [];
	const value = data as { orders?: RawOrder[] };
	return (value.orders ?? [])
		.filter((order) => String(order.user_id ?? "") === customerId)
		.map((order) => ({
			id: String(order.order_id ?? order.id ?? ""),
			date: formatDate(order.created_at),
			status: normalizeStatus(order.order_status),
			amount: numberValue(order.grand_total),
			items: numberValue(order.products_count),
		}));
}

function formFromCustomer(customer: Customer): UserForm {
	const reseller =
		String(customer.is_reseller ?? "").toLowerCase() === "yes" ? "yes" : "no";

	return {
		name: customer.name ?? "",
		email: customer.email ?? "",
		phone: customer.phone ?? "",
		reseller,

		/*
		 * Backend doesn't return current active/inactive state today.
		 * Default to "yes" (active) — the common case for an existing
		 * reseller — but read it back if the backend ever adds the
		 * field to the response.
		 */
		resellerActive:
			String(customer.reseller_toggle ?? "yes").toLowerCase() === "no"
				? "no"
				: "yes",

		credit:
			String(customer.credit_eligibility ?? "").toLowerCase() === "eligible"
				? "eligible"
				: "not_eligible",
	};
}

export default function AdminCustomerDetailsPage() {
	const params = useParams<{ id: string }>();
	const customerKey = params?.id ? decodeURIComponent(params.id) : "";
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [form, setForm] = useState<UserForm | null>(null);

	/*
	 * Snapshot of the form as it was when loaded (or last saved),
	 * used to work out which fields actually changed so the save
	 * request only sends what was modified.
	 */
	const [originalForm, setOriginalForm] = useState<UserForm | null>(null);

	const [orders, setOrders] = useState<Order[]>([]);
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	const customerId = String(customer?.id ?? customer?.user_id ?? customerKey);
	const totalSpent = useMemo(
		() => orders.reduce((sum, order) => sum + order.amount, 0),
		[orders],
	);

	useEffect(() => {
		if (!customerKey) return;
		void (async () => {
			try {
				const userBody = new FormData();
				userBody.append("user_id", customerKey);
				const [usersResponse, ordersResponse] = await Promise.all([
					fetch("/api/admin/users", {
						method: "POST",
						body: userBody,
						cache: "no-store",
						credentials: "include",
					}),
					fetch("/api/admin/orders", {
						cache: "no-store",
						credentials: "include",
					}),
				]);
				const usersData = await usersResponse.json().catch(() => ({}));
				if (!usersResponse.ok)
					throw new Error(usersData.message || "Unable to load customer.");
				const found = parseUsers(usersData).find(
					(item) =>
						String(item.id ?? item.user_id ?? item.email ?? "") === customerKey,
				);
				if (!found) throw new Error("Customer not found.");
				setCustomer(found);
				const initialForm = formFromCustomer(found);
				setForm(initialForm);
				setOriginalForm(initialForm);
				setOrders(
					parseOrders(
						await ordersResponse.json().catch(() => ({})),
						String(found.id ?? found.user_id ?? ""),
					),
				);
			} catch (loadError) {
				setError(
					loadError instanceof Error
						? loadError.message
						: "Unable to load customer.",
				);
			} finally {
				setLoading(false);
			}
		})();
	}, [customerKey]);

	const updateForm = <K extends keyof UserForm>(key: K, value: UserForm[K]) =>
		setForm((current) => (current ? { ...current, [key]: value } : current));

	const saveCustomer = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!form || !customer || !originalForm) return;

		/* -------------------------------------------------------------
		   BUILD ONLY THE CHANGED FIELDS
		------------------------------------------------------------- */

		const changedFields: Record<string, string> = {};

		/*
		 * name is always sent, even when unchanged, per request.
		 */
		changedFields.name = form.name;

		if (form.email !== originalForm.email) {
			changedFields.email = form.email;
		}

		if (form.phone !== originalForm.phone) {
			changedFields.phone = form.phone;
		}

		if (form.reseller !== originalForm.reseller) {
			changedFields.reseller = form.reseller;
		}

		/*
		 * Only meaningful (and only sent) for an active/soon-to-be-active
		 * reseller — the toggle is hidden entirely when reseller is "no".
		 *
		 * The backend rejects a request containing only reseller_toggle
		 * with "Atleast one attribute is reequired." — confirmed by an
		 * actual failing request (reseller_toggle=no on its own). So
		 * whenever reseller_toggle is sent, reseller is sent alongside
		 * it too, even if reseller itself didn't change, to satisfy
		 * that check.
		 */
		if (
			form.reseller === "yes" &&
			form.resellerActive !== originalForm.resellerActive
		) {
			changedFields.reseller_toggle = form.resellerActive;
			changedFields.reseller = form.reseller;
		}

		if (form.credit !== originalForm.credit) {
			changedFields.credit = form.credit;
		}

		const hasOtherChanges = Object.keys(changedFields).some(
			(key) => key !== "name",
		);

		if (!hasOtherChanges && form.name === originalForm.name) {
			setMessage("No changes to save.");
			setEditing(false);
			return;
		}

		setSaving(true);
		setError("");
		setMessage("");

		try {
			const body = new FormData();

			body.append("user_id", customerId);
			body.append("command_type", "admin");

			Object.entries(changedFields).forEach(([key, value]) => {
				body.append(key, value);
			});

			const response = await fetch("/api/update_user", {
				method: "POST",
				body,
				credentials: "include",
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok)
				throw new Error(data.message || "Unable to update customer.");

			const updated: Customer = {
				...customer,
				name: form.name,
				email: form.email,
				phone: form.phone,
				is_reseller: form.reseller,
				reseller_toggle: form.resellerActive,
				credit_eligibility: form.credit,
			};

			setCustomer(updated);
			setOriginalForm(form);
			setMessage("Customer updated successfully.");
			setEditing(false);
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Unable to update customer.",
			);
		} finally {
			setSaving(false);
		}
	};

	const cancelEditing = () => {
		if (originalForm) {
			setForm(originalForm);
		}
		setError("");
		setMessage("");
		setEditing(false);
	};

	if (loading)
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#FBF9F7] text-sm text-[#2E2E2E]/60">
				Loading customer...
			</main>
		);
	if (error && !customer)
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#FBF9F7] px-5">
				<div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
					<p className="text-sm text-red-700">{error}</p>
					<Link
						href="/admin/customers"
						className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#85161B]"
					>
						<ArrowLeft size={16} />
						Back to customers
					</Link>
				</div>
			</main>
		);
	if (!customer || !form) return null;

	return (
		<main className="min-h-screen bg-[#FBF9F7] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
			<div className="mx-auto max-w-6xl">
				<Link
					href="/admin/customers"
					className="inline-flex items-center gap-2 text-sm font-medium text-[#2E2E2E]/55 hover:text-[#85161B]"
				>
					<ArrowLeft size={16} />
					All customers
				</Link>
				<div className="mt-6 flex flex-col justify-between gap-4 border-b border-[#E8DED7] pb-6 sm:flex-row sm:items-end">
					<div className="flex items-center gap-4">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F7D6BF]/55 text-lg font-bold text-[#85161B]">
							{(form.name || "Customer")
								.split(/\s+/)
								.map((part) => part[0])
								.join("")
								.slice(0, 2)
								.toUpperCase()}
						</div>
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#85161B]">
								Customer profile
							</p>
							<h1 className="mt-1 text-3xl font-bold text-[#2E2E2E]">
								{form.name || "Unnamed customer"}
							</h1>
							<p className="mt-1 text-sm text-[#2E2E2E]/50">
								Customer ID #{customerId}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => (editing ? cancelEditing() : setEditing(true))}
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white"
					>
						<Edit3 size={16} />
						{editing ? "Cancel editing" : "Edit customer"}
					</button>
				</div>
				{(error || message) && (
					<div
						className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
					>
						{error || message}
					</div>
				)}
				<div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
					<section className="rounded-2xl border border-[#E8DED7] bg-white p-5 sm:p-6">
						<div className="flex items-center justify-between">
							<h2 className="flex items-center gap-2 text-base font-semibold">
								<User size={18} className="text-[#85161B]" />
								Contact details
							</h2>
							<span
								className={`rounded-full px-2.5 py-1 text-xs font-semibold ${form.reseller === "yes" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
							>
								{form.reseller === "yes" ? "Reseller" : "Retail customer"}
							</span>
						</div>
						{editing ? (
							<form onSubmit={saveCustomer} className="mt-5 space-y-4">
								<label className="block text-sm font-medium">
									Name
									<input
										value={form.name}
										onChange={(event) => updateForm("name", event.target.value)}
										className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 outline-none focus:border-[#85161B]"
									/>
								</label>
								<label className="block text-sm font-medium">
									Email
									<input
										type="email"
										value={form.email}
										onChange={(event) =>
											updateForm("email", event.target.value)
										}
										className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 outline-none focus:border-[#85161B]"
									/>
								</label>
								<label className="block text-sm font-medium">
									Phone
									<input
										value={form.phone}
										onChange={(event) =>
											updateForm("phone", event.target.value)
										}
										className="mt-1.5 w-full rounded-xl border border-[#E8DED7] px-3 py-2.5 outline-none focus:border-[#85161B]"
									/>
								</label>
								<label className="block text-sm font-medium">
									Reseller
									<select
										value={form.reseller}
										onChange={(event) =>
											updateForm("reseller", event.target.value as "yes" | "no")
										}
										className="mt-1.5 w-full rounded-xl border border-[#E8DED7] bg-white px-3 py-2.5"
									>
										<option value="yes">Yes</option>
										<option value="no">No</option>
									</select>
								</label>
								{form.reseller === "yes" && (
									<label className="block text-sm font-medium">
										Reseller status
										<select
											value={form.resellerActive}
											onChange={(event) =>
												updateForm(
													"resellerActive",
													event.target.value as "yes" | "no",
												)
											}
											className="mt-1.5 w-full rounded-xl border border-[#E8DED7] bg-white px-3 py-2.5"
										>
											<option value="yes">Active</option>
											<option value="no">Inactive</option>
										</select>
									</label>
								)}
								<label className="block text-sm font-medium">
									Credit eligibility
									<select
										value={form.credit}
										onChange={(event) =>
											updateForm(
												"credit",
												event.target.value as "eligible" | "not_eligible",
											)
										}
										className="mt-1.5 w-full rounded-xl border border-[#E8DED7] bg-white px-3 py-2.5"
									>
										<option value="eligible">Eligible</option>
										<option value="not_eligible">Not eligible</option>
									</select>
								</label>
								<button
									type="submit"
									disabled={saving}
									className="inline-flex items-center gap-2 rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
								>
									<Save size={16} />
									{saving ? "Saving..." : "Save changes"}
								</button>
							</form>
						) : (
							<div className="mt-5 space-y-4">
								<p className="flex items-center gap-3 text-sm text-[#2E2E2E]/65">
									<Mail size={16} className="text-[#85161B]" />
									{form.email || "—"}
								</p>
								<p className="flex items-center gap-3 text-sm text-[#2E2E2E]/65">
									<Phone size={16} className="text-[#85161B]" />
									{form.phone || "—"}
								</p>
								<p className="flex items-center gap-3 text-sm text-[#2E2E2E]/65">
									<ShoppingBag size={16} className="text-[#85161B]" />
									Credit eligibility:{" "}
									{form.credit === "eligible" ? "Eligible" : "Not eligible"}
								</p>
								{form.reseller === "yes" && (
									<p className="flex items-center gap-3 text-sm text-[#2E2E2E]/65">
										<span
											className={`inline-block h-2 w-2 rounded-full ${form.resellerActive === "yes" ? "bg-green-500" : "bg-gray-400"}`}
										/>
										Reseller status:{" "}
										{form.resellerActive === "yes" ? "Active" : "Inactive"}
									</p>
								)}
							</div>
						)}
					</section>
					<section className="grid grid-cols-2 gap-4">
						<div className="rounded-2xl border border-[#E8DED7] bg-white p-5">
							<p className="text-xs text-[#2E2E2E]/45">Orders</p>
							<p className="mt-2 text-2xl font-bold text-[#85161B]">
								{orders.length}
							</p>
						</div>
						<div className="rounded-2xl border border-[#E8DED7] bg-white p-5">
							<p className="text-xs text-[#2E2E2E]/45">Total spent</p>
							<p className="mt-2 text-2xl font-bold text-[#85161B]">
								₹{totalSpent.toLocaleString("en-IN")}
							</p>
						</div>
						<div className="col-span-2 rounded-2xl border border-[#E8DED7] bg-white p-5">
							<p className="flex items-center gap-2 text-xs text-[#2E2E2E]/45">
								<CalendarDays size={14} />
								Account information
							</p>
							<p className="mt-2 text-sm text-[#2E2E2E]/65">
								Reseller:{" "}
								<strong>{form.reseller === "yes" ? "Yes" : "No"}</strong>
								{form.reseller === "yes" && (
									<>
										{" "}
										({form.resellerActive === "yes" ? "Active" : "Inactive"})
									</>
								)}
							</p>
							<p className="mt-1 text-sm text-[#2E2E2E]/65">
								Credit eligibility:{" "}
								<strong>
									{form.credit === "eligible" ? "Eligible" : "Not eligible"}
								</strong>
							</p>
						</div>
					</section>
				</div>
				<section className="mt-4 rounded-2xl border border-[#E8DED7] bg-white p-5 sm:p-6">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold">Order history</h2>
						<span className="text-xs text-[#2E2E2E]/45">
							{orders.length} order{orders.length === 1 ? "" : "s"}
						</span>
					</div>
					{orders.length === 0 ? (
						<p className="mt-5 text-sm text-[#2E2E2E]/50">
							No orders found for this customer.
						</p>
					) : (
						<div className="mt-4 divide-y divide-[#F0E8E2]">
							{orders.map((order) => (
								<div
									key={order.id}
									className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
								>
									<div>
										<p className="text-sm font-semibold">#{order.id}</p>
										<p className="mt-1 text-xs text-[#2E2E2E]/50">
											{order.items} item{order.items === 1 ? "" : "s"} ·{" "}
											{order.date} · {order.status}
										</p>
									</div>
									<div className="flex items-center gap-3">
										<span className="text-sm font-semibold text-[#85161B]">
											₹{order.amount.toLocaleString("en-IN")}
										</span>
										<Link
											href={`/admin/orders/${order.id}`}
											className="rounded-lg border border-[#85161B]/20 px-3 py-2 text-xs font-semibold text-[#85161B]"
										>
											View order
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
