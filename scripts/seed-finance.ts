import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';
import connectDB from '../config/db';
import FinanceCategory from '../models/FinanceCategory';
import FinanceInfluencer from '../models/FinanceInfluencer';
import FinanceVideo from '../models/FinanceVideo';

dotenv.config({ quiet: true });

const CATEGORIES = [
    { slug: 'temp-stocks', name: 'Stocks' },
    { slug: 'temp-crypto', name: 'Crypto' },
    { slug: 'temp-personal-finance', name: 'Personal Finance' },
    { slug: 'temp-retirement', name: 'Retirement' },
    { slug: 'temp-real-estate', name: 'Real Estate' },
    { slug: 'temp-etfs', name: 'ETFs' },
    { slug: 'temp-options', name: 'Options' },
    { slug: 'temp-taxes', name: 'Taxes' },
] as const;

const INFLUENCERS = [
    { slug: 'temp-alex-chen', name: 'Alex Chen' },
    { slug: 'temp-jordan-blake', name: 'Jordan Blake' },
    { slug: 'temp-samira-patel', name: 'Samira Patel' },
    { slug: 'temp-marcus-owens', name: 'Marcus Owens' },
    { slug: 'temp-nina-volkov', name: 'Nina Volkov' },
    { slug: 'temp-chris-delgado', name: 'Chris Delgado' },
    { slug: 'temp-priya-sharma', name: 'Priya Sharma' },
    { slug: 'temp-eli-thompson', name: 'Eli Thompson' },
] as const;

type VideoSeed = {
    slug: string;
    title: string;
    duration: number;
    description: string;
    categorySlugs: string[];
    influencerSlugs: string[];
};

const VIDEOS: VideoSeed[] = [
    {
        slug: 'temp-index-funds-for-beginners',
        title: 'Index Funds for Beginners',
        duration: 720,
        description: 'How broad-market index funds work and why they are a common starting point.',
        categorySlugs: ['temp-etfs', 'temp-personal-finance'],
        influencerSlugs: ['temp-alex-chen'],
    },
    {
        slug: 'temp-stock-market-basics',
        title: 'Stock Market Basics in 12 Minutes',
        duration: 680,
        description: 'Shares, exchanges, and what a ticker actually represents.',
        categorySlugs: ['temp-stocks'],
        influencerSlugs: ['temp-jordan-blake', 'temp-alex-chen'],
    },
    {
        slug: 'temp-bitcoin-vs-ethereum',
        title: 'Bitcoin vs Ethereum: What Actually Differs',
        duration: 840,
        description: 'A practical comparison of two major crypto networks without the hype.',
        categorySlugs: ['temp-crypto'],
        influencerSlugs: ['temp-nina-volkov'],
    },
    {
        slug: 'temp-emergency-fund-first',
        title: 'Build an Emergency Fund Before You Invest',
        duration: 540,
        description: 'Why cash reserves come first and how many months of expenses to target.',
        categorySlugs: ['temp-personal-finance'],
        influencerSlugs: ['temp-samira-patel'],
    },
    {
        slug: 'temp-roth-ira-walkthrough',
        title: 'Roth IRA Walkthrough for 2026',
        duration: 900,
        description: 'Contribution limits, eligibility, and when a Roth IRA usually makes sense.',
        categorySlugs: ['temp-retirement', 'temp-taxes'],
        influencerSlugs: ['temp-marcus-owens'],
    },
    {
        slug: 'temp-house-hacking-intro',
        title: 'House Hacking: A First Rental Strategy',
        duration: 960,
        description: 'Using a primary residence to offset housing costs and start investing in property.',
        categorySlugs: ['temp-real-estate'],
        influencerSlugs: ['temp-chris-delgado'],
    },
    {
        slug: 'temp-etf-vs-mutual-fund',
        title: 'ETF vs Mutual Fund: Cost and Tax Differences',
        duration: 610,
        description: 'Expense ratios, trading, and tax efficiency for long-term holders.',
        categorySlugs: ['temp-etfs', 'temp-taxes'],
        influencerSlugs: ['temp-priya-sharma'],
    },
    {
        slug: 'temp-covered-calls-explained',
        title: 'Covered Calls Explained Simply',
        duration: 780,
        description: 'How covered calls generate income and the trade-offs if the stock rallies.',
        categorySlugs: ['temp-options', 'temp-stocks'],
        influencerSlugs: ['temp-eli-thompson'],
    },
    {
        slug: 'temp-dollar-cost-averaging',
        title: 'Dollar-Cost Averaging vs Lump Sum',
        duration: 520,
        description: 'When spreading purchases over time helps, and when it does not.',
        categorySlugs: ['temp-personal-finance', 'temp-stocks'],
        influencerSlugs: ['temp-alex-chen', 'temp-samira-patel'],
    },
    {
        slug: 'temp-401k-match',
        title: 'Never Leave a 401(k) Match on the Table',
        duration: 430,
        description: 'How employer matching works and why it is often the highest-return first dollar.',
        categorySlugs: ['temp-retirement'],
        influencerSlugs: ['temp-marcus-owens', 'temp-priya-sharma'],
    },
    {
        slug: 'temp-crypto-wallet-safety',
        title: 'Crypto Wallet Safety Checklist',
        duration: 700,
        description: 'Hot vs cold storage, seed phrases, and common phishing patterns.',
        categorySlugs: ['temp-crypto'],
        influencerSlugs: ['temp-nina-volkov', 'temp-jordan-blake'],
    },
    {
        slug: 'temp-capital-gains-basics',
        title: 'Capital Gains Tax Basics',
        duration: 640,
        description: 'Short-term vs long-term gains and how holding periods change the bill.',
        categorySlugs: ['temp-taxes'],
        influencerSlugs: ['temp-priya-sharma'],
    },
    {
        slug: 'temp-reit-overview',
        title: 'REITs vs Owning a Rental Property',
        duration: 810,
        description: 'Liquidity, leverage, and what you actually own with a REIT.',
        categorySlugs: ['temp-real-estate', 'temp-etfs'],
        influencerSlugs: ['temp-chris-delgado'],
    },
    {
        slug: 'temp-reading-a-10k',
        title: 'How to Skim a 10-K Without Getting Lost',
        duration: 1100,
        description: 'The sections that matter first: business, risk factors, and cash flow.',
        categorySlugs: ['temp-stocks'],
        influencerSlugs: ['temp-jordan-blake'],
    },
    {
        slug: 'temp-budget-that-sticks',
        title: 'A Budget That Survives a Busy Month',
        duration: 480,
        description: 'A simple three-bucket setup for spending, saving, and investing.',
        categorySlugs: ['temp-personal-finance'],
        influencerSlugs: ['temp-eli-thompson', 'temp-samira-patel'],
    },
    {
        slug: 'temp-options-greeks-intro',
        title: 'Delta and Theta: The Two Greeks to Learn First',
        duration: 870,
        description: 'Price sensitivity and time decay without a full options textbook.',
        categorySlugs: ['temp-options'],
        influencerSlugs: ['temp-eli-thompson', 'temp-nina-volkov'],
    },
];

type UpsertCounts = { inserted: number; updated: number };

const emptyCounts = (): UpsertCounts => ({ inserted: 0, updated: 0 });

const recordUpsert = (counts: UpsertCounts, wasInsert: boolean) => {
    if (wasInsert) {
        counts.inserted += 1;
    } else {
        counts.updated += 1;
    }
};

const upsertBySlug = async <T extends { _id: Types.ObjectId }>(
    model: mongoose.Model<T>,
    slug: string,
    data: Record<string, unknown>,
    counts: UpsertCounts,
): Promise<T> => {
    const existing = await model.exists({ slug });
    const doc = await model.findOneAndUpdate({ slug }, { $set: data }, { upsert: true, new: true });
    if (!doc) {
        throw new Error(`Failed to upsert ${model.modelName} slug=${slug}`);
    }
    recordUpsert(counts, !existing);
    return doc;
};

const idsForSlugs = (slugs: string[], map: Map<string, Types.ObjectId>) =>
    slugs.map((slug) => {
        const id = map.get(slug);
        if (!id) {
            throw new Error(`Missing referenced slug: ${slug}`);
        }
        return id;
    });

const seed = async () => {
    await connectDB();

    const categoryCounts = emptyCounts();
    const influencerCounts = emptyCounts();
    const videoCounts = emptyCounts();

    const categoryIds = new Map<string, Types.ObjectId>();
    for (const category of CATEGORIES) {
        const doc = await upsertBySlug(FinanceCategory, category.slug, { name: category.name }, categoryCounts);
        categoryIds.set(category.slug, doc._id);
    }

    const influencerIds = new Map<string, Types.ObjectId>();
    for (const influencer of INFLUENCERS) {
        const doc = await upsertBySlug(FinanceInfluencer, influencer.slug, { name: influencer.name }, influencerCounts);
        influencerIds.set(influencer.slug, doc._id);
    }

    for (const video of VIDEOS) {
        await upsertBySlug(
            FinanceVideo,
            video.slug,
            {
                scrappedSlug: video.slug,
                movieId: video.slug,
                title: video.title,
                duration: video.duration,
                thumbnail: `https://picsum.photos/seed/${video.slug}/640/360`,
                description: video.description,
                metaTitle: video.title,
                metaDescription: video.description,
                categoryIds: idsForSlugs(video.categorySlugs, categoryIds),
                influencerIds: idsForSlugs(video.influencerSlugs, influencerIds),
            },
            videoCounts,
        );
    }

    console.log('Finance seed complete');
    console.log(`Categories: ${categoryCounts.inserted} inserted, ${categoryCounts.updated} updated`);
    console.log(`Influencers: ${influencerCounts.inserted} inserted, ${influencerCounts.updated} updated`);
    console.log(`Videos: ${videoCounts.inserted} inserted, ${videoCounts.updated} updated`);
};

seed()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
