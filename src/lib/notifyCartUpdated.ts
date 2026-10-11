export function notifyCartUpdated() {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(new Event("cart:updated"));
}
