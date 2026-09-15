import { Module } from '@nestjs/common';
import { BillingAttemptsService } from './billing-attempts.service';
import { BillingOwnerGuard } from './billing-owner.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { EmpresasModule } from '../empresas/empresas.module';
import { AzulService } from './azul.service';
import { BillingCronService } from './billing-cron.service';

@Module({
  imports: [EmpresasModule],
  controllers: [PaymentsController],
  providers: [
    BillingAttemptsService,
    BillingOwnerGuard,
    PaymentsService,
    AzulService,
    BillingCronService,
  ],
  exports: [AzulService],
})
export class PaymentsModule {}
