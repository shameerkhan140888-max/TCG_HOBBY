import { Injectable } from '@nestjs/common';
import type { ApiHealth } from '@tcg-hobby/types';

@Injectable()
export class AppService {
  getHealth(): ApiHealth {
    return { status: 'ok', service: 'tcg-hobby-api' };
  }
}
