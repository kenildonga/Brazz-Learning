import { readFileSync } from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';

const dataDir = path.join(__dirname, '..', 'data');

type Style = 'finance' | 'adult';

type PageConfig = {
  title: string;
  description: Record<Style, string> | string;
  files: Partial<Record<Style, string>> & { adult?: string; finance?: string };
  styles: Style[];
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
      finance: 'terms-and-conditions.html',
      adult: 'terms-and-conditions-adult.html',
    },
    styles: ['finance', 'adult'],
    updated: '2026-10-09',
  },
  privacy: {
    title: 'Privacy Policy',
    description: {
      finance: 'How Brazz Learning handles device data, notifications, and ads.',
      adult: 'How Brazz Learning handles device data, notifications, and ads.',
    },
    files: {
      finance: 'privacy-policy.html',
      adult: 'privacy-policy-adult.html',
    },
    styles: ['finance', 'adult'],
    updated: '2026-10-09',
  },
};

const resolveStyle = (page: PageConfig, requested: unknown): Style | null => {
  const style = requested === 'adult' ? 'adult' : 'finance';
  if (page.styles.includes(style)) return style;
  if (page.styles.includes('adult')) return 'adult';
  return page.styles[0] ?? null;
};

const getPage = (req: Request, res: Response) => {
  const slug = String(req.params.slug || '');
  const page = pages[slug];
  if (!page) {
    return res.status(404).json({ success: false, message: 'Page not found' });
  }

  const style = resolveStyle(page, req.query.style);
  if (!style) {
    return res.status(404).json({ success: false, message: 'Page not found' });
  }

  const file = page.files[style];
  if (!file) {
    return res.status(404).json({ success: false, message: 'Page not found' });
  }

  const html = readFileSync(path.join(dataDir, file), 'utf8');
  const description =
    typeof page.description === 'string' ? page.description : page.description[style];

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
