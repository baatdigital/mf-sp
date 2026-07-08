# CLAUDE.md - Reglas Frontend Micro-frontends (mf-*)

## Cambios Frontend (OBLIGATORIO)

**Reglas para CUALQUIER cambio en este micro-frontend Angular.**

### Antes de pushear (OBLIGATORIO)

1. **Verificar localmente PRIMERO**:
   - `ng build` debe completar SIN errores
   - `ng serve` y verificar visualmente en `localhost` que el cambio se ve correcto
   - Si el cambio es visual (template/SCSS), NUNCA pushear sin haber verificado en el navegador local
   - Si las imagenes vienen de APIs externas (Instagram, Facebook CDN), probar con URLs expiradas/mock

2. **Verificar que el template compila correctamente**:
   - No mezclar `*ngIf` con `@if` en el mismo template sin razon
   - Verificar que todos los metodos referenciados en el template existen en el componente
   - Verificar que las signals usadas en el template estan declaradas

3. **Verificar Module Federation**:
   - Si se agrega una dependencia nueva (npm install), verificar si necesita ir en `skip` list de `federation.config.js`
   - Dependencias que NO son Angular core deben ir en `skip` (ej: echarts, ngx-echarts, chart.js, libs de terceros)
   - Despues de cambiar federation.config.js, hacer build de produccion y verificar que `remoteEntry.json` se genera

### Proceso de deploy (automatizado, sin ciclo manual)

Cuando el usuario pida un cambio frontend, ejecutar TODO esto en secuencia sin esperar confirmacion intermedia:

1. Build local + verificar visualmente: `ng build --configuration development`
2. Si hay tests del componente modificado, correrlos
3. Commit + push a develop
4. Esperar auto-PR o crear PR develop->main
5. Merge con admin: `gh pr merge N --admin --merge`
6. Esperar deploy a CDN: `gh run view` hasta completed
7. Invalidar CloudFront: `aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/mf/<nombre>/*"`
8. Esperar invalidacion completada
9. Reportar al usuario que ya puede probar con Ctrl+Shift+R

### Regla de oro

> **Si no lo verificaste visualmente en localhost, NO lo pushees.**
> **Si el cambio depende de datos de API externa, prueba con datos mock/fallback.**
> **Un solo push bien verificado > 5 pushes con fixes incrementales.**

### CloudFront Distribution IDs

| MF | Distribution ID | Invalidation path |
|----|----------------|-------------------|
| Todos los MF | E3A0H41AD1MAWR | /mf/<nombre>/* |
| mf-docs | E3KUPVMUHIA8K7 | /* |



<!-- RULE:composable-product-architecture v1 -->
## REGLA GLOBAL — Arquitectura de Producto Componible (CPA): Autónomo O Embebido, misma base [OBLIGATORIO]

> **Cada capacidad del ecosistema (facturación, contabilidad, banca, marketing, inventario, billing, notificaciones, POS…) se construye UNA sola vez y debe poder explotarse de DOS formas con la MISMA arquitectura: (1) como PRODUCTO PROPIO vendible (dominio, login y billing propios) y (2) como MÓDULO EMBEBIDO dentro de otro producto (banco, marketing, facturación…). Nunca se bifurca una capacidad en dos implementaciones "standalone" vs "embebida": es la misma, con dos modos de montaje.** (Complementa la regla anti-redundancia `RULE:reuse-before-create`.)

### 1. Backend — una implementación autoritativa, tres formas de consumo
- **Dominio único** en `covacha-libs` (modelos/repos) + **un servicio** `covacha-<cap>` (Flask). PROHIBIDO reimplementar el dominio en el consumidor.
- Se expone por: (a) **API pública + su propio frontend** → venta autónoma; (b) **S2S interno / eventos a un hub** (billing hub `POST /internal/billing/usage`, notificaciones `modnot-events`, etc.) → embebido en otro producto; (c) **import de covacha-libs** → reuso directo.
- Integrar a los **hubs centrales** existentes (billing, notificación, pagos, identidad), nunca duplicarlos.

### 2. Frontend — un `mf-<cap>` que es standalone Y remote a la vez
- **Un solo micro-frontend por capacidad**, que simultáneamente: (a) **monta standalone** (shell propio: login/signup, `domain`/`publicDomain`, branding propio) y (b) **se expone por Native Federation** (`exposes: ['./routes','./Component', …]`) para que un host lo embeba.
- **Detección de modo** (patrón mf-invoicing/mf-accounting): si el host provee JWT/branding → modo embebido; si no → modo standalone con su propio login. Un solo código, dos montajes.
- **Todo `mf-*` de producto lleva `mf-catalog.json`** (name, repo, port, owner, `domain`, `publicDomain`, `exposes`, `remoteEntry`, y `embeds`/`consumedBy` = qué remotes embebe y en qué hosts vive). Es el registro de composición del ecosistema.

### 3. Tenancy dual (una identidad, dos modos)
- **Standalone** → tenant self-service (p.ej. `modfact/fact_tenant`, `fact_tenant_ids` en el JWT): el cliente se registra y paga directo.
- **Embebido** → `modcore` org→`sp_client` (`sp_organization_ids`/`b2b_roles`): el host administra el módulo para SUS clientes.
- El servicio/MF resuelve el tenant del JWT según el modo; NUNCA del body (anti-IDOR). Vender el producto = elegir modo, no reescribir.

### 4. Composición explícita (matriz producto × host)
- Un producto embebe a otro **consumiendo su remote de federation + sus eventos/API de backend** (nunca copiando su lógica). Ej.: facturación vive standalone (`facturas.superpago.com.mx`) Y embebida en banco/marketing; contabilidad standalone Y embebida en banco/facturación/marketing.
- La relación se DECLARA en `mf-catalog.json` (`embeds`, `consumedBy`) y en el manifest de federation del host — es dato, no código ad-hoc.

### 5. Monetización componible
- El billing de cada producto (autónomo o embebido) emite `BillUsageEvent` al **hub único** con su `module_source` → un solo motor de precios (`modbilling.bill_price_list`) cobra al modo correcto (cliente directo standalone / host embebido). No hay billing por producto.

### 6. Checklist al crear/vender una capacidad
1. ¿Existe ya el dominio? (regla `RULE:reuse-before-create`) → extender.
2. Backend: dominio en covacha-libs + servicio + contrato de hub/S2S + API pública.
3. Frontend: `mf-<cap>` con shell standalone + `exposes` federation + `mf-catalog.json`.
4. Tenancy: soporta self-service Y org→sp_client.
5. Billing: emite al hub, no reimplementa.
6. Composición: declarar `embeds`/`consumedBy` en el catálogo.
