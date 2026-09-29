"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type ImageLightboxProps = {
	src: string;
	alt?: string;
	onClose: () => void;
};

export default function ImageLightbox({
	src,
	alt = "Photo",
	onClose,
}: ImageLightboxProps) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label={alt}
		>
			<div
				className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close photo"
					className="absolute right-3 top-3 z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#333] shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-110 hover:text-[#85161B] active:scale-95"
					style={{
						top: "max(0.75rem, env(safe-area-inset-top))",
						right: "max(0.75rem, env(safe-area-inset-right))",
					}}
				>
					<X size={20} strokeWidth={2.2} />
				</button>

				<div className="overflow-y-auto bg-black/20">
					<img
						src={src}
						alt={alt}
						className="mx-auto block h-auto max-h-[90dvh] w-full object-contain"
					/>
				</div>
			</div>
		</div>
	);
}
