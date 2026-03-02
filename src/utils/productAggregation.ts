import { PipelineStage } from 'mongoose';

/**
 * Query parameters matching the GET /products contract.
 */
export interface ProductQueryParams {
    q?: string;
    category?: string;
    brand?: string;
    minPrice?: string | number;
    maxPrice?: string | number;
    rating?: string | number;
    verified?: string | boolean;
    sort?: string;
    page?: string | number;
    limit?: string | number;
    imageRef?: string;
}

/**
 * Builds the MongoDB aggregation pipeline for GET /products.
 *
 * Returns a $facet pipeline that produces:
 * - data[]: paginated product list (projected to the contract's list shape)
 * - totalCount: total matching documents
 * - filters: { availableCategories, availableBrands, priceRange }
 */
export function buildProductFilterPipeline(query: ProductQueryParams) {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    // ── $match stage ────────────────────────────────────────────────
    const matchStage: Record<string, any> = {
        status: 'active',
    };

    // Full-text search on name, brand, description
    if (query.q) {
        matchStage.$or = [
            { name: { $regex: query.q, $options: 'i' } },
            { brand: { $regex: query.q, $options: 'i' } },
            { description: { $regex: query.q, $options: 'i' } },
        ];
    }

    // Category filter (matches by category slug via lookup, or direct category ID)
    if (query.category) {
        matchStage.category = query.category;
    }

    // Brand filter
    if (query.brand) {
        matchStage.brand = { $regex: `^${query.brand}$`, $options: 'i' };
    }

    // Price range (paisa integers)
    if (query.minPrice || query.maxPrice) {
        matchStage.price = {};
        if (query.minPrice) {
            matchStage.price.$gte = parseInt(String(query.minPrice), 10);
        }
        if (query.maxPrice) {
            matchStage.price.$lte = parseInt(String(query.maxPrice), 10);
        }
    }

    // Minimum rating
    if (query.rating) {
        matchStage.rating = { $gte: parseFloat(String(query.rating)) };
    }

    // Authenticity verified filter
    if (query.verified === true || query.verified === 'true') {
        matchStage['authenticity.verified'] = true;
    }

    // ── $sort stage ─────────────────────────────────────────────────
    let sortStage: Record<string, 1 | -1> = { createdAt: -1 }; // default: newest

    switch (query.sort) {
        case 'price_asc':
            sortStage = { price: 1 };
            break;
        case 'price_desc':
            sortStage = { price: -1 };
            break;
        case 'rating':
            sortStage = { rating: -1 };
            break;
        case 'newest':
            sortStage = { createdAt: -1 };
            break;
        case 'recommended':
        default:
            // Recommended: verified first, then by rating, then newest
            sortStage = { 'authenticity.verified': -1, rating: -1, createdAt: -1 } as any;
            break;
    }

    // ── Project stage for list view (contract shape) ────────────────
    const projectStage = {
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
    };

    // ── Lookup category name for the response ───────────────────────
    const categoryLookupStage: PipelineStage = {
        $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: '_categoryDoc',
        },
    };

    const addCategoryNameStage: PipelineStage = {
        $addFields: {
            category: {
                $ifNull: [
                    { $arrayElemAt: ['$_categoryDoc.name', 0] },
                    '$category',
                ],
            },
        },
    };

    // ── Build the full pipeline ─────────────────────────────────────
    const pipeline: PipelineStage[] = [
        { $match: matchStage },
        categoryLookupStage,
        addCategoryNameStage,
        {
            $facet: {
                // Paginated data
                data: [
                    { $sort: sortStage },
                    { $skip: skip },
                    { $limit: limit },
                    { $project: projectStage },
                ],
                // Total count for pagination
                totalCount: [{ $count: 'count' }],
                // Dynamic filters / facets
                availableCategories: [
                    { $group: { _id: '$category' } },
                    { $project: { _id: 0, name: '$_id' } },
                    { $sort: { name: 1 } },
                ],
                availableBrands: [
                    { $group: { _id: '$brand' } },
                    { $project: { _id: 0, name: '$_id' } },
                    { $sort: { name: 1 } },
                ],
                priceRange: [
                    {
                        $group: {
                            _id: null,
                            min: { $min: '$price' },
                            max: { $max: '$price' },
                        },
                    },
                    { $project: { _id: 0, min: 1, max: 1 } },
                ],
            },
        },
    ];

    return { pipeline, page, limit };
}

/**
 * Transforms the raw aggregation result into the contract response shape.
 */
export function formatProductAggregationResult(result: any[]) {
    const facets = result[0] || {};

    const data = facets.data || [];
    const totalItems = facets.totalCount?.[0]?.count || 0;

    const filters = {
        availableCategories: (facets.availableCategories || []).map((c: any) => c.name).filter(Boolean),
        availableBrands: (facets.availableBrands || []).map((b: any) => b.name).filter(Boolean),
        priceRange: facets.priceRange?.[0] || { min: 0, max: 0 },
    };

    return { data, totalItems, filters };
}
