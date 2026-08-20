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
            deviceUnieqId: Joi.string().required(),
            pushToken: Joi.string().required(),
        })
    ),
    DeviceController.register
);

export default router;
