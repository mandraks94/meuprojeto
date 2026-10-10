# Diretrizes do Projeto (Instagram Tools / Polaris)

## Regra de Ouro: Proibição de API REST (`/api/v1/...`)
- **A página oficial do Instagram (Web / Polaris) NÃO aceita mais rotas da API REST (`/api/v1/...`)**.
- Chamadas para endpoints como `/api/v1/feed/reels_media/`, `/api/v1/users/...`, `/api/v1/friendships/...` retornam erro ou são bloqueadas pelo Instagram web.
- **TODA E QUALQUER consulta, extração ou mutação no Instagram DEVE ser realizada exclusivamente via Polaris (GraphQL / Relay Modern)**:
  - Endpoint: `https://www.instagram.com/api/graphql` (POST com `fb_api_req_friendly_name`, `doc_id`, `variables`, `lsd`, `fb_dtsg`, headers Polaris).
  - Ou endpoint: `https://www.instagram.com/graphql/query/?query_hash=...` ou `?doc_id=...` com `variables` devidamente codificados.
- Nunca proponha ou tente utilizar rotas REST legadas do Instagram.
