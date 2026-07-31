# Casa Amoremio — Portal Inox

Prova de conceito isolada. Ela não é carregada pela home, não altera o
catálogo e não possui integração com Supabase.

## Abrir localmente

Inicie um servidor estático na raiz do projeto e abra:

`/lab/portal-inox.html`

Para conferir manualmente o fallback sem WebGL:

`/lab/portal-inox.html?fallback=1`

## Substituir a peça temporária

1. Exporte a fotografia real com fundo transparente.
2. Substitua
   `assets/portal-inox/product-ring-placeholder.png`, preservando o nome; ou
3. altere apenas `productTextureUrl` no início de `js/portal-inox.js`.

Para melhor resultado, use imagem quadrada, centralizada, com transparência e
no máximo 1600 × 1600 px.

## Dependências

Three.js e GSAP/ScrollTrigger usam versões fixadas e são carregados por CDN.
Não há processo de build nem dependência instalada no restante da loja.
