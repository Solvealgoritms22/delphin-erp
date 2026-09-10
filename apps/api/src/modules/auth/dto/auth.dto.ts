import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, MinLength } from 'class-validator';
export class EmailDto { @IsEmail() @MaxLength(254) email!: string; }
export class OtpDto extends EmailDto { @Matches(/^\d{6}$/) otp!: string; }
export class PasswordResetDto extends OtpDto { @IsString() @MinLength(12) @MaxLength(72) newPassword!: string; }
export class PasswordChangeDto { @IsString() @MaxLength(72) currentPassword!: string; @IsString() @MinLength(12) @MaxLength(72) newPassword!: string; }
export class SwitchTenantDto { @IsUUID() empresaId!: string; }
export class GoogleStartDto {
  @Matches(/^[A-Za-z0-9_-]{43}$/) challenge!: string;
  @IsOptional() @IsString() @MaxLength(500) origin?: string;
}
export class GoogleFlowDto { @IsUUID() flowId!: string; @Matches(/^[A-Za-z0-9_-]{43,128}$/) verifier!: string; }
export class GoogleCompleteDto extends GoogleFlowDto {
  @IsBoolean() acceptedPolicies!: boolean;
  @IsOptional() @IsString() @Length(1, 200) companyName?: string;
  @IsOptional() @Matches(/^\d{9}(\d{2})?$/) rnc?: string;
}
export class InvitationDto {
  @IsString() @Length(20, 256) token!: string;
  @IsString() @MinLength(12) @MaxLength(72) newPassword!: string;
  @IsString() @MaxLength(72) confirmPassword!: string;
  @IsBoolean() acceptedPolicies!: boolean;
}
export class RegisterDto extends EmailDto {
  @IsOptional() @IsString() @MaxLength(20) documentType?: string;
  @IsOptional() @IsBoolean() agreements?: boolean;
  @IsOptional() @IsBoolean() subscription?: boolean;
  @IsString() @MinLength(12) @MaxLength(72) password!: string;
  @IsString() @MaxLength(72) confirmPassword!: string;
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsString() @Length(1, 200) nombre?: string;
  @IsOptional() @IsString() @Length(1, 200) company?: string;
  @IsOptional() @IsString() @Length(1, 200) empresa?: string;
  @IsOptional() @IsString() @MaxLength(20) documentNumber?: string;
  @IsOptional() @IsString() @MaxLength(20) rnc?: string;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() companyEmail?: string;
  @IsOptional() @IsBoolean() acceptedPolicies?: boolean;
  @IsOptional() @IsBoolean() terms?: boolean;
}
