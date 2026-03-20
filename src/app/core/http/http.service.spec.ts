/**
 * Pruebas unitarias para HttpService
 *
 * Valida que los headers de autenticacion se incluyan correctamente
 * en las peticiones HTTP al backend SuperPago.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpHeaders } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpService } from './http.service';
import { SharedStateService } from '../../shared-state/shared-state.service';

describe('HttpService', () => {
  let service: HttpService;
  let httpMock: HttpTestingController;
  let sharedStateSpy: jasmine.SpyObj<SharedStateService>;

  const testUrl = 'http://127.0.0.1:5001/api/v1/test';

  beforeEach(() => {
    sharedStateSpy = jasmine.createSpyObj('SharedStateService', ['rehydrate'], {
      accessToken: jasmine.createSpy('accessToken').and.returnValue('test-token-abc'),
      currentOrganizationId: jasmine.createSpy('currentOrganizationId').and.returnValue('org-123'),
      tenant: jasmine.createSpy('tenant').and.returnValue({
        id: 'superpago',
        apiKey: 'MASTER-SuperSecretKey123456789',
        name: 'SuperPago',
        domain: 'localhost',
        logo: null,
        primaryColor: null,
        theme: 'light',
        apiBaseUrl: null,
      }),
    });

    TestBed.configureTestingModule({
      providers: [
        HttpService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SharedStateService, useValue: sharedStateSpy },
      ],
    });

    service = TestBed.inject(HttpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('GET', () => {
    it('debe incluir Authorization header', () => {
      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-abc');
      req.flush({});
    });

    it('debe incluir X-API-KEY header', () => {
      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('X-API-KEY')).toBe('MASTER-SuperSecretKey123456789');
      req.flush({});
    });

    it('debe incluir X-Tenant-Id header', () => {
      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('X-Tenant-Id')).toBe('superpago');
      req.flush({});
    });

    it('debe incluir X-SP-Organization-Id header', () => {
      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('X-SP-Organization-Id')).toBe('org-123');
      req.flush({});
    });

    it('debe usar metodo GET', () => {
      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('POST', () => {
    it('debe enviar el body correctamente', () => {
      const body = { test: 'value' };
      service.post(testUrl, body).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({});
    });

    it('debe incluir Content-Type application/json', () => {
      service.post(testUrl, {}).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush({});
    });
  });

  describe('PUT', () => {
    it('debe enviar peticion PUT con body', () => {
      const body = { updated: true };
      service.put(testUrl, body).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({});
    });
  });

  describe('DELETE', () => {
    it('debe enviar peticion DELETE', () => {
      service.delete(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('PATCH', () => {
    it('debe enviar peticion PATCH con body', () => {
      const body = { name: 'updated' };
      service.patch(testUrl, body).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush({});
    });
  });

  describe('custom headers', () => {
    it('debe aceptar headers como Record<string, string>', () => {
      service.get(testUrl, { headers: { 'X-Custom': 'value' } }).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('X-Custom')).toBe('value');
      req.flush({});
    });

    it('debe aceptar headers como Record con array values', () => {
      service.get(testUrl, { headers: { 'X-Multi': ['a', 'b'] } }).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('X-Multi')).toBe('a, b');
      req.flush({});
    });

    it('debe aceptar headers como HttpHeaders', () => {
      const customHeaders = new HttpHeaders({ 'X-From-Headers': 'test-val' });
      service.get(testUrl, { headers: customHeaders }).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('X-From-Headers')).toBe('test-val');
      req.flush({});
    });
  });

  describe('sin tenantId/orgId', () => {
    it('no debe incluir X-Tenant-Id si tenantId es null', () => {
      (sharedStateSpy.tenant as jasmine.Spy).and.returnValue({
        id: null,
        apiKey: 'test-key',
      });

      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.has('X-Tenant-Id')).toBeFalse();
      req.flush({});
    });

    it('no debe incluir X-SP-Organization-Id si orgId es null', () => {
      (sharedStateSpy.currentOrganizationId as jasmine.Spy).and.returnValue(null);

      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.has('X-SP-Organization-Id')).toBeFalse();
      req.flush({});
    });

    it('debe usar environment.apiKey si tenant apiKey es null', () => {
      (sharedStateSpy.tenant as jasmine.Spy).and.returnValue({
        id: 'test',
        apiKey: null,
      });

      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.has('X-API-KEY')).toBeTrue();
      req.flush({});
    });
  });

  describe('con params', () => {
    it('GET debe incluir params', () => {
      service.get(testUrl, { params: { key: 'value' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === testUrl && r.params.get('key') === 'value');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('POST debe incluir params', () => {
      service.post(testUrl, {}, { params: { key: 'value' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === testUrl && r.params.get('key') === 'value');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('DELETE debe incluir params', () => {
      service.delete(testUrl, { params: { key: 'value' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === testUrl && r.params.get('key') === 'value');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('sin token', () => {
    it('no debe incluir Authorization si el token es el de dev', () => {
      (sharedStateSpy.accessToken as jasmine.Spy).and.returnValue('dev-token-for-testing');

      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      // El header Authorization no debe incluir el token de dev
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });

    it('no debe incluir Authorization si el token es null', () => {
      (sharedStateSpy.accessToken as jasmine.Spy).and.returnValue(null);

      service.get(testUrl).subscribe();

      const req = httpMock.expectOne(testUrl);
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });
  });
});
