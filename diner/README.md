# diner — la app del comensal

Frontend del bloque 3. **Solo habla con `experience/`** (`/api/v1/*` por proxy
same-origin); no importa nada de `pos/` ni conoce Odoo ni el registro
(`docs/decisiones/2026-09-05-comensal-app-aparte.md`).

```bash
npm ci && npm run dev            # 192.168.56.10:3001 · EXPERIENCE_ORIGIN=http://192.168.56.10:8001
npm test -- lib components       # unit por lotes
PLAYWRIGHT_BASE_URL=http://192.168.56.10:3001 npx playwright test
```

Rutas: `/<rest>/<sede>` (domicilio) y `/<rest>/<sede>/t/<token>` (mesa), más
`/carta`, `/plato/<id>`, `/pedido`, `/estado/<id>`, `/cuenta`. La marca del
restaurante llega en `contexto.marca` y se aplica como variables `--r-*`.
