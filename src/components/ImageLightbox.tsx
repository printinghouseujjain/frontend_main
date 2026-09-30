"use client";

import {
	useEffect,
	useState,
} from "react";

import { createPortal } from "react-dom";

type ImageLightboxProps = {
	src: string;
	alt?: string;
	onClose: () => void;
};

export default function ImageLightbox({
	src,
	alt = "Review photo",
	onClose,
}: ImageLightboxProps) {
	const [mounted, setMounted] =
		useState(false);

	useEffect(() => {
		setMounted(true);

		const originalOverflow =
			document.body.style.overflow;

		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow =
				originalOverflow;
		};
	}, []);

	useEffect(() => {
		const handleKeyDown = (
			event: KeyboardEvent,
		) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener(
			"keydown",
			handleKeyDown,
		);

		return () => {
			document.removeEventListener(
				"keydown",
				handleKeyDown,
			);
		};
	}, [onClose]);

	if (!mounted || !src) {
		return null;
	}

	return createPortal(
		<div
			className="
				fixed
				inset-0
				z-[9999]
				flex
				h-[100dvh]
				w-screen
				items-center
				justify-center
				bg-black/90
				p-4
				sm:p-6
			"
			role="dialog"
			aria-modal="true"
			aria-label="Review photo"
			onClick={onClose}
		>
			{/* Close button */}
			<button
				type="button"
				onClick={onClose}
				aria-label="Close image"
				className="
					fixed
					right-4
					top-4
					z-[10001]
					flex
					h-11
					w-11
					items-center
					justify-center
					rounded-full
					bg-white
					text-2xl
					font-medium
					text-[#2E2E2E]
					shadow-xl
					transition
					hover:bg-[#F7D6BF]
					sm:right-6
					sm:top-6
				"
			>
				×
			</button>

			{/* Image area */}
			<div
				className="
					relative
					flex
					max-h-[calc(100dvh-2rem)]
					max-w-[calc(100vw-2rem)]
					items-center
					justify-center
					sm:max-h-[calc(100dvh-3rem)]
					sm:max-w-[calc(100vw-3rem)]
				"
				onClick={(event) => {
					event.stopPropagation();
				}}
			>
				<img
					src={src}
					alt={alt}
					className="
						max-h-[calc(100dvh-2rem)]
						max-w-full
						rounded-xl
						object-contain
						shadow-2xl
						sm:max-h-[calc(100dvh-3rem)]
					"
				/>
			</div>
		</div>,
		document.body,
	);
}