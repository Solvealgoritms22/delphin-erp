import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { IsArray, ArrayMaxSize, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, ValidateNested, ValidateIf, ValidateBy } from 'class-validator';

export class CatalogDto {
  @IsString() @Length(1, 200) nombre!: string;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsIn(['ACTIVO','INACTIVO']) estado?: string;
}
export class CategoryDto extends CatalogDto {
  @IsOptional() @IsIn(['PRODUCTO','SERVICIO','AMBOS']) tipo?: string;
  @IsOptional() @IsString() @MaxLength(100) icono?: string;
  @IsOptional() @IsString() @MaxLength(60) color?: string;
}
export class UnitDto extends CatalogDto {
  @IsString() @Length(1, 20) abreviatura!: string;
  @IsOptional() @IsIn(['PRODUCTO','SERVICIO']) tipo?: string;
}
export class UpdateCatalogDto extends PartialType(CatalogDto) {}
export class UpdateCategoryDto extends PartialType(CategoryDto) {}
export class UpdateUnitDto extends PartialType(UnitDto) {}
export class BranchDto extends CatalogDto {
  @IsOptional() @IsString() @MaxLength(1000) direccion?: string;
  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(150) ciudad?: string;
}
export class UpdateBranchDto extends PartialType(BranchDto) {}
export class WarehouseDto extends CatalogDto {
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsUUID() sucursalId?: string;
  @IsOptional() @IsIn(['CENTRAL','VENTA','TRANSITO','MERMAS']) tipo?: string;
  @IsOptional() @IsString() @MaxLength(50) codigo?: string;
  @IsOptional() @IsBoolean() esPrincipal?: boolean;
}
export class UpdateWarehouseDto extends PartialType(WarehouseDto) {}
export class BusinessContactDto {
  @IsString() @Length(1,200) nombreRazonSocial!: string;
  @IsString() @Length(1,40) numeroDocumento!: string;
  @IsOptional() @IsString() @Length(1,20) tipoDocumento?: string;
  @IsOptional() @IsString() @Length(2,2) pais?: string;
  @IsOptional() @IsString() @MaxLength(2000000) logo?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @IsString() @MaxLength(1000) direccion?: string;
  @IsOptional() @IsIn(['ACTIVO','INACTIVO']) estado?: string;
}
export class UpdateBusinessContactDto extends PartialType(BusinessContactDto) {}
export class CompanyDto {
  @IsString() @Length(1,200) razonSocial!: string;
  @IsOptional() @IsString() @MaxLength(20) rnc?: string;
  @IsOptional() @IsString() @Length(2,2) pais?: string;
  @IsOptional() @IsString() @MaxLength(1000) direccion?: string;
  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(2000) paginaWeb?: string;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(2000000) logo?: string;
}
export class UpdateCompanyDto extends PartialType(CompanyDto) {
  @IsOptional() @IsBoolean() fiscalbridgeEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) fiscalbridgeUrl?: string;
  @IsOptional() @IsIn(['TOKEN','EMAIL','OAUTH2']) fiscalbridgeAuthMethod?: string;
  @IsOptional() @IsString() @MaxLength(8192) fiscalbridgeToken?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsEmail() fiscalbridgeEmail?: string;
  @IsOptional() @IsString() @MaxLength(1000) fiscalbridgePassword?: string;
  @IsOptional() @IsString() @MaxLength(500) fiscalbridgeClientId?: string;
  @IsOptional() @IsString() @MaxLength(1000) fiscalbridgeClientSecret?: string;
  @IsOptional() @IsString() @MaxLength(1000) fiscalbridgeWebhookSecret?: string;
  @IsOptional() @IsIn(['TEST','CERT','PROD']) fiscalbridgeEnv?: string;
}
export class UserDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(200) nombre?: string;
  @IsOptional() @IsString() @MaxLength(2000000) avatar?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsUUID() roleId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsUUID('all',{each:true}) empresaIds?: string[];
  @IsOptional() @IsIn(['ACTIVO','INACTIVO','PENDIENTE']) estado?: string;
}
export class UpdateUserDto extends PartialType(UserDto) {}
export class RoleDto {
  @ValidateIf(o => !o.name || o.nombre !== undefined) @IsString() @Length(1,200) nombre?: string;
  @IsOptional() @IsString() @Length(1,200) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({each:true}) permissions?: string[];
}
export class UpdateRoleDto extends PartialType(RoleDto) {}
export class ProductInputDto {
  @IsUUID() insumoProductoId!: string;
  @Type(() => Number) @IsNumber() @Min(0.0001) cantidad!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costoUnitario?: number;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsUUID() unidadMedidaId?: string;
  @IsOptional() @IsString() @MaxLength(2000) notas?: string;
}
export class ProductDto {
  @IsString() @Length(1,200) nombre!: string;
  @IsOptional() @IsString() @MaxLength(60) codigo?: string;
  @IsOptional() @IsString() @MaxLength(100) codigoBarras?: string;
  @IsOptional() @IsString() @MaxLength(20000) descripcion?: string;
  @IsOptional() @IsIn(['PRODUCTO','SERVICIO']) tipo?: string;
  @Type(() => Number) @IsNumber() @Min(0) precioVenta!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costo?: number;
  @IsOptional() @Matches(/^[A-Z]{3}$/) moneda?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) taxRate?: number;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsUUID() impuestoId?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsUUID() categoriaId?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsUUID() marcaId?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsUUID() unidadMedidaId?: string;
  @IsOptional() @ValidateIf((_o,v) => v !== '') @IsUUID() almacenId?: string;
  @IsOptional() @IsString() @MaxLength(2000) tags?: string;
  @IsOptional() @ValidateBy({name:'images',validator:{validate: v => typeof v === 'string' ? v.length <= 10000000 : Array.isArray(v) && v.length <= 5 && v.every(i => typeof i === 'string' && i.length <= 2000000)}}) imagenes?: string | string[];
  @IsOptional() @IsIn(['ACTIVO','INACTIVO']) estado?: string;
  @IsOptional() @IsBoolean() enOferta?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) precioOferta?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) descuentoPorcentaje?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) descuentoMaximo?: number;
  @IsOptional() @IsString() @MaxLength(30) ofertaDesde?: string;
  @IsOptional() @IsString() @MaxLength(30) ofertaHasta?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stockInicial?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stockMinimo?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(() => ProductInputDto) insumos?: ProductInputDto[];
}
export class UpdateProductDto extends PartialType(ProductDto) {}
export class ProfileDto {
  @IsOptional() @IsString() @Length(1,200) name?: string;
  @IsOptional() @IsString() @MaxLength(2000000) avatar?: string;
  @IsOptional() @IsBoolean() smtpEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(253) smtpHost?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(65535) smtpPort?: number;
  @IsOptional() @IsString() @MaxLength(254) smtpUser?: string;
  @IsOptional() @IsString() @MaxLength(1000) smtpPass?: string;
  @IsOptional() @IsString() @MaxLength(254) smtpFrom?: string;
  @IsOptional() @IsBoolean() smtpSecure?: boolean;
}
export class BackupSettingsDto {
  @IsOptional() @IsBoolean() backupAutoEnabled?: boolean;
  @IsOptional() @IsIn(['DAILY','WEEKLY','MONTHLY']) backupFrecuencia?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) backupHora?: string;
  @IsOptional() @IsIn(['LOCAL','GOOGLE_DRIVE']) backupDestino?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650) backupRetencionDias?: number;
}
export class CreateBackupDto {
  @IsOptional() @IsUUID() empresaId?: string;
  @IsOptional() @IsIn(['LOCAL','GOOGLE_DRIVE']) proveedor?: string;
}
export class BillingConfigDto {
  @IsOptional() @Matches(/^[A-Z]{3}$/) monedaBase?: string;
  @IsOptional() @IsString() @MaxLength(100) zonaHoraria?: string;
  @IsOptional() @IsString() @MaxLength(30) locale?: string;
  @IsOptional() @Type(() => Number) @IsIn([0,2]) precisionMoneda?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(6) precisionCantidad?: number;
  @IsOptional() @IsIn(['HALF_UP','HALF_EVEN','DOWN','UP']) metodoRedondeo?: string;
  @IsOptional() @IsIn(['LINEA','TOTAL']) redondeoPor?: string;
  @IsOptional() @IsBoolean() preciosIncluyenImpuesto?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(365) diasGracia?: number;
  @IsOptional() @IsObject() tasasCambio?: Record<string,number>;
}
export class TaxDto {
  @IsString() @Length(1,40) codigo!: string;
  @IsString() @Length(1,200) nombre!: string;
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) tasa!: number;
  @IsOptional() @IsIn(['1','2','3','4']) indicadorFacturacion?: string;
  @IsOptional() @IsBoolean() incluidoEnPrecio?: boolean;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class UpdateTaxDto extends PartialType(TaxDto) {}
export class PaymentTermDto {
  @IsString() @Length(1,40) codigo!: string;
  @IsString() @Length(1,200) nombre!: string;
  @IsOptional() @IsIn(['CONTADO','CREDITO']) tipo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3650) diasCredito?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) porcentajeAnticipo?: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class UpdatePaymentTermDto extends PartialType(PaymentTermDto) {}
