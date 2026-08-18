import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { SupplierForm } from './supplier-form';

describe('SupplierForm', () => {
  let component: SupplierForm;
  let fixture: ComponentFixture<SupplierForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierForm],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideTransloco({ config: { availableLangs: ['es', 'en'], defaultLang: 'es' } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

