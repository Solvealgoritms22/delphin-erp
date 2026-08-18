import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { FiscalBridgeService } from './fiscalbridge.service';
import { FiscalOutboxService } from './fiscal-outbox.service';
import { SequencesModule } from '../sequences/sequences.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingConfigModule } from '../billing-config/billing-config.module';

@Module({
  imports: [PrismaModule, SequencesModule, BillingConfigModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, FiscalBridgeService, FiscalOutboxService],
  exports: [InvoicesService, FiscalBridgeService, FiscalOutboxService],
})
export class InvoicesModule {}
