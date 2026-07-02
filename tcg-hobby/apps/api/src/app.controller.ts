import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller('v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('catalogue/featured')
  getFeaturedProducts() {
    return this.appService.listFeaturedProducts();
  }
}
