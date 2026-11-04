import { Router, Request, Response } from 'express';

import financeTerms from '../data/terms-and-conditions.html' with { type: 'text' };
import adultTerms from '../data/terms-and-conditions-adult.html' with { type: 'text' };
import financePrivacy from '../data/privacy-policy.html' with { type: 'text' };
import adultPrivacy from '../data/privacy-policy-adult.html' with { type: 'text' };

type Style = 'finance' | 'adult';

type PageConfig = {
  title: string;
  description: Record<Style, string>;
  files: Record<Style, string>;
  updated: string;
};

const pages: Record<string, PageConfig> = {
  terms: {
    title: 'Terms and Conditions',
    description: {
      finance: 'Rules for using the Brazz Learning app.',
      adult: 'Rules for using Brazz and the Brazz Learning app.',
    },
    files: {
      finance: financeTerms,
      adult: adultTerms,
    },
    updated: '2026-10-09',
  },
  privacy: {
    title: 'Privacy Policy',
    description: {
      finance: 'How Brazz Learning handles device data, notifications, and ads.',
      adult: 'How Brazz Learning handles device data, notifications, and ads.',
    },
    files: {
      finance: financePrivacy,
      adult: adultPrivacy,
    },
    updated: '2026-10-09',
  },
};

const getPage = (req: Request, res: Response) => {
  const slug = String(req.params.slug || '');
  const page = Object.hasOwn(pages, slug) ? pages[slug] : undefined;
  if (!page) {
    return res.status(404).json({ success: false, message: 'Page not found' });
  }

  const style: Style = req.query.style === 'adult' ? 'adult' : 'finance';
  const html = page.files[style];
  const description = page.description[style];

  if (req.query.format === 'html') {
    return res.type('html').send(html);
  }

  return res.status(200).json({
    success: true,
    data: {
      slug,
      style,
      title: page.title,
      description,
      updated: page.updated,
      html,
    },
  });
};

const router = Router();

router.get('/:slug', getPage);

export default router;
