import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OnboardingDetailComponent } from './onboarding-detail.component';

describe('OnboardingDetailComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({
      imports: [OnboardingDetailComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(OnboardingDetailComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
