import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSequenceDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  tipo: string; // E31, E32, E34, E44, E45, B01, B02, B04, B14, B15

  @IsString()
  @IsNotEmpty()
  prefijo: string; // E31, B01, etc.

  @IsInt()
  @Min(1)
  @IsOptional()
  numeroActual?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  numeroHasta?: number = 99999999;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @IsBoolean()
  @IsOptional()
  activa?: boolean = true;

  @IsString()
  @IsOptional()
  ambiente?: string = 'TEST'; // TEST | CERT | PROD
}

export class UpdateSequenceDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  numeroActual?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  numeroHasta?: number;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;

  @IsString()
  @IsOptional()
  ambiente?: string;
}
