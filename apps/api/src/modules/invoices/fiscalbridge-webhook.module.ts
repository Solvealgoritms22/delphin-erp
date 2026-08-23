import { Module } from '@nestjs/common';
import { FiscalbridgeWebhookController } from './fiscalbridge-webhook.controller';
import { FiscalbridgeWebhookService } from './fiscalbridge-webhook.service';

@Module({
  controllers: [FiscalbridgeWebhookController],
  providers: [FiscalbridgeWebhookService],
})
export class FiscalbridgeWebhookModule {}
