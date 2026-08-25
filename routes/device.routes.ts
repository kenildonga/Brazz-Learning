import { Router } from 'express';
import Joi from 'joi';
import DeviceController from '../services/device.service';
import { validate } from '../middleware/validate';
import { apiKeyValidation } from '../middleware/auth';

const router = Router();

router.post(
    '/register',
    apiKeyValidation,
    validate(
        Joi.object({
            deviceUniqueId: Joi.string().required(),
            appUniqueId: Joi.string().required(),
            pushToken: Joi.string().allow(null, '').optional(),
        })
    ),
    DeviceController.register
);

export default router;
