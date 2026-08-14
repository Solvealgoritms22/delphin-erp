import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { AzulService } from './azul.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AddPaymentMethodDto {
  cardNumber: string;
  expiration: string;
  cvc: string;
  cardHolder: string;
}

@ApiTags('Pagos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly azulService: AzulService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Obtener configuración de pagos (modo simulado/sandbox)',
  })
  getConfig() {
    return this.paymentsService.getConfig();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Obtener uso y límites del plan activo' })
  async usage(@CurrentUser() user: any) {
    if (!user.empresaId) throw new BadRequestException('No tenant selected');
    const [subscription, members, branches, products] = await Promise.all([
      this.prisma.suscripcion.findUnique({ where: { empresaId: user.empresaId }, include: { plan: true } }),
      this.prisma.membresia.count({ where: { empresaId: user.empresaId, estado: 'ACTIVO' } }),
      this.prisma.sucursal.count({ where: { empresaId: user.empresaId } }),
      this.prisma.producto.count({ where: { empresaId: user.empresaId } }),
    ]);
    return {
      plan: subscription?.plan?.nombre || user.plan || 'Free',
      members,
      branches,
      products,
      limits: {
        members: subscription?.plan?.maxUsuarios ?? 1,
        branches: subscription?.plan?.maxSucursales ?? 1,
        products: subscription?.plan?.maxProductos ?? 100,
      },
    };
  }

  /**
   * GET /v1/payments/azul/payment-method
   * Returns the saved payment method info for the current tenant.
   */
  @Get('azul/payment-method')
  @ApiOperation({
    summary: 'Obtener método de pago guardado del tenant activo',
  })
  async getPaymentMethod(@CurrentUser() user: any) {
    const empresaId = user.empresaId;
    if (!empresaId) throw new BadRequestException('No tenant selected');

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { suscripcion: true },
    });

    if (!empresa?.suscripcion?.azulDataVaultExpiration) {
      return { hasPaymentMethod: false };
    }

    const exp = empresa.suscripcion.azulDataVaultExpiration;
    const expFormatted = exp ? `${exp.slice(4, 6)}/${exp.slice(2, 4)}` : null;

    return {
      hasPaymentMethod: true,
      cardBrand: empresa.suscripcion.azulCardBrand,
      cardLast4: empresa.suscripcion.azulCardLast4,
      cardHolder: empresa.suscripcion.azulCardHolder,
      expiration: expFormatted,
    };
  }

  /**
   * POST /v1/payments/azul/payment-method
   * Tokenizes a new card using Azul DataVault (charges RD$1.00 as verification, then voids).
   */
  @Post('azul/payment-method')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Guardar tarjeta (tokeniza con Azul DataVault)' })
  @ApiResponse({ status: 200, description: 'Tarjeta tokenizada y guardada.' })
  @ApiResponse({
    status: 400,
    description: 'Tarjeta declinada o datos inválidos.',
  })
  async addPaymentMethod(
    @CurrentUser() user: any,
    @Body() dto: AddPaymentMethodDto,
  ) {
    const empresaId = user.empresaId;
    if (!empresaId) throw new BadRequestException('No tenant selected');

    if (!dto.cardNumber || !dto.expiration || !dto.cvc || !dto.cardHolder) {
      throw new BadRequestException(
        'Todos los datos de la tarjeta son requeridos (número, expiración, CVC, titular).',
      );
    }

    const sanitizedCard = dto.cardNumber.replace(/\s/g, '');
    if (sanitizedCard.length < 13 || sanitizedCard.length > 19) {
      throw new BadRequestException('Número de tarjeta inválido.');
    }

    const orderNumber = `VERIFY-${empresaId.substring(0, 8)}-${Date.now()}`;

    const azulResponse = await this.azulService.processCardSaleWithTokenization(
      {
        cardNumber: sanitizedCard,
        expiration: dto.expiration,
        cvc: dto.cvc,
        cardHolder: dto.cardHolder,
        amountCents: 100, // RD$1.00 verification charge
        itbisCents: 18,
        orderNumber,
      },
    );

    if (!this.azulService.isApproved(azulResponse)) {
      throw new BadRequestException(
        `Tarjeta declinada: ${azulResponse.ResponseMessage || 'Error desconocido'}`,
      );
    }

    if (!azulResponse.DataVaultToken) {
      throw new BadRequestException('No se pudo tokenizar la tarjeta.');
    }

    // Upsert subscription for the tenant
    await this.prisma.suscripcion.upsert({
      where: { empresaId },
      update: {
        azulDataVaultToken: azulResponse.DataVaultToken,
        azulDataVaultExpiration: azulResponse.DataVaultExpiration || '202812',
        azulCardLast4:
          azulResponse.CardNumber?.slice(-4) || sanitizedCard.slice(-4),
        azulCardBrand: azulResponse.CardBrand || 'UNKNOWN',
        azulCardHolder: dto.cardHolder,
      },
      create: {
        empresaId,
        planId: 'starter', // fallback
        azulDataVaultToken: azulResponse.DataVaultToken,
        azulDataVaultExpiration: azulResponse.DataVaultExpiration || '202812',
        azulCardLast4:
          azulResponse.CardNumber?.slice(-4) || sanitizedCard.slice(-4),
        azulCardBrand: azulResponse.CardBrand || 'UNKNOWN',
        azulCardHolder: dto.cardHolder,
      },
    });

    // Void the RD$1.00 verification charge (non-critical)
    if (azulResponse.AzuleOrderId) {
      try {
        await this.azulService.voidTransaction(azulResponse.AzuleOrderId);
      } catch {
        // Non-critical: the verification charge void is best-effort only.
      }
    }

    return {
      success: true,
      message: 'Método de pago guardado correctamente.',
      cardBrand: azulResponse.CardBrand,
      cardLast4: azulResponse.CardNumber?.slice(-4),
    };
  }

  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar de plan de suscripción' })
  async changePlan(
    @CurrentUser() user: any,
    @Body() dto: { planId: string; billingCycle: string },
  ) {
    const empresaId = user.empresaId;
    if (!empresaId) throw new BadRequestException('No tenant selected');

    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: { empresaId },
    });
    if (!suscripcion || !suscripcion.azulDataVaultToken) {
      throw new BadRequestException(
        'No tienes un método de pago registrado. Por favor agrega una tarjeta antes de cambiar de plan.',
      );
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new BadRequestException('Plan no encontrado');

    const amount =
      dto.billingCycle === 'annual' ? plan.precioAnual : plan.precioMensual;

    const numAmount = Number(amount);

    if (numAmount > 0 && process.env.AZUL_ENV !== 'MOCK') {
      const orderNumber = `UPG-${empresaId.substring(0, 8)}-${Date.now()}`;
      const azulResponse = await this.azulService.processTokenSale({
        dataVaultToken: suscripcion.azulDataVaultToken,
        dataVaultExpiration: suscripcion.azulDataVaultExpiration || '202812',
        amountCents: Math.round(numAmount * 100),
        itbisCents: Math.round(numAmount * 18),
        orderNumber,
      });
      if (!this.azulService.isApproved(azulResponse)) {
        throw new BadRequestException(
          `El pago fue declinado: ${azulResponse.ResponseMessage}`,
        );
      }
    }

    const nextBilling = new Date();
    if (dto.billingCycle === 'annual') {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    } else {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }

    await this.prisma.suscripcion.update({
      where: { empresaId },
      data: {
        planId: plan.id,
        fechaRenovacion: nextBilling,
        estado: 'ACTIVE',
      },
    });

    return {
      ok: true,
      plan: plan.nombre,
      simulated: process.env.AZUL_ENV === 'MOCK',
    };
  }

  @Delete('azul/payment-method')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar método de pago guardado' })
  async removePaymentMethod(@CurrentUser() user: any) {
    const empresaId = user.empresaId;
    if (!empresaId) throw new BadRequestException('No tenant selected');

    await this.prisma.suscripcion.updateMany({
      where: { empresaId },
      data: {
        azulDataVaultToken: null,
        azulDataVaultExpiration: null,
        azulCardLast4: null,
        azulCardBrand: null,
        azulCardHolder: null,
      },
    });

    return { success: true, message: 'Método de pago eliminado.' };
  }
}
