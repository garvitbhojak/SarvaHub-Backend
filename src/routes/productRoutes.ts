import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
    createProduct,
    getProducts,
    getProductFilters,
    getProductBySlug,
    updateProduct,
    deleteProduct,
    getSellerProducts,
} from '../controllers/productController';

const router = Router();

// ─── Public Routes ──────────────────────────────────────────────────

// GET /api/v1/products — list with filters & pagination
router.get('/', getProducts);

// GET /api/v1/products/filters — dynamic facets
router.get('/filters', getProductFilters);

// GET /api/v1/products/:slug — single product detail
router.get('/:slug', getProductBySlug);

// ─── Protected: Seller Routes ───────────────────────────────────────

// POST /api/v1/products — create a product
router.post('/', authenticate, authorize('seller'), createProduct);

// GET /api/v1/products/seller/me — seller's own products
router.get('/seller/me', authenticate, authorize('seller'), getSellerProducts);

// PUT /api/v1/products/:id — update product
router.put('/:id', authenticate, authorize('seller'), updateProduct);

// DELETE /api/v1/products/:id — soft-delete product
router.delete('/:id', authenticate, authorize('seller'), deleteProduct);

export default router;
