function compact(value: string) {
	return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function isHoldStatus(value: string) {
	const key = compact(value);
	return key === "onhold" || key === "hold" || key.includes("underverification");
}

export function isFailedPayment(value: string) {
	const key = compact(value);
	return key === "failed" || key === "fail" || key === "notreceived";
}

export function isVerifiedPayment(value: string) {
	const key = compact(value);
	return (
		key === "yes" ||
		key === "true" ||
		key === "1" ||
		key === "settled" ||
		key === "paid" ||
		key === "verified"
	);
}

/** UPI is paid in full up front and waits for the store to verify it. */
export function upiAwaitingVerification(
	method: string,
	settled: string,
	paymentStatus: string,
) {
	if (compact(method) !== "upi") {
		return false;
	}

	if (isVerifiedPayment(settled) || isVerifiedPayment(paymentStatus)) {
		return false;
	}

	if (isHoldStatus(paymentStatus) || isHoldStatus(settled)) {
		return true;
	}

	return !isFailedPayment(settled) && !isFailedPayment(paymentStatus);
}
