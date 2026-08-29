import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentApplicationDto {
  @ApiProperty({ description: 'ID de la factura de venta a abonar' })
  @IsString()
  @IsNotEmpty()
  facturaId: string;

  @ApiProperty({ description: 'Monto a aplicar a esta factura específica' })
  @IsNumber()
  @IsPositive()
  monto: number;
}

export class CreateCustomerPaymentDto {
  @ApiProperty({ description: 'ID del cliente que realiza el pago' })
  @IsString()
  @IsNotEmpty()
  clienteId: string;

  @ApiPropertyOptional({
    description: 'Monto total pagado. Si no se pasa, se calcula como la suma de las aplicaciones.',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  monto?: number;

  @ApiPropertyOptional({
    description: 'ID de factura única (para cobro rápido de una sola factura)',
  })
  @IsString()
  @IsOptional()
  facturaId?: string;

  @ApiPropertyOptional({
    description: 'Desglose de facturas a las que se aplica el pago',
    type: [PaymentApplicationDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentApplicationDto)
  aplicaciones?: PaymentApplicationDto[];

  @ApiPropertyOptional({
    description: 'Método de cobro',
    enum: ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA', 'DEPOSITO', 'OTRO'],
    default: 'EFECTIVO',
  })
  @IsString()
  @IsOptional()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA', 'DEPOSITO', 'OTRO'])
  metodo?: string;

  @ApiPropertyOptional({
    description: 'Moneda del pago',
    default: 'DOP',
  })
  @IsString()
  @IsOptional()
  moneda?: string;

  @ApiPropertyOptional({
    description: 'Tasa de cambio respecto a la moneda base',
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  tasaCambio?: number;

  @ApiPropertyOptional({
    description: 'No. de cheque, referencia de transferencia o voucher',
  })
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiPropertyOptional({
    description: 'Fecha en que se efectuó el pago',
  })
  @IsOptional()
  fechaPago?: string | Date;

  @ApiPropertyOptional({
    description: 'Notas o comentarios sobre el cobro',
  })
  @IsString()
  @IsOptional()
  notas?: string;
}
