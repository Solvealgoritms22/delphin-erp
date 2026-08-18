import { TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { ClientsService } from './clients';

describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ClientsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
