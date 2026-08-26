import { Module } from '@nestjs/common';
import { TenantApiKeyService } from './tenant-api-key.service';
import { TenantApiManagementController } from './controllers/tenant-api-management.controller';
import { PublicTenantApiController } from './controllers/public-tenant-api.controller';
import { TenantApiKeyGuard } from './guards/tenant-api-key.guard';

@Module({
  controllers: [TenantApiManagementController, PublicTenantApiController],
  providers: [TenantApiKeyService, TenantApiKeyGuard],
  exports: [TenantApiKeyService, TenantApiKeyGuard],
})
export class TenantApiModule {}
