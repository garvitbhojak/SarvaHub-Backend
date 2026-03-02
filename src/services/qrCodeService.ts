import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// ─── Ensure uploads directory exists ────────────────────────────────
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/qrcodes');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * QR Code Engine Service.
 *
 * Generates a QR code image from a product URL and "uploads" it
 * to a simulated S3 bucket (local filesystem), returning a CDN-style
 * public URL string.
 *
 * In production, replace the local fs.writeFile with an actual S3/GCS upload.
 */
export class QrCodeService {
    /**
     * Generates a QR code PNG image buffer from a product URL.
     *
     * @param productUrl - The full URL to encode (e.g., https://sarvahub.com/products/chronograph-automatic-42mm)
     * @returns PNG image buffer
     */
    static async generateBuffer(productUrl: string): Promise<Buffer> {
        const buffer = await QRCode.toBuffer(productUrl, {
            type: 'png',
            width: 512,
            margin: 2,
            color: {
                dark: '#1F2937',   // Dark charcoal
                light: '#FFFFFF',  // White background
            },
            errorCorrectionLevel: 'H',
        });
        return buffer;
    }

    /**
     * Generates a QR code and simulates uploading it to cloud storage.
     *
     * @param productId - The product's unique ID (e.g., prod_x8922)
     * @param productUrl - The full product page URL
     * @returns A CDN-style public URL for the QR code image
     */
    static async generateAndUpload(productId: string, productUrl: string): Promise<string> {
        const buffer = await this.generateBuffer(productUrl);

        // Simulate S3 upload by writing to local filesystem
        const filename = `${productId}_qr.png`;
        const filePath = path.join(UPLOAD_DIR, filename);

        await fs.promises.writeFile(filePath, buffer);

        // Return a CDN-style URL (in production, this would be the actual S3 URL)
        const publicUrl = `${config.cdnBaseUrl}/qr/${filename}`;

        return publicUrl;
    }

    /**
     * Generates a QR code as a Base64 data URL string.
     * Useful for embedding directly in HTML or returning in API responses.
     *
     * @param productUrl - The URL to encode
     * @returns Base64 data URL (e.g., data:image/png;base64,...)
     */
    static async generateDataUrl(productUrl: string): Promise<string> {
        const dataUrl = await QRCode.toDataURL(productUrl, {
            width: 512,
            margin: 2,
            color: {
                dark: '#1F2937',
                light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H',
        });
        return dataUrl;
    }
}
