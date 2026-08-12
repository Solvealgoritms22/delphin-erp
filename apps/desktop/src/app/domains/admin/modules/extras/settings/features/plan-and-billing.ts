import { CurrencyPipe } from '@angular/common';
import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatOption } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import {
  MatFormField,
  MatInput,
  MatLabel,
  MatPrefix,
} from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatSelect } from '@angular/material/select';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'plan-and-billing-settings',
  imports: [
    CurrencyPipe,
    FormsModule,
    MatButton,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatOption,
    MatPrefix,
    MatRadioButton,
    MatRadioGroup,
    MatSelect,
    FormField,
    MatCard,
    MatDivider,
    TranslocoPipe,
  ],
  template: `
    <form
      class="grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-8"
      (submit)="save($event)"
    >
      <!-- Plan section -->
      <div class="col-span-full">
        <div class="text-lg font-medium">{{ 'extras.billing.changePlan' | transloco }}</div>
        <div class="text-neutral-500">
           {{ 'extras.billing.changePlanDescription' | transloco }}
        </div>
      </div>

      <div class="col-span-full">
        <!-- Plans -->
        <mat-radio-group
          class="pointer-events-none invisible absolute size-0 opacity-0"
          [formField]="planAndBillingSettingsForm.plan"
          #planRadioGroup="matRadioGroup"
        >
          @for (plan of plans; track plan.value) {
            <mat-radio-button [value]="plan.value"></mat-radio-button>
          }
        </mat-radio-group>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          @for (plan of plans; track plan.value) {
            <mat-card
              appearance="outlined"
              class="relative flex cursor-pointer flex-col items-start justify-start p-4"
              tabindex="0"
              [class.border-primary-600]="planRadioGroup.value === plan.value"
              [class.bg-primary-500/5]="planRadioGroup.value === plan.value"
              (pointerdown)="planRadioGroup.value = plan.value"
            >
              @if (planRadioGroup.value === plan.value) {
                <mat-icon
                  class="absolute top-3 right-3 size-6 text-primary-500"
                  svgIcon="circle-check"
                ></mat-icon>
              }
                <div class="font-semibold">{{ plan.label | transloco }}</div>
              <div class="text-neutral-500">
                 {{ plan.details | transloco }}
              </div>

              <div class="mt-4 font-medium md:mt-6">
                <span>{{
                  plan.price | currency: 'USD' : 'symbol' : '1.0'
                }}</span>
                <span class="text-neutral-500">{{ 'extras.billing.month' | transloco }}</span>
              </div>
            </mat-card>
          }
        </div>
      </div>

      <!-- Divider -->
      <mat-divider class="col-span-full my-4" />

      <!-- Payment details section -->
      <div class="col-span-full">
         <div class="text-lg font-medium">{{ 'extras.billing.paymentDetails' | transloco }}</div>
        <div class="text-neutral-500">
           {{ 'extras.billing.paymentDescription' | transloco }}
        </div>
      </div>

      <!-- Card holder -->
      <mat-form-field class="col-span-full">
         <mat-label>{{ 'extras.billing.cardHolder' | transloco }}</mat-label>
        <input
          matInput
          [formField]="planAndBillingSettingsForm.cardHolder"
           [placeholder]="'extras.billing.cardHolderPlaceholder' | transloco"
        />
        <mat-icon
          svgIcon="user"
          matPrefix
        ></mat-icon>
      </mat-form-field>

      <!-- Card number -->
      <mat-form-field class="col-span-full md:col-span-2">
         <mat-label>{{ 'extras.billing.cardNumber' | transloco }}</mat-label>
        <input
          matInput
          [formField]="planAndBillingSettingsForm.cardNumber"
          placeholder="0000 0000 0000 0000"
        />
        <mat-icon
          svgIcon="credit-card"
          matPrefix
        ></mat-icon>
      </mat-form-field>

      <!-- Card expiration -->
      <mat-form-field class="col-span-full md:col-span-1">
         <mat-label>{{ 'extras.billing.expiration' | transloco }}</mat-label>
        <input
          matInput
          [formField]="planAndBillingSettingsForm.cardExpiration"
          [placeholder]="'MM / YY'"
        />
        <mat-icon
          svgIcon="calendar"
          matPrefix
        ></mat-icon>
      </mat-form-field>

      <!-- Card CVC -->
      <mat-form-field class="col-span-full md:col-span-1">
         <mat-label>{{ 'extras.billing.cvc' | transloco }}</mat-label>
        <input
          matInput
          [formField]="planAndBillingSettingsForm.cardCVC"
          placeholder="123"
        />
        <mat-icon
          svgIcon="lock-keyhole"
          matPrefix
        ></mat-icon>
      </mat-form-field>

      <!-- Country -->
      <mat-form-field class="col-span-full md:col-span-3">
         <mat-label>{{ 'extras.billing.country' | transloco }}</mat-label>
        <mat-select [formField]="planAndBillingSettingsForm.country">
           @for (country of countries; track country.value) { <mat-option [value]="country.value">{{ country.label | transloco }}</mat-option> }
        </mat-select>
        <mat-icon
          svgIcon="map-pin"
          matPrefix
        ></mat-icon>
      </mat-form-field>

      <!-- ZIP -->
      <mat-form-field class="col-span-full md:col-span-1">
         <mat-label>{{ 'extras.billing.zip' | transloco }}</mat-label>
        <input matInput placeholder="10001" />
        <mat-icon
          svgIcon="hash"
          matPrefix
        ></mat-icon>
      </mat-form-field>

      <!-- Divider -->
      <mat-divider class="col-span-full my-4" />

      <!-- Actions -->
      <div class="col-span-full flex items-center justify-end gap-x-4">
        <button
          type="button"
          matButton="outlined"
        >
           {{ 'extras.billing.cancel' | transloco }}
        </button>
         <button matButton="filled">{{ 'extras.billing.save' | transloco }}</button>
      </div>
    </form>
  `,
})
export default class PlanAndBillingSettings {
  private readonly transloco = inject(TranslocoService);
  // State
  protected planAndBillingSettingsModel = signal({
    plan: 'team',
    cardHolder: 'Brian Hughes',
    cardNumber: '',
    cardExpiration: '',
    cardCVC: '',
    country: 'usa',
    zip: '',
  });
  protected planAndBillingSettingsForm = form(this.planAndBillingSettingsModel);
  protected plans = [
    {
      value: 'basic',
       label: 'extras.billing.plans.basic',
       details: 'extras.billing.planDetails.basic',
      price: '10',
    },
    {
      value: 'team',
       label: 'extras.billing.plans.team',
       details: 'extras.billing.planDetails.team',
      price: '20',
    },
    {
      value: 'enterprise',
       label: 'extras.billing.plans.enterprise',
       details: 'extras.billing.planDetails.enterprise',
      price: '40',
    },
  ];
  protected countries = [
    { value: 'usa', label: 'extras.billing.countries.usa' }, { value: 'canada', label: 'extras.billing.countries.canada' },
    { value: 'mexico', label: 'extras.billing.countries.mexico' }, { value: 'france', label: 'extras.billing.countries.france' },
    { value: 'germany', label: 'extras.billing.countries.germany' }, { value: 'italy', label: 'extras.billing.countries.italy' },
  ];

  save(event: Event) {
    event.preventDefault();
  }
}
