import { Module } from '@nestjs/common';
import { BillingAttemptsService } from './billing-attempts.service';
import { BillingOwnerGuard } from './billing-owner.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { EmpresasService } from '../empresas/empresas.service';
import { AzulService } from './azul.service';
import { BillingCronService } from './billing-cron.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    BillingAttemptsService,
    BillingOwnerGuard,
    PaymentsService,
    EmpresasService,
    AzulService,
    BillingCronService,
  ],
  exports: [AzulService],
})
export class PaymentsModule {}
