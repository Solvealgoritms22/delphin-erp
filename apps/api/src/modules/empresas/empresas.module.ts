import { Module } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { TenantMailerService } from '../../common/tenant-mailer.service';
import { TrialEligibilityModule } from '../trial-eligibility/trial-eligibility.module';

@Module({
  imports: [TrialEligibilityModule],
  providers: [EmpresasService, TenantMailerService],
  controllers: [EmpresasController],
})
export class EmpresasModule {}
