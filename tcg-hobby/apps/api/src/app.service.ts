import { Injectable } from '@nestjs/common';
import type { ApiHealth } from '@capital-hobby/types';

@Injectable()
export class AppService {
  getHealth(): ApiHealth {
    return { status: 'ok', service: 'capital-hobby-api' };
  }
}
