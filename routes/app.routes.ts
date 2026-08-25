import { Router, Response } from 'express';
import Joi from 'joi';
import { apiKeyValidation, tokenValidation, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import FinanceService from '../services/app/finance.service';
import AdultService from '../services/app/adult.service';

const router = Router();

const handle = (method: keyof typeof AdultService) => (req: AuthRequest, res: Response) => {
    const service = req.device?.appStyle === 'adult' ? AdultService : FinanceService;
    return service[method](req, res);
};

router.get('/categories', apiKeyValidation, tokenValidation, handle('getCategories'));

router.post(
    '/categories/save',
    apiKeyValidation,
    tokenValidation,
    validate(
        Joi.object({
            categoryId: Joi.string().required(),
            isSave: Joi.boolean().required(),
        })
    ),
    handle('saveCategories')
);

router.get(
    '/categories/saved',
    apiKeyValidation,
    tokenValidation,
    handle('getSavedCategories')
);

export default router;


