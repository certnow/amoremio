# Amoremio

Primeira entrega da loja virtual Amoremio: uma entrada editorial com cortinas de seda e o início da área da loja. O projeto é estático e compatível com GitHub Pages.

## Incluído nesta entrega

- entrada em tela cheia;
- duas cortinas marfim translúcidas;
- abertura por clique, toque ou teclado;
- vitrine mediterrânea revelada atrás da cortina;
- cabeçalho e chamada “Conheça a coleção” após a abertura;
- início da loja abaixo da entrada;
- adaptação para computador e celular;
- preferência por movimento reduzido;
- pausa das animações quando a aba fica oculta;
- arquivos preparados para catálogo, produtos e carrinho nas próximas etapas.

As páginas `produtos.html` e `produto.html` são apenas estruturas identificadas como provisórias. O arquivo `data/products.json` está vazio de propósito: nenhum produto, preço ou fotografia foi inventado.

## Estrutura

```text
/
├── index.html
├── produtos.html
├── produto.html
├── css/
│   ├── base.css
│   ├── components.css
│   ├── curtain.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── curtain.js
│   ├── products.js
│   └── cart.js
├── data/
│   └── products.json
└── assets/
    ├── images/
    ├── icons/
    └── textures/
```

## Como testar

### Site publicado

Acesse `https://certnow.github.io/amoremio/` e faça uma atualização completa da página depois de cada publicação.

### No computador

Como o JavaScript usa módulos, abra a pasta com um servidor local. Uma opção é a extensão Live Server do VS Code. Não abra apenas o `index.html` com dois cliques.

Verifique:

1. a cortina abre por clique, toque e tecla Enter;
2. o cabeçalho e o botão aparecem depois da abertura;
3. o botão leva ao início da loja;
4. a página volta a permitir rolagem depois da abertura;
5. a disposição se adapta a uma tela estreita;
6. a opção de reduzir movimento do sistema desativa as animações contínuas.

## Próximas etapas

Catálogo, busca, filtros, detalhes, variações, carrinho e pedido pelo WhatsApp serão implementados separadamente. Os arquivos atuais não simulam compra ou pagamento.
