import { Router } from 'express';
import { apiKeyValidation, tokenValidation } from '../middleware/auth';
import PornstarService from '../services/pornstar.service';

const router = Router();

router.get('/', apiKeyValidation, tokenValidation, PornstarService.getPornstars);
router.get('/:id/videos', apiKeyValidation, tokenValidation, PornstarService.getPornstarVideos);

export default router;
