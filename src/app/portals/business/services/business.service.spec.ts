import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BusinessService } from './business.service';

describe('BusinessService', () => {
  let service: BusinessService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BusinessService,
      ],
    });
    service = TestBed.inject(BusinessService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAccounts should call the correct endpoint', () => {
    service.getAccounts('org-123').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/organizations/org-123/accounts'));
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('getBalance should call balance endpoint for account', () => {
    service.getBalance('org-123', 'acc-456').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/organizations/org-123/accounts/acc-456/balance')
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { available_balance: 100 } });
  });

  it('getMovements should include filters in params', () => {
    service.getMovements('org-1', 'acc-1', { entryType: 'CREDIT', page: 2 }).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/organizations/org-1/accounts/acc-1/ledger')
    );
    expect(req.request.params.get('entry_type')).toBe('CREDIT');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ success: true, data: [] });
  });

  it('sendSpei should POST to spei transfers endpoint', () => {
    const body = {
      source_account_id: 'acc-1',
      destination_clabe: '123456789012345678',
      destination_name: 'Juan',
      amount: 500,
      concept: 'Pago servicio',
    };
    service.sendSpei('org-1', body).subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/organizations/org-1/spei/transfers')
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ success: true, data: { transfer_id: 't-1' } });
  });

  it('getReports should call reports endpoint with period param', () => {
    service.getReports('org-1', 'this_month').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/organizations/org-1/reports/summary')
    );
    expect(req.request.params.get('period')).toBe('this_month');
    req.flush({ success: true, data: { entries: [] } });
  });

  it('getMovements should use default page 1 when not provided', () => {
    service.getMovements('org-1', 'acc-1').subscribe();
    const req = httpMock.expectOne((r) =>
      r.url.includes('/organizations/org-1/accounts/acc-1/ledger')
    );
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ success: true, data: [] });
  });
});
