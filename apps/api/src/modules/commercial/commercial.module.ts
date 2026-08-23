import { Module } from '@nestjs/common';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';

@Module({
  controllers: [ClientsController, SuppliersController],
  providers: [ClientsService, SuppliersService],
})
export class CommercialModule {}
