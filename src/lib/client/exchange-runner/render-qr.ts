/**
 * Browser-only helper that renders a string into an SVG QR code using
 * the `qrcode` library. Loaded via dynamic import so the ~50kb dep
 * stays out of the initial bundle.
 *
 * Returns the SVG string (markup) so the caller can {@html ...} it
 * inside a Svelte component.
 */
export async function renderQrSvg(text: string, size = 256): Promise<string> {
	const QRCode = await import('qrcode');
	return QRCode.toString(text, {
		type: 'svg',
		errorCorrectionLevel: 'M',
		width: size,
		margin: 1
	});
}
