import { Router } from 'express';
import Joi from 'joi';
import { apiKeyValidation, tokenValidation } from '../middleware/auth';
import { validate } from '../middleware/validate';
import CategoryService from '../services/category.service';

const router = Router();

router.get('/', apiKeyValidation, tokenValidation, CategoryService.getCategories);

router.post(
    '/save',
    apiKeyValidation,
    tokenValidation,
    validate(
        Joi.object({
            categoryId: Joi.string().required(),
            isSave: Joi.boolean().required(),
        })
    ),
    CategoryService.saveCategories
);

router.get(
    '/saved',
    apiKeyValidation,
    tokenValidation,
    CategoryService.getSavedCategories
);

export default router;
