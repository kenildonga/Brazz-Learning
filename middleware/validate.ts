import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.body || {});
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message.replace(/"/g, ''),
            });
        }
        req.body = value;
        next();
    };
};
