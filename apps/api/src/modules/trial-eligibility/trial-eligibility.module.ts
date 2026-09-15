import { Module } from '@nestjs/common';
import { TrialEligibilityService } from './trial-eligibility.service';

@Module({
  providers: [TrialEligibilityService],
  exports: [TrialEligibilityService],
})
export class TrialEligibilityModule {}