import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PublicCommerceController } from './public-commerce.controller.js';
import { PublicCommerceService } from './public-commerce.service.js';

@Module({
  imports: [],
  controllers: [AppController, AuthController, PublicCommerceController],
  providers: [AppService, AuthService, PublicCommerceService],
})
export class AppModule {}
