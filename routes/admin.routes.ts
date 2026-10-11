import { Router } from 'express';
import Joi from 'joi';
import { adminTokenValidation, apiKeyValidation, requireAppStyle } from '../middleware/auth';
import { validate } from '../middleware/validate';
import AdminAdsService from '../services/admin/ads.service';
import AdminAuthService from '../services/admin/auth.service';
import AdminContentService from '../services/admin/content.service';
import AdminDeviceService from '../services/admin/device.service';
import AdminReelService from '../services/admin/reel.service';
import AdminStatsService from '../services/admin/stats.service';

const router = Router();

const adFormats = Joi.object({
  banner: Joi.number().valid(0, 1).required(),
  native: Joi.number().valid(0, 1).required(),
  interstitial: Joi.number().valid(0, 1).required(),
  rewards: Joi.number().valid(0, 1).required(),
});

const namedSchema = Joi.object({
  slug: Joi.string().trim().min(1).required(),
  name: Joi.string().trim().min(1).required(),
});

const videoSchema = Joi.object({
  slug: Joi.string().trim().min(1).required(),
  scrappedSlug: Joi.string().trim().min(1).required(),
  movieId: Joi.string().trim().min(1).required(),
  title: Joi.string().trim().min(1).required(),
  duration: Joi.number().min(0).allow(null),
  thumbnail: Joi.string().trim().allow(''),
  description: Joi.string().allow(''),
  metaTitle: Joi.string().allow(''),
  metaDescription: Joi.string().allow(''),
  categoryIds: Joi.array().items(Joi.string().trim()).default([]),
  influencerIds: Joi.array().items(Joi.string().trim()),
  pornstarIds: Joi.array().items(Joi.string().trim()),
});

const reelUserSchema = Joi.object({
  id: Joi.string().trim().allow(''),
  username: Joi.string().trim().allow(''),
  displayName: Joi.string().trim().allow(''),
  avatar: Joi.string().trim().allow('', null),
  verified: Joi.boolean(),
});

const reelSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().allow(''),
  videoUrl: Joi.string().trim().allow(''),
  thumbnailUrl: Joi.string().trim().allow(''),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  duration: Joi.number().min(0),
  width: Joi.number().allow(null),
  height: Joi.number().allow(null),
  userId: Joi.string().trim().allow(''),
  user: reelUserSchema.required(),
});

const guard = [apiKeyValidation, adminTokenValidation];
const styled = [...guard, requireAppStyle];

router.post(
  '/auth/login',
  apiKeyValidation,
  validate(
    Joi.object({
      email: Joi.string().trim().email().required(),
      password: Joi.string().required(),
    }),
  ),
  AdminAuthService.login,
);

router.get('/auth/me', ...guard, AdminAuthService.me);
router.put(
  '/auth/me',
  ...guard,
  validate(
    Joi.object({
      name: Joi.string().trim().min(1).required(),
      email: Joi.string().trim().email().required(),
    }),
  ),
  AdminAuthService.updateProfile,
);
router.post(
  '/auth/change-password',
  ...guard,
  validate(
    Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    }),
  ),
  AdminAuthService.changePassword,
);

router.get('/stats', ...styled, AdminStatsService.get);

router.get('/categories', ...styled, AdminContentService.listCategories);
router.post('/categories', ...styled, validate(namedSchema), AdminContentService.createCategory);
router.put('/categories/:id', ...styled, validate(namedSchema), AdminContentService.updateCategory);
router.delete('/categories/:id', ...styled, AdminContentService.deleteCategory);

router.get('/people', ...styled, AdminContentService.listPeople);
router.post('/people', ...styled, validate(namedSchema), AdminContentService.createPerson);
router.put('/people/:id', ...styled, validate(namedSchema), AdminContentService.updatePerson);
router.delete('/people/:id', ...styled, AdminContentService.deletePerson);

router.get('/videos', ...styled, AdminContentService.listVideos);
router.post('/videos', ...styled, validate(videoSchema), AdminContentService.createVideo);
router.get('/videos/:id', ...styled, AdminContentService.getVideo);
router.put('/videos/:id', ...styled, validate(videoSchema), AdminContentService.updateVideo);
router.delete('/videos/:id', ...styled, AdminContentService.deleteVideo);

router.get('/devices', ...guard, AdminDeviceService.list);
router.put(
  '/devices/:id',
  ...guard,
  validate(
    Joi.object({
      appStyle: Joi.string().valid('finance', 'adult').required(),
    }),
  ),
  AdminDeviceService.update,
);

router.get('/settings/ads', ...guard, AdminAdsService.get);
router.put(
  '/settings/ads',
  ...guard,
  validate(
    Joi.object({
      adCodeType: Joi.number().valid(1, 2, 3).required(),
      enabled: Joi.boolean().required(),
      googleAds: adFormats.required(),
      unityAds: adFormats.required(),
      metaAds: adFormats.required(),
      updatedAt: Joi.string().optional(),
    }),
  ),
  AdminAdsService.update,
);

router.get(
  '/reels/stream',
  (req, _res, next) => {
    if (!req.header('token') && typeof req.query.token === 'string') {
      req.headers.token = req.query.token;
    }
    if (!req.header('api-key') && typeof req.query.apiKey === 'string') {
      req.headers['api-key'] = req.query.apiKey;
    }
    next();
  },
  ...guard,
  AdminReelService.stream,
);
router.get('/reels', ...styled, AdminReelService.list);
router.post('/reels', ...styled, validate(reelSchema), AdminReelService.create);
router.put('/reels/:id', ...styled, validate(reelSchema), AdminReelService.update);

export default router;
