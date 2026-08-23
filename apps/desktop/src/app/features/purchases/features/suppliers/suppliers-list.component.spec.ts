import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { Suppliers } from './suppliers-list.component';

describe('Suppliers', () => {
  let component: Suppliers;
  let fixture: ComponentFixture<Suppliers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Suppliers],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideTransloco({ config: { availableLangs: ['es', 'en'], defaultLang: 'es' } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Suppliers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
