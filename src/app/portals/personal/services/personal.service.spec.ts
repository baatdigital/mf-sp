import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PersonalService } from './personal.service';
import { AccountsAdapter } from '@infrastructure/adapters/accounts.adapter';
import { TransfersAdapter } from '@infrastructure/adapters/transfers.adapter';
import { SharedStateService } from '@shared-state';
import { of, throwError } from 'rxjs';

const mockSharedState = {
  accessToken: () => 'test-token',
  currentOrganizationId: () => 'org-001',
  tenant: () => ({ id: 'superpago', apiKey: 'test-api-key' }),
  currentUser: () => ({ name: 'Test User', email: 'test@test.com', id: 'u-001' }),
};

describe('PersonalService', () => {
  let service: PersonalService;
  let httpMock: HttpTestingController;
  let accountsAdapterSpy: jasmine.SpyObj<AccountsAdapter>;
  let transfersAdapterSpy: jasmine.SpyObj<TransfersAdapter>;

  const mockAccounts = {
    success: true,
    data: [
      {
        account_id: 'acc-001',
        organization_id: 'org-001',
        account_type: 'CLABE_PRIVADA' as const,
        status: 'ACTIVE' as const,
        balance: 5000,
        available_balance: 4800,
        clabe: '123456789012345678',
        created_at: '2024-01-01T00:00:00Z',
      },
    ],
  };

  const mockTransferResponse = {
    success: true,
    data: {
      transfer_id: 'txn-001',
      organization_id: 'org-001',
      source_account_id: 'acc-001',
      destination_clabe: '987654321098765432',
      destination_name: 'Juan Perez',
      amount: 1000,
      concept: 'Pago renta',
      status: 'PENDING' as const,
      created_at: '2024-01-15T10:00:00Z',
    },
  };

  beforeEach(() => {
    accountsAdapterSpy = jasmine.createSpyObj('AccountsAdapter', [
      'getAccounts',
      'getAccount',
      'getLedgerEntries',
    ]);
    accountsAdapterSpy.getAccount.and.returnValue(
      of({ success: true, data: mockAccounts.data[0] })
    );
    transfersAdapterSpy = jasmine.createSpyObj('TransfersAdapter', [
      'createTransfer',
    ]);

    accountsAdapterSpy.getAccounts.and.returnValue(of(mockAccounts));
    accountsAdapterSpy.getLedgerEntries.and.returnValue(
      of({ success: true, data: [] })
    );
    transfersAdapterSpy.createTransfer.and.returnValue(of(mockTransferResponse));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PersonalService,
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: AccountsAdapter, useValue: accountsAdapterSpy },
        { provide: TransfersAdapter, useValue: transfersAdapterSpy },
      ],
    });

    service = TestBed.inject(PersonalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAccountInfo', () => {
    it('should delegate to AccountsAdapter.getAccounts', () => {
      service.getAccountInfo('org-001').subscribe((result) => {
        expect(result).toEqual(mockAccounts);
      });
      expect(accountsAdapterSpy.getAccounts).toHaveBeenCalledWith('org-001');
    });

    it('should propagate error from adapter', () => {
      accountsAdapterSpy.getAccounts.and.returnValue(
        throwError(() => new Error('Network error'))
      );
      let errorCaught = false;
      service.getAccountInfo('org-001').subscribe({
        error: () => { errorCaught = true; },
      });
      expect(errorCaught).toBeTrue();
    });
  });

  describe('getAccount', () => {
    it('should delegate to AccountsAdapter.getAccount', () => {
      accountsAdapterSpy.getAccount.and.returnValue(
        of({ success: true, data: mockAccounts.data[0] })
      );
      service.getAccount('org-001', 'acc-001').subscribe((result) => {
        expect(result.data.account_id).toBe('acc-001');
      });
      expect(accountsAdapterSpy.getAccount).toHaveBeenCalledWith('org-001', 'acc-001');
    });
  });

  describe('getMovements', () => {
    it('should call getLedgerEntries with default page and pageSize', () => {
      accountsAdapterSpy.getLedgerEntries.and.returnValue(
        of({ success: true, data: [] })
      );
      service.getMovements('org-001', 'acc-001').subscribe();
      expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalledWith(
        'org-001', 'acc-001', 1, 20
      );
    });

    it('should pass custom filters to getLedgerEntries', () => {
      accountsAdapterSpy.getLedgerEntries.and.returnValue(
        of({ success: true, data: [] })
      );
      service.getMovements('org-001', 'acc-001', { page: 2, page_size: 50 }).subscribe();
      expect(accountsAdapterSpy.getLedgerEntries).toHaveBeenCalledWith(
        'org-001', 'acc-001', 2, 50
      );
    });
  });

  describe('sendSpei', () => {
    it('should delegate to TransfersAdapter.createTransfer', () => {
      const request = {
        source_account_id: 'acc-001',
        destination_clabe: '987654321098765432',
        destination_name: 'Juan Perez',
        amount: 1000,
        concept: 'Pago renta',
      };

      service.sendSpei('org-001', request).subscribe((result) => {
        expect(result).toEqual(mockTransferResponse);
      });

      expect(transfersAdapterSpy.createTransfer).toHaveBeenCalledWith('org-001', request);
    });

    it('should propagate error when transfer fails', () => {
      transfersAdapterSpy.createTransfer.and.returnValue(
        throwError(() => new Error('Insufficient funds'))
      );
      let errorCaught = false;
      service.sendSpei('org-001', {
        source_account_id: 'acc-001',
        destination_clabe: '000000000000000000',
        destination_name: 'Test',
        amount: 99999,
        concept: 'test',
      }).subscribe({ error: () => { errorCaught = true; } });
      expect(errorCaught).toBeTrue();
    });
  });

  describe('getProfile', () => {
    it('should make GET request to /users/me', () => {
      const mockProfile = {
        success: true,
        data: {
          user_id: 'u-001',
          name: 'Ana Lopez',
          email: 'ana@test.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      let result: unknown;
      service.getProfile().subscribe((r) => { result = r; });

      const req = httpMock.expectOne((r) => r.url.includes('/users/me'));
      expect(req.request.method).toBe('GET');
      req.flush(mockProfile);

      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should make PATCH request to /users/me with updated data', () => {
      const updated = {
        success: true,
        data: {
          user_id: 'u-001',
          name: 'Ana Maria Lopez',
          email: 'ana@test.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      let result: unknown;
      service.updateProfile({ name: 'Ana Maria Lopez' }).subscribe((r) => { result = r; });

      const req = httpMock.expectOne((r) => r.url.includes('/users/me'));
      expect(req.request.method).toBe('PATCH');
      req.flush(updated);

      expect((result as { data: { name: string } }).data.name).toBe('Ana Maria Lopez');
    });

    it('should send only provided fields in the request body', () => {
      service.updateProfile({ name: 'Test User' }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/users/me'));
      expect(req.request.body).toEqual({ name: 'Test User' });
      req.flush({ success: true, data: {} });
    });
  });
});
