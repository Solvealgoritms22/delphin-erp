import { TestBed } from '@angular/core/testing';

import { Clients } from './clients';

describe('Clients', () => {
  let service: Clients;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Clients);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
