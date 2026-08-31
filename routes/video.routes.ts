import { Router } from 'express';
import { apiKeyValidation, tokenValidation } from '../middleware/auth';
import VideoService from '../services/video.service';

const router = Router();

router.get('/', apiKeyValidation, tokenValidation, VideoService.getVideos);
router.get('/:id', apiKeyValidation, tokenValidation, VideoService.getVideo);

export default router;
