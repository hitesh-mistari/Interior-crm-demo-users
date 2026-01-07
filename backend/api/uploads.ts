import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '..'); // Assuming api/uploads.ts, so .. goes to backend root

// Ensure upload directory exists
const uploadDir = path.join(backendRoot, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `photo-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    },
});

interface MulterRequest extends express.Request {
    file?: Express.Multer.File;
}

// Manual handling with upload.any() to be more robust like expenses.ts
router.post('/upload', (req: express.Request, res: express.Response) => {
    upload.any()(req, res, (err: any) => {
        if (err) {
            console.error('Upload middleware error:', err);
            return res.status(400).json({ error: err.message || 'File upload failed' });
        }

        console.log('Upload request received');
        const files = (req as any).files;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = files[0];

        // Construct URL
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        console.log('File uploaded successfully:', fileUrl);

        res.json({ url: fileUrl });
    });
});

export default router;
