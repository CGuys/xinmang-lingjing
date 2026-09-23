import { Router } from 'express';
import { ShareController } from '../../controllers/share.controller';
import { requireUserAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/accept', requireUserAuth, ShareController.acceptShare);

export default router;
