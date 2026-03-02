import { Request, Response, NextFunction } from 'express';
import { Product } from '../models';
import { QrCodeService } from '../services/qrCodeService';
import { generateSlug } from '../utils/slugify';
import { AppError, Errors } from '../utils/errors';
import { paginatedResponse } from '../utils/pagination';
import {
    buildProductFilterPipeline,
    formatProductAggregationResult,
    ProductQueryParams,
} from '../utils/productAggregation';
import { config } from '../config';

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/products — Create a new product (Seller only)
// ─────────────────────────────────────────────────────────────────────
export async function createProduct(req: Request, res: Response, next: NextFunction) {
    try {
        const sellerId = req.user!.id;
        const body = req.body;

        // 1. Generate a unique slug from the product name
        if (!body.name) {
            throw Errors.badRequest('Product name is required.');
        }
        const slug = generateSlug(body.name);

        // 2. Build product data
        const productData: Record<string, any> = {
            ...body,
            slug,
            seller: sellerId,
            // Ensure prices are integers (paisa)
            price: parseInt(String(body.price), 10),
            originalPrice: body.originalPrice
                ? parseInt(String(body.originalPrice), 10)
                : parseInt(String(body.price), 10),
        };

        // 3. Calculate discount percentage if originalPrice is provided
        if (productData.originalPrice && productData.originalPrice > productData.price) {
            productData.discount = Math.round(
                ((productData.originalPrice - productData.price) / productData.originalPrice) * 100
            );
        }

        // 4. Create the product first to get the generated _id
        const product = new Product(productData);
        await product.save();

        // 5. Generate QR Code asynchronously and update the product
        const productUrl = `${config.frontendUrl}/products/${slug}`;
        try {
            const qrCodeUrl = await QrCodeService.generateAndUpload(product._id, productUrl);
            product.qrCodeUrl = qrCodeUrl;
            await product.save();
        } catch (qrErr) {
            // QR generation is non-critical — log but don't fail the request
            console.error('QR Code generation failed:', qrErr);
        }

        // 6. Generate a simple text embedding placeholder
        //    (Will be replaced with real embedding service in Step 2)
        try {
            const textForEmbedding = `${body.name} ${body.brand || ''} ${body.description || ''} ${(body.features || []).join(' ')}`;
            const simpleEmbedding = generateSimpleEmbedding(textForEmbedding);
            await Product.updateOne(
                { _id: product._id },
                { $set: { searchEmbedding: simpleEmbedding } }
            );
        } catch (embErr) {
            console.error('Embedding generation failed:', embErr);
        }

        // 7. Return the created product
        const created = await Product.findById(product._id);
        res.status(201).json(created!.toJSON());
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/products — List products with filters & pagination
// ─────────────────────────────────────────────────────────────────────
export async function getProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const query: ProductQueryParams = req.query as any;
        const { pipeline, page, limit } = buildProductFilterPipeline(query);

        const result = await Product.aggregate(pipeline);
        const { data, totalItems, filters } = formatProductAggregationResult(result);

        res.json({
            ...paginatedResponse(data, page, limit, totalItems),
            filters,
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/products/filters — Dynamic facets for filtering UI
// ─────────────────────────────────────────────────────────────────────
export async function getProductFilters(req: Request, res: Response, next: NextFunction) {
    try {
        const query: ProductQueryParams = {
            category: req.query.category as string | undefined,
        };

        const { pipeline } = buildProductFilterPipeline(query);
        const result = await Product.aggregate(pipeline);
        const { filters } = formatProductAggregationResult(result);

        res.json({ filters });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/products/:slug — Get single product by slug
// ─────────────────────────────────────────────────────────────────────
export async function getProductBySlug(req: Request, res: Response, next: NextFunction) {
    try {
        const { slug } = req.params;

        const product = await Product.findOne({ slug });
        if (!product) {
            throw Errors.notFound('Product');
        }

        res.json(product.toJSON());
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// PUT /api/v1/products/:id — Update product (Seller, owner only)
// ─────────────────────────────────────────────────────────────────────
export async function updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const sellerId = req.user!.id;

        const product = await Product.findById(id);
        if (!product) {
            throw Errors.notFound('Product');
        }

        // Verify ownership
        if (product.seller !== sellerId) {
            throw Errors.forbidden('You can only update your own products.');
        }

        // Prevent overwriting protected fields
        const { _id, seller, slug, createdAt, ...updateData } = req.body;

        // Recalculate discount if price fields are being updated
        if (updateData.price || updateData.originalPrice) {
            const newPrice = updateData.price
                ? parseInt(String(updateData.price), 10)
                : product.price;
            const newOriginal = updateData.originalPrice
                ? parseInt(String(updateData.originalPrice), 10)
                : product.originalPrice;

            if (updateData.price) updateData.price = newPrice;
            if (updateData.originalPrice) updateData.originalPrice = newOriginal;

            if (newOriginal > newPrice) {
                updateData.discount = Math.round(
                    ((newOriginal - newPrice) / newOriginal) * 100
                );
            } else {
                updateData.discount = 0;
            }
        }

        const updated = await Product.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json(updated!.toJSON());
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/v1/products/:id — Soft-delete product (Seller, owner)
// ─────────────────────────────────────────────────────────────────────
export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const sellerId = req.user!.id;

        const product = await Product.findById(id);
        if (!product) {
            throw Errors.notFound('Product');
        }

        // Verify ownership
        if (product.seller !== sellerId) {
            throw Errors.forbidden('You can only delete your own products.');
        }

        // Soft delete — set status to draft
        product.status = 'draft';
        await product.save();

        res.json({ message: 'Product has been deactivated.' });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/products/seller — Get seller's own products
// ─────────────────────────────────────────────────────────────────────
export async function getSellerProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const sellerId = req.user!.id;
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const skip = (page - 1) * limit;
        const status = req.query.status as string | undefined;

        const filter: Record<string, any> = { seller: sellerId };
        if (status) filter.status = status;

        const [products, totalItems] = await Promise.all([
            Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Product.countDocuments(filter),
        ]);

        res.json(paginatedResponse(
            products.map((p) => p.toJSON()),
            page,
            limit,
            totalItems
        ));
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// Helper: Simple text embedding (placeholder for real embedding service)
// ─────────────────────────────────────────────────────────────────────
function generateSimpleEmbedding(text: string): number[] {
    // Simple bag-of-characters hash embedding (128-dim placeholder)
    // This will be replaced with a real embedding model in Step 2
    const dim = 128;
    const embedding = new Array(dim).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const words = normalized.split(/\s+/).filter(Boolean);

    for (const word of words) {
        for (let i = 0; i < word.length; i++) {
            const charCode = word.charCodeAt(i);
            const idx = (charCode * (i + 1)) % dim;
            embedding[idx] += 1;
        }
    }

    // L2 normalize
    const magnitude = Math.sqrt(embedding.reduce((sum: number, v: number) => sum + v * v, 0));
    if (magnitude > 0) {
        for (let i = 0; i < dim; i++) {
            embedding[i] = parseFloat((embedding[i] / magnitude).toFixed(6));
        }
    }

    return embedding;
}
