import { Request, Response } from 'express';
import Contact from '../models/Contact';

class ContactService {
  create = async (req: Request, res: Response) => {
    try {
      const { name, email, topic, message, appStyle } = req.body as {
        name: string;
        email: string;
        topic: string;
        message: string;
        appStyle?: 'finance' | 'adult';
      };

      const contact = await Contact.create({
        name,
        email,
        topic,
        message,
        appStyle: appStyle === 'adult' ? 'adult' : 'finance',
      });

      return res.status(201).json({
        success: true,
        message: 'Message received',
        data: {
          id: contact._id,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  };
}

export default new ContactService();
