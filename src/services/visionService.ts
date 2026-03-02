import { config } from '../config';

/**
 * Vision Service.
 *
 * Wraps Google Cloud Vision API for image label detection.
 * Used by the visual search endpoint to extract labels from
 * user-uploaded images, then query products by those labels.
 *
 * Falls back to mock labels in development when no API key is configured.
 */

interface VisionLabel {
    description: string;
    score: number;
}

/**
 * Detect labels in an image using Google Cloud Vision API.
 *
 * @param imageBuffer - Raw image buffer (PNG/JPEG)
 * @returns Array of detected labels with confidence scores
 */
export async function detectLabels(imageBuffer: Buffer): Promise<VisionLabel[]> {
    const apiKey = config.googleCloud.visionApiKey;

    // ── Development fallback: return mock labels ────────────────────
    if (!apiKey) {
        console.warn('[VisionService] No GOOGLE_CLOUD_VISION_API_KEY set — using mock labels.');
        return getMockLabels();
    }

    // ── Production: call Google Cloud Vision API ────────────────────
    try {
        const base64Image = imageBuffer.toString('base64');

        const response = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [
                        {
                            image: { content: base64Image },
                            features: [
                                { type: 'LABEL_DETECTION', maxResults: 15 },
                                { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
                            ],
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('[VisionService] API error:', errText);
            return getMockLabels();
        }

        const data = await response.json() as any;
        const annotations = data.responses?.[0];

        const labels: VisionLabel[] = [];

        // Extract label annotations
        if (annotations?.labelAnnotations) {
            for (const label of annotations.labelAnnotations) {
                labels.push({
                    description: label.description,
                    score: label.score,
                });
            }
        }

        // Extract localized object names
        if (annotations?.localizedObjectAnnotations) {
            for (const obj of annotations.localizedObjectAnnotations) {
                labels.push({
                    description: obj.name,
                    score: obj.score,
                });
            }
        }

        // Deduplicate and sort by score
        const seen = new Set<string>();
        const uniqueLabels = labels.filter((l) => {
            const key = l.description.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        uniqueLabels.sort((a, b) => b.score - a.score);

        return uniqueLabels.slice(0, 10);
    } catch (err) {
        console.error('[VisionService] Error calling Vision API:', err);
        return getMockLabels();
    }
}

/**
 * Convert detected labels to search-friendly query terms.
 */
export function labelsToSearchTerms(labels: VisionLabel[]): string[] {
    return labels
        .filter((l) => l.score >= 0.5)
        .map((l) => l.description.toLowerCase());
}

/**
 * Mock labels for development without API key.
 */
function getMockLabels(): VisionLabel[] {
    return [
        { description: 'Product', score: 0.95 },
        { description: 'Fashion', score: 0.88 },
        { description: 'Clothing', score: 0.85 },
        { description: 'Accessory', score: 0.78 },
        { description: 'Style', score: 0.72 },
    ];
}
