import type { ChangeEvent, DragEvent } from "react";

export function isImageFile(file: File) {
	return (
		file.type.startsWith("image/") ||
		/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name)
	);
}

export function assignDroppedFiles(
	input: HTMLInputElement | null,
	files: File[],
	onChange: (event: ChangeEvent<HTMLInputElement>) => void,
) {
	if (!input || files.length === 0) return;

	const transfer = new DataTransfer();

	for (const file of files) {
		transfer.items.add(file);
	}

	input.files = transfer.files;
	onChange({
		target: input,
		currentTarget: input,
	} as ChangeEvent<HTMLInputElement>);
}

export function fileDropHandlers(
	onFiles: (files: File[]) => void,
	accept: (file: File) => boolean = () => true,
) {
	return {
		onDragOver: (event: DragEvent) => {
			event.preventDefault();
			event.stopPropagation();
		},
		onDrop: (event: DragEvent) => {
			event.preventDefault();
			event.stopPropagation();
			const files = Array.from(event.dataTransfer.files).filter(accept);
			if (files.length > 0) onFiles(files);
		},
	};
}
