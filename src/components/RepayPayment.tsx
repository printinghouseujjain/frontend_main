"use client";

import { useState } from "react";
import Script from "next/script";
import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";

type RepayMethod = "upi" | "razorpay";

type RazorpayResponse = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};

type RazorpayOptions = {
	key: string;
	order_id: string;
	name: string;
	description: string;
	theme: { color: string };
	handler: (response: RazorpayResponse) => void;
	modal: { ondismiss: () => void };
};

type RazorpayInstance = {
	open: () => void;
	on: (event: string, callback: (response: unknown) => void) => void;
};

type RazorpayWindow = Window & {
	Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
};

type UpiSession = {
	uri: string;
	upiId: string;
	orderId: string;
};

function findUpiUri(value: unknown, depth = 0): string | null {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return /^upi:\/\//i.test(trimmed) ? trimmed : null;
	}

	if (depth > 2 || !value || typeof value !== "object") {
		return null;
	}

	for (const child of Object.values(value as Record<string, unknown>)) {
		const found = findUpiUri(child, depth + 1);
		if (found) return found;
	}

	return null;
}

function getUpiIdFromUri(uri: string) {
	const match = uri.match(/[?&]pa=([^&]+)/i);
	if (!match) return "";

	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

function extractUpiDetails(
	result: Record<string, unknown>,
	amount: number,
	orderId: string,
) {
	const uri = findUpiUri(result);

	if (uri) {
		return { uri, upiId: getUpiIdFromUri(uri) };
	}

	for (const key of ["upi_id", "upiId", "vpa", "UPI"]) {
		const candidate = result[key];

		if (typeof candidate === "string" && candidate.includes("@")) {
			const upiId = candidate.trim();
			const link =
				`upi://pay?pa=${encodeURIComponent(upiId).replace(/%40/g, "@")}` +
				`&pn=${encodeURIComponent("Printing House")}` +
				`&am=${amount.toFixed(2)}` +
				`&cu=INR` +
				`&tn=${encodeURIComponent(`Order ${orderId}`)}`;

			return { uri: link, upiId };
		}
	}

	return null;
}

async function verifyPayment(payload: Record<string, unknown>) {
	const response = await fetch("/api/verify_payment", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ ...payload, repay: "yes" }),
	});

	const data: { status?: number; message?: string } = await response
		.json()
		.catch(() => ({}));

	if (!response.ok) {
		throw new Error(data.message || "Payment verification failed.");
	}

	if (data.status !== 200 || data.message !== "Success.") {
		throw new Error(data.message || "Payment could not be verified.");
	}
}

export function canRepayOrder(paymentMethod: string, paymentSettled: string) {
	const method = paymentMethod.trim().toLowerCase();
	const settled = paymentSettled.trim().toLowerCase();

	return (
		(method === "upi" && settled === "failed") ||
		(method === "credit" && settled === "no")
	);
}

export function RepayPayment({
	orderId,
	amount,
	onPaid,
}: {
	orderId: string;
	amount: number;
	onPaid?: (method: RepayMethod) => void;
}) {
	const [method, setMethod] = useState<RepayMethod>("upi");
	const [busy, setBusy] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [upiSession, setUpiSession] = useState<UpiSession | null>(null);

	const finish = (paidWith: RepayMethod, message: string) => {
		setUpiSession(null);
		setSuccess(message);
		onPaid?.(paidWith);
	};

	const openRazorpay = (apiKey: string, razorpayOrderId: string) => {
		const Razorpay = (window as RazorpayWindow).Razorpay;

		if (!Razorpay) {
			throw new Error(
				"Razorpay Checkout has not loaded yet. Please refresh and try again.",
			);
		}

		const checkout = new Razorpay({
			key: apiKey,
			order_id: razorpayOrderId,
			name: "Printing House",
			description: `Repay order #${orderId}`,
			theme: { color: "#85161B" },
			handler: async (response) => {
				try {
					await verifyPayment({
						payment_method: "razorpay",
						razorpay_order_id: response.razorpay_order_id,
						razorpay_payment_id: response.razorpay_payment_id,
						razorpay_signature: response.razorpay_signature,
					});
					finish("razorpay", "Payment received. Your order has been updated.");
				} catch (verifyError) {
					setError(
						verifyError instanceof Error
							? verifyError.message
							: "Payment verification failed.",
					);
				} finally {
					setBusy(false);
				}
			},
			modal: {
				ondismiss: () => setBusy(false),
			},
		});

		checkout.on("payment.failed", () => {
			setError("Payment failed. Please try again.");
			setBusy(false);
		});

		checkout.open();
	};

	const startRepay = async () => {
		setBusy(true);
		setError("");
		setSuccess("");

		try {
			const response = await fetch("/api/repay_payment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					order_id: orderId,
					payment_method: method,
				}),
			});

			const data = (await response.json().catch(() => ({}))) as {
				message?: string;
				result?: Record<string, unknown>;
			};

			if (!response.ok) {
				throw new Error(data.message || "Unable to start repayment.");
			}

			const result = data.result ?? {};
			const paymentOrderId = String(result.order_id ?? result.id ?? "");

			if (method === "razorpay") {
				const apiKey = typeof result.key === "string" ? result.key : "";

				if (!apiKey || !paymentOrderId) {
					throw new Error("Razorpay details were not returned.");
				}

				openRazorpay(apiKey, paymentOrderId);
				return;
			}

			if (!paymentOrderId) {
				throw new Error("The server did not return an order ID.");
			}

			const upi = extractUpiDetails(result, amount, orderId);

			if (!upi) {
				throw new Error("The server did not return UPI payment details.");
			}

			setUpiSession({
				uri: upi.uri,
				upiId: upi.upiId,
				orderId: paymentOrderId,
			});
			setBusy(false);
		} catch (repayError) {
			setError(
				repayError instanceof Error
					? repayError.message
					: "Unable to start repayment.",
			);
			setBusy(false);
		}
	};

	const confirmUpi = async () => {
		if (!upiSession) return;

		setVerifying(true);
		setError("");

		try {
			await verifyPayment({
				payment_method: "upi",
				razorpay_order_id: upiSession.orderId,
			});
			finish(
				"upi",
				"Payment under verification. The store will confirm it shortly.",
			);
		} catch (verifyError) {
			setError(
				verifyError instanceof Error
					? verifyError.message
					: "Payment verification failed.",
			);
		} finally {
			setVerifying(false);
		}
	};

	return (
		<div id="pay" className="rounded-2xl border border-[#E9DED7] bg-white p-5 sm:p-6">
			<Script
				src="https://checkout.razorpay.com/v1/checkout.js"
				strategy="afterInteractive"
			/>

			<h3 className="text-sm font-bold text-[#2E2E2E]">Pay this order</h3>
			<p className="mt-1 text-xs leading-5 text-[#2E2E2E]/55">
				Pay the remaining amount with UPI or Razorpay.
				{amount > 0 ? ` Amount due ₹${amount.toLocaleString("en-IN")}.` : ""}
			</p>

			{success ? (
				<p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
					{success}
				</p>
			) : upiSession ? (
				<div className="mt-4 flex flex-col items-center gap-3">
					<div className="rounded-2xl bg-white p-3 shadow-sm">
						<QRCodeSVG value={upiSession.uri} size={180} level="M" />
					</div>
					{upiSession.upiId && (
						<p className="text-sm font-semibold text-[#2E2E2E]">
							{upiSession.upiId}
						</p>
					)}
					<a
						href={upiSession.uri}
						className="text-sm font-semibold text-[#85161B] underline"
					>
						Open UPI app
					</a>
					<div className="flex w-full gap-2">
						<button
							type="button"
							onClick={() => setUpiSession(null)}
							className="flex-1 rounded-xl border border-[#E8DED7] px-4 py-2.5 text-sm font-semibold"
						>
							Back
						</button>
						<button
							type="button"
							disabled={verifying}
							onClick={() => void confirmUpi()}
							className="flex-1 rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
						>
							{verifying ? "Checking..." : "Payment done"}
						</button>
					</div>
				</div>
			) : (
				<div className="mt-4 space-y-3">
					<div className="grid grid-cols-2 gap-2">
						{(["upi", "razorpay"] as const).map((option) => (
							<button
								key={option}
								type="button"
								onClick={() => setMethod(option)}
								className={`rounded-xl px-3 py-2.5 text-sm font-semibold capitalize ${
									method === option
										? "bg-[#85161B] text-white"
										: "border border-[#E8DED7] bg-white text-[#2E2E2E]"
								}`}
							>
								{option === "upi" ? "UPI" : "Razorpay"}
							</button>
						))}
					</div>
					<button
						type="button"
						disabled={busy}
						onClick={() => void startRepay()}
						className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#85161B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
					>
						{busy && <Loader2 size={16} className="animate-spin" />}
						{busy ? "Starting..." : "Pay now"}
					</button>
				</div>
			)}

			{error && (
				<p className="mt-3 text-xs font-medium text-red-600">{error}</p>
			)}
		</div>
	);
}
