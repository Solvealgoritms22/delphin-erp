import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { FilterPromotionsDto } from './dto/filter-promotions.dto';
import { EvaluatePromotionsDto } from './dto/evaluate-promotions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Comercial: Promociones y Descuentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Crear nueva promoción u oferta' })
  create(@CurrentUser() user: any, @Body() dto: CreatePromotionDto) {
    const userId = user.userId || user.id;
    return this.promotionsService.create(user.empresaId, userId, dto);
  }

  @Get()
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Listar promociones con filtros' })
  findAll(@CurrentUser() user: any, @Query() filter: FilterPromotionsDto) {
    return this.promotionsService.findAll(user.empresaId, filter);
  }

  @Post('evaluate')
  @RequirePermissions('commercial:read')
  @ApiOperation({
    summary: 'Evaluar y cotizar promociones aplicables para una canasta de productos',
  })
  evaluate(@CurrentUser() user: any, @Body() dto: EvaluatePromotionsDto) {
    return this.promotionsService.evaluatePromotions(user.empresaId, dto);
  }

  @Get(':id')
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Obtener detalle de una promoción' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.promotionsService.findOne(user.empresaId, id);
  }

  @Put(':id')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Actualizar promoción' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    const userId = user.userId || user.id;
    return this.promotionsService.update(user.empresaId, userId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Pausar o reanudar promoción' })
  toggleStatus(@CurrentUser() user: any, @Param('id') id: string) {
    const userId = user.userId || user.id;
    return this.promotionsService.toggleStatus(user.empresaId, userId, id);
  }

  @Delete(':id')
  @RequirePermissions('commercial:delete')
  @ApiOperation({ summary: 'Eliminar promoción' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    const userId = user.userId || user.id;
    return this.promotionsService.remove(user.empresaId, userId, id);
  }
}
