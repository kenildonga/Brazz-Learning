import { Router } from 'express';
import Joi from 'joi';
import { apiKeyValidation, tokenValidation } from '../middleware/auth';
import { validate } from '../middleware/validate';
import CategoryService from '../services/category.service';

const router = Router();

const guard = [apiKeyValidation, tokenValidation];

router.get('/', ...guard, CategoryService.getCategories);

router.post(
  '/save',
  ...guard,
  validate(
    Joi.object({
      categoryId: Joi.string().required(),
      isSave: Joi.boolean().required(),
    }),
  ),
  CategoryService.saveCategories,
);

router.get('/saved', ...guard, CategoryService.getSavedCategories);

export default router;
