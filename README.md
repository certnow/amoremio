# Amoremio

Loja virtual estática publicada no GitHub Pages, com catálogo, administração e pedidos conectados ao Supabase.

> A entrada usa provisoriamente `assets/images/casa-amoremio-entrada-provisoria.png`. A imagem será trocada pela versão limpa quando ela for fornecida; a referência atual não foi recortada nem reconstruída.

## O que funciona

- entrada “Casa Amoremio” e transição para a loja;
- homepage com categorias e produtos em destaque do Supabase;
- catálogo real, busca e filtro por categoria;
- detalhes, fotos, material, medidas, variações, preço e estoque;
- carrinho persistente em `localStorage`;
- compra como visitante, sem conta obrigatória;
- validação segura de preço e estoque pela função `create_guest_order`;
- registro de clientes, pedidos e itens no Supabase;
- mensagem de WhatsApp com número e resumo do pedido;
- login administrativo pelo Supabase Auth;
- painel para categorias, produtos, fotos, variações, estoque, pedidos, clientes e informações da loja;
- layouts para computador e celular.

## Segurança

O frontend contém apenas a URL e a chave pública do Supabase. As tabelas usam RLS e somente perfis com `role = admin` podem alterar o catálogo. A chave `service_role`, a senha do banco e segredos administrativos nunca devem ser adicionados ao navegador ou ao GitHub.

## Páginas

- `index.html`: entrada e homepage;
- `produtos.html`: catálogo;
- `produto.html?produto=slug`: detalhes;
- `carrinho.html`: carrinho e finalização;
- `admin/index.html`: login;
- `admin/painel.html`: painel protegido.

## Como testar

Publicado: `https://certnow.github.io/amoremio/`

Administração: `https://certnow.github.io/amoremio/admin/`

Para teste local, abra a pasta por um servidor local, como a extensão Live Server. Não abra os arquivos apenas com dois cliques, pois o site usa módulos JavaScript.

### Fluxo principal

1. Entre no painel com o usuário administrativo.
2. Cadastre uma categoria.
3. Cadastre um produto, fotos e, se necessário, variações.
4. Confirme que ele aparece em `produtos.html`.
5. Adicione ao carrinho e preencha os dados do visitante.
6. Finalize: o Supabase valida e registra o pedido antes de abrir o WhatsApp.

As migrações e a auditoria de segurança estão em `supabase/`.
