import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';

const router = Router();

router.post('/wx-login', AuthController.wxLogin);

export default router;
