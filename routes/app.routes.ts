import { Router, Response } from 'express';
import Joi from 'joi';
import { apiKeyValidation, tokenValidation, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import FinanceService from '../services/app/finance.service';
import AdultService from '../services/app/adult.service';

const router = Router();

const categoryHandler = async (req: AuthRequest, res: Response) => {
    if (req.device?.appStyle === 'adult') {
        return AdultService.getCategories(req, res);
    }
    return FinanceService.getCategories(req, res);
};

const saveCategoryHandler = async (req: AuthRequest, res: Response) => {
    if (req.device?.appStyle === 'adult') {
        return AdultService.saveCategories(req, res);
    }
    return FinanceService.saveCategories(req, res);
};

const getSelectedCategoryHandler = async (req: AuthRequest, res: Response) => {
    if (req.device?.appStyle === 'adult') {
        return AdultService.getSelectedCategories(req, res);
    }
    return FinanceService.getSelectedCategories(req, res);
};

router.get('/categories', apiKeyValidation, tokenValidation, categoryHandler);

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
    saveCategoryHandler
);

router.get(
    '/categories/selected',
    apiKeyValidation,
    tokenValidation,
    getSelectedCategoryHandler
);

export default router;


