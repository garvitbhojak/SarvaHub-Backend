import { Request, Response, NextFunction } from 'express';
import { Product } from '../models';
import { detectLabels, labelsToSearchTerms } from '../services/visionService';
import { generateEmbedding, EMBEDDING_DIM } from '../services/embeddingService';
import { paginatedResponse } from '../utils/pagination';
import { Errors } from '../utils/errors';

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/search/visual — Visual image search
// ─────────────────────────────────────────────────────────────────────
export async function visualSearch(req: Request, res: Response, next: NextFunction) {
    try {
        const file = req.file;
        if (!file) {
            throw Errors.badRequest('Image file is required. Upload a file with field name "image".');
        }

        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;

        // 1. Send image to Vision API for label detection
        const labels = await detectLabels(file.buffer);

        if (labels.length === 0) {
            return res.json({
                ...paginatedResponse([], page, limit, 0),
                labels: [],
            });
        }

        // 2. Convert labels to search terms
        const searchTerms = labelsToSearchTerms(labels);

        // 3. Build a MongoDB text-search query from extracted labels
        const regexPatterns = searchTerms.map((term) => ({
            $or: [
                { name: { $regex: term, $options: 'i' } },
                { brand: { $regex: term, $options: 'i' } },
                { description: { $regex: term, $options: 'i' } },
            ],
        }));

        const matchFilter: Record<string, any> = {
            status: 'active',
        };

        if (regexPatterns.length > 0) {
            matchFilter.$or = regexPatterns.flatMap((p) => p.$or);
        }

        // 4. Query products
        const [products, totalItems] = await Promise.all([
            Product.find(matchFilter)
                .select('_id slug name brand price originalPrice rating reviewCount images authenticity category')
                .sort({ rating: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(matchFilter),
        ]);

        // 5. Transform to contract shape
        const data = products.map((p: any) => ({
            id: p._id,
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            price: p.price,
            originalPrice: p.originalPrice,
            rating: p.rating,
            reviewCount: p.reviewCount,
            image: p.images?.[0]?.url || null,
            verified: p.authenticity?.verified || false,
            category: p.category,
        }));

        res.json({
            ...paginatedResponse(data, page, limit, totalItems),
            labels: labels.map((l) => ({
                description: l.description,
                score: parseFloat(l.score.toFixed(2)),
            })),
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/search/semantic — Semantic vector search
// ─────────────────────────────────────────────────────────────────────
export async function semanticSearch(req: Request, res: Response, next: NextFunction) {
    try {
        const queryText = req.query.q as string;
        if (!queryText || queryText.trim().length === 0) {
            throw Errors.badRequest('Query parameter "q" is required for semantic search.');
        }

        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

        // 1. Generate embedding for the query
        const queryEmbedding = await generateEmbedding(queryText);

        // 2. Try MongoDB Atlas $vectorSearch (requires Atlas Vector Search index)
        //    Falls back to text-based search if vector search is not available
        let data: any[] = [];
        let totalItems = 0;

        try {
            const vectorPipeline = [
                {
                    $vectorSearch: {
                        index: 'product_search_index',
                        path: 'searchEmbedding',
                        queryVector: queryEmbedding,
                        numCandidates: limit * 10,
                        limit: limit,
                        filter: { status: 'active' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        id: '$_id',
                        slug: 1,
                        name: 1,
                        brand: 1,
                        price: 1,
                        originalPrice: 1,
                        rating: 1,
                        reviewCount: 1,
                        image: { $arrayElemAt: ['$images.url', 0] },
                        verified: '$authenticity.verified',
                        category: 1,
                        score: { $meta: 'vectorSearchScore' },
                    },
                },
            ];

            data = await Product.aggregate(vectorPipeline);
            totalItems = data.length;
        } catch (vectorErr: any) {
            // $vectorSearch not available (local MongoDB, missing index, etc.)
            // Fall back to regex-based text search
            console.warn('[SemanticSearch] Vector search unavailable, falling back to text search:', vectorErr.message);

            const skip = (page - 1) * limit;
            const fallbackFilter: Record<string, any> = {
                status: 'active',
                $or: [
                    { name: { $regex: queryText, $options: 'i' } },
                    { brand: { $regex: queryText, $options: 'i' } },
                    { description: { $regex: queryText, $options: 'i' } },
                ],
            };

            const [products, count] = await Promise.all([
                Product.find(fallbackFilter)
                    .select('_id slug name brand price originalPrice rating reviewCount images authenticity category')
                    .sort({ rating: -1, createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Product.countDocuments(fallbackFilter),
            ]);

            data = products.map((p: any) => ({
                id: p._id,
                slug: p.slug,
                name: p.name,
                brand: p.brand,
                price: p.price,
                originalPrice: p.originalPrice,
                rating: p.rating,
                reviewCount: p.reviewCount,
                image: p.images?.[0]?.url || null,
                verified: p.authenticity?.verified || false,
                category: p.category,
            }));
            totalItems = count;
        }

        res.json(paginatedResponse(data, page, limit, totalItems));
    } catch (err) {
        next(err);
    }
}
