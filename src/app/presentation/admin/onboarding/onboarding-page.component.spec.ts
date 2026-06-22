import { TestBed } from '@angular/core/testing';
import { OnboardingPageComponent } from './onboarding-page.component';

describe('OnboardingPageComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [OnboardingPageComponent] });
    const fixture = TestBed.createComponent(OnboardingPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
