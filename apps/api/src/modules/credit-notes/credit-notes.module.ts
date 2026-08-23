import { Module } from '@nestjs/common';
import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';
import { SequencesModule } from '../sequences/sequences.module';
import { BillingConfigModule } from '../billing-config/billing-config.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [SequencesModule, BillingConfigModule, InvoicesModule],
  controllers: [CreditNotesController],
  providers: [CreditNotesService],
})
export class CreditNotesModule {}
