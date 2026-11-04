import { Router } from 'express';
import { apiKeyValidation, tokenValidation } from '../middleware/auth';
import VideoService from '../services/video.service';

const router = Router();

const guard = [apiKeyValidation, tokenValidation];

router.get('/', ...guard, VideoService.getVideos);
router.get('/search', ...guard, VideoService.searchVideos);
router.get('/reels', ...guard, VideoService.getReels);
router.get('/:id', ...guard, VideoService.getVideo);

export default router;
