import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la promoción es obligatorio' })
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  codigoCupon?: string;

  @IsString()
  @IsIn(['PORCENTAJE', 'MONTO_FIJO', 'PRECIO_FIJO'], {
    message: 'El tipo de descuento debe ser PORCENTAJE, MONTO_FIJO o PRECIO_FIJO',
  })
  tipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO' | 'PRECIO_FIJO';

  @IsNumber({}, { message: 'El valor del descuento debe ser numérico' })
  @Min(0, { message: 'El valor del descuento no puede ser negativo' })
  valorDescuento: number;

  @IsString()
  @IsIn(['TODOS', 'CATEGORIA', 'MARCA', 'PRODUCTOS'], {
    message: 'El alcance debe ser TODOS, CATEGORIA, MARCA o PRODUCTOS',
  })
  alcance: 'TODOS' | 'CATEGORIA' | 'MARCA' | 'PRODUCTOS';

  @ValidateIf((o) => o.alcance === 'CATEGORIA')
  @IsString()
  @IsNotEmpty({ message: 'La categoría es obligatoria para el alcance CATEGORIA' })
  categoriaId?: string;

  @ValidateIf((o) => o.alcance === 'MARCA')
  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria para el alcance MARCA' })
  marcaId?: string;

  @ValidateIf((o) => o.alcance === 'PRODUCTOS')
  @IsArray()
  @IsOptional()
  productoIds?: string[];

  @IsDateString({}, { message: 'La fecha de inicio debe tener formato ISO válido' })
  fechaInicio: string;

  @IsDateString({}, { message: 'La fecha de fin debe tener formato ISO válido' })
  fechaFin: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  cantidadMinima?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  montoMinimo?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limiteUsos?: number;

  @IsBoolean()
  @IsOptional()
  esAcumulable?: boolean;

  @IsNumber()
  @IsOptional()
  prioridad?: number;

  @IsString()
  @IsIn(['ACTIVO', 'INACTIVO', 'PAUSADO'], {
    message: 'El estado debe ser ACTIVO, INACTIVO o PAUSADO',
  })
  @IsOptional()
  estado?: 'ACTIVO' | 'INACTIVO' | 'PAUSADO';
}
