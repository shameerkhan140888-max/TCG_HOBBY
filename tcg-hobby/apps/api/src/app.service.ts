import { Injectable } from '@nestjs/common';
import type { ApiHealth, ProductSummary } from '@tcg-hobby/types';

@Injectable()
export class AppService {
  getHealth(): ApiHealth {
    return { status: 'ok', service: 'tcg-hobby-api' };
  }

  listFeaturedProducts(): ProductSummary[] {
    return [
      {
        id: 'prod_arcane_booster_box',
        name: 'Arcane Booster Box',
        slug: 'arcane-booster-box',
        game: 'Magic: The Gathering',
        price: { amountMinor: 11999, currency: 'GBP' },
        inStock: true,
      },
    ];
  }
}
