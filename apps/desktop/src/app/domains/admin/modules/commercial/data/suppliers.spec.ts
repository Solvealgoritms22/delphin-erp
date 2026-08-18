import { TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { SuppliersService } from './suppliers';

describe('SuppliersService', () => {
  let service: SuppliersService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(SuppliersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
