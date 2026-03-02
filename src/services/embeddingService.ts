import { config } from '../config';

/**
 * Embedding Service.
 *
 * Generates text embeddings for semantic search.
 * Uses a deterministic hash-based embedding as a portable fallback.
 * In production, swap `generateEmbedding()` with a call to
 * OpenAI text-embedding-ada-002, Google Gemini, or Cohere Embed.
 *
 * Dimension: 128 (keep in sync with MongoDB Atlas Vector Search index)
 */

const EMBEDDING_DIM = 128;

/**
 * Generate a text embedding vector.
 *
 * @param text - The input text to embed
 * @returns A normalized float array of length EMBEDDING_DIM
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // ──────────────────────────────────────────────────────
    // PRODUCTION: Uncomment one of the following integrations
    // ──────────────────────────────────────────────────────
    // return await openAiEmbedding(text);
    // return await geminiEmbedding(text);

    // DEVELOPMENT: deterministic hash embedding (no API key needed)
    return hashEmbedding(text);
}

/**
 * Deterministic hash-based embedding.
 * Produces consistent vectors for the same input — useful for dev/test
 * and as a fallback when no embedding API key is configured.
 */
function hashEmbedding(text: string): number[] {
    const embedding = new Array(EMBEDDING_DIM).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const words = normalized.split(/\s+/).filter(Boolean);

    // Spread word character codes across the embedding dimensions
    for (let w = 0; w < words.length; w++) {
        const word = words[w];
        for (let c = 0; c < word.length; c++) {
            const charCode = word.charCodeAt(c);
            // Use position-sensitive hashing for better distribution
            const idx = ((charCode * 31 + c * 17 + w * 7) & 0x7fffffff) % EMBEDDING_DIM;
            embedding[idx] += 1.0 / (1 + w * 0.1); // down-weight later words slightly
        }
    }

    // L2 normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum: number, v: number) => sum + v * v, 0));
    if (magnitude > 0) {
        for (let i = 0; i < EMBEDDING_DIM; i++) {
            embedding[i] = parseFloat((embedding[i] / magnitude).toFixed(6));
        }
    }

    return embedding;
}

// ─── Production Integrations (uncomment when API keys available) ────

/*
async function openAiEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text,
            dimensions: EMBEDDING_DIM,
        }),
    });
    const json = await response.json();
    return json.data[0].embedding;
}
*/

export { EMBEDDING_DIM };
