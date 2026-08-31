import Category from './Category';
import Video from './Video';
import Pornstar from './Pornstar';
import FinanceCategory from './FinanceCategory';
import FinanceVideo from './FinanceVideo';
import FinanceInfluencer from './FinanceInfluencer';

type AppStyle = 'finance' | 'adult';

export function getAppModels(appStyle: AppStyle) {
    return appStyle === 'finance'
        ? {
            Category: FinanceCategory,
            Video: FinanceVideo,
            Influencer: FinanceInfluencer,
            categoryCollection: 'finance_categories',
            videoCollection: 'finance_videos',
        }
        : {
            Category: Category,
            Video: Video,
            Pornstar: Pornstar,
            categoryCollection: 'categories',
            videoCollection: 'videos',
        };
}
