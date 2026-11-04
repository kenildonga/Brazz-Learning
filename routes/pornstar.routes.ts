import { Router } from 'express';
import { apiKeyValidation, tokenValidation } from '../middleware/auth';
import PornstarService from '../services/pornstar.service';

const router = Router();

const guard = [apiKeyValidation, tokenValidation];

router.get('/', ...guard, PornstarService.getPornstars);
router.get('/:id/videos', ...guard, PornstarService.getPornstarVideos);

export default router;
