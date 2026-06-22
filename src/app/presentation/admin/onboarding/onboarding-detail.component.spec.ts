import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { OnboardingDetailComponent } from './onboarding-detail.component';

describe('OnboardingDetailComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({
      imports: [OnboardingDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { params: of({ id: 'ob-001' }) } },
      ],
    });
    const fixture = TestBed.createComponent(OnboardingDetailComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit id from route params', (done) => {
    TestBed.configureTestingModule({
      imports: [OnboardingDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { params: of({ id: 'ob-123' }) } },
      ],
    });
    const fixture = TestBed.createComponent(OnboardingDetailComponent);
    fixture.detectChanges();

    fixture.componentInstance.id$.subscribe((id) => {
      expect(id).toBe('ob-123');
      done();
    });
  });
});
