import { IsIn, IsString, IsUUID, Length, Matches } from 'class-validator';
export class AddPaymentMethodDto {
  @Matches(/^[0-9 ]{13,25}$/) cardNumber!: string;
  @Matches(/^(0[1-9]|1[0-2])\d{2}$/) expiration!: string;
  @Matches(/^\d{3,4}$/) cvc!: string;
  @IsString() @Length(2, 150) cardHolder!: string;
  @IsUUID() idempotencyKey!: string;
}
export class ChangePlanDto {
  @IsIn(['starter', 'pro', 'enterprise']) planId!: string;
  @IsIn(['monthly', 'annual']) billingCycle!: string;
  @IsUUID() idempotencyKey!: string;
}
