import { Router } from 'express';
import Joi from 'joi';
import ContactService from '../services/contact.service';
import { validate } from '../middleware/validate';
import { apiKeyValidation } from '../middleware/auth';

const router = Router();

router.post(
  '/',
  apiKeyValidation,
  validate(
    Joi.object({
      name: Joi.string().trim().min(1).max(120).required(),
      email: Joi.string().trim().email().required(),
      topic: Joi.string().trim().min(1).max(80).required(),
      message: Joi.string().trim().min(1).max(5000).required(),
      appStyle: Joi.string().valid('finance', 'adult').optional(),
    }),
  ),
  ContactService.create,
);

export default router;
