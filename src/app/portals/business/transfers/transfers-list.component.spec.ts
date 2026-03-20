import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TransfersListComponent } from './transfers-list.component';
import { SharedStateService } from '@shared-state';
import { TransfersAdapter } from '@infrastructure/adapters/transfers.adapter';

const mockSharedState = {
  currentOrganizationId: () => 'org-1',
  tenant: () => ({ id: 'sp', apiKey: 'k' }),
  accessToken: () => 'tok',
};

describe('TransfersListComponent', () => {
  let transfersAdapterSpy: jasmine.SpyObj<TransfersAdapter>;

  beforeEach(() => {
    transfersAdapterSpy = jasmine.createSpyObj('TransfersAdapter', ['getTransfers']);
    transfersAdapterSpy.getTransfers.and.returnValue(of({ success: true, data: [] }));

    TestBed.configureTestingModule({
      imports: [TransfersListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SharedStateService, useValue: mockSharedState },
        { provide: TransfersAdapter, useValue: transfersAdapterSpy },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(TransfersListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load transfers on init', () => {
    const fixture = TestBed.createComponent(TransfersListComponent);
    fixture.detectChanges();
    expect(transfersAdapterSpy.getTransfers).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should handle error and stop loading', () => {
    transfersAdapterSpy.getTransfers.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(TransfersListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('should stop loading when no orgId', () => {
    TestBed.overrideProvider(SharedStateService, { useValue: { ...mockSharedState, currentOrganizationId: () => null } });
    const fixture = TestBed.createComponent(TransfersListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });
});
