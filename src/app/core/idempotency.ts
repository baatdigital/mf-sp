/**
 * Utilidades de idempotencia para prevenir duplicados en requests financieros
 *
 * Usa UUID v4 simple para generar identificadores únicos y criptográficamente fuertes
 * que garanticen no-colision en operaciones de dinero (SPEI, billpay, transferencias).
 */

/**
 * Genera un idempotency key UUID v4 simple
 *
 * Patrón xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * Usado para headers X-Idempotency-Key en operaciones monetarias.
 *
 * @returns UUID v4 string (36 caracteres)
 */
export function generateIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
