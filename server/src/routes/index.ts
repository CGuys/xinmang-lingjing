import { Router } from 'express';
import authRoutes from './v1/auth.routes';
import userRoutes from './v1/user.routes';
import shareRoutes from './v1/share.routes';
import tarotRoutes from './v1/tarot.routes';
import adRoutes from './v1/ad.routes';
import adminRoutes from './v1/admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/share', shareRoutes);
router.use('/tarot', tarotRoutes);
router.use('/ad', adRoutes);
router.use('/admin', adminRoutes);

export default router;
