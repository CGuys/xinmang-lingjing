import { Router } from 'express';
import { AdController } from '../../controllers/ad.controller';

const router = Router();

router.post('/reward-callback', AdController.rewardCallback);

export default router;
