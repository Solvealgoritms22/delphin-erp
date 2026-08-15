import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { FiscalBridgeService } from './fiscalbridge.service';
import { SequencesModule } from '../sequences/sequences.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, SequencesModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, FiscalBridgeService],
  exports: [InvoicesService, FiscalBridgeService],
})
export class InvoicesModule {}
