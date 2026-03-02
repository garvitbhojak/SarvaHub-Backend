import { Router } from 'express';
import multer from 'multer';
import { visualSearch, semanticSearch } from '../controllers/searchController';

// ─── Multer config: in-memory storage for image uploads ─────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
        }
    },
});

const router = Router();

// POST /api/v1/search/visual — Image-based visual search
router.post('/visual', upload.single('image'), visualSearch);

// GET /api/v1/search/semantic — Text-based semantic vector search
router.get('/semantic', semanticSearch);

export default router;
