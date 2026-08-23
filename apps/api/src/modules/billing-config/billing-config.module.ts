import { Module } from '@nestjs/common';
import { BillingConfigController } from './billing-config.controller';
import { BillingConfigService } from './billing-config.service';

@Module({
  controllers: [BillingConfigController],
  providers: [BillingConfigService],
  exports: [BillingConfigService],
})
export class BillingConfigModule {}
