import { TestBed } from '@angular/core/testing';

import { Suppliers } from './suppliers';

describe('Suppliers', () => {
  let service: Suppliers;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Suppliers);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
