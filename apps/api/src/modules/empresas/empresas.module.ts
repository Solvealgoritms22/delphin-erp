import { Module } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { TenantMailerService } from '../../common/tenant-mailer.service';

@Module({
  providers: [EmpresasService, TenantMailerService],
  controllers: [EmpresasController],
})
export class EmpresasModule {}
