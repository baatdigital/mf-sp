import { TestBed } from '@angular/core/testing';
import { PreferencesPageComponent } from './preferences-page.component';

describe('PreferencesPageComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [PreferencesPageComponent] });
    const fixture = TestBed.createComponent(PreferencesPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
