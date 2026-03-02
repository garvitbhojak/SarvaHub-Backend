import slugifyLib from 'slugify';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique, URL-safe slug from a product name.
 *
 * Format: `product-name-a1b2c3d4`
 * The trailing short ID ensures uniqueness even if two products share the same name.
 *
 * @param name - The product name to slugify
 * @returns A unique slug string
 */
export function generateSlug(name: string): string {
    const base = slugifyLib(name, {
        lower: true,
        strict: true,   // strip special characters
        trim: true,
    });

    // Append a short unique suffix (first 8 chars of a UUID)
    const shortId = uuidv4().replace(/-/g, '').substring(0, 8);

    return `${base}-${shortId}`;
}
