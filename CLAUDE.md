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

