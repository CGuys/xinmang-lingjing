import { Router } from 'express';
import { UserController } from '../../controllers/user.controller';
import { requireUserAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/profile', requireUserAuth, UserController.getProfile);

export default router;
