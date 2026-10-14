# Measura

Um clone de código aberto do Power BI Desktop: mesmo Power Query, mesmo DAX, mesmas telas, em Windows, macOS e Linux.

> Em desenvolvimento inicial. Veja o [roadmap](docs/ROADMAP.md).

## Rodando

Pré-requisitos: Rust (stable), Node 20+, pnpm 10 e as [dependências do Tauri](https://v2.tauri.app/start/prerequisites/) para o seu sistema.

```sh
pnpm install
pnpm dev
```

A primeira compilação demora alguns minutos, porque o DuckDB é compilado junto.

## Documentação

- [Apresentação](docs/APRESENTACAO.md): o problema e a proposta
- [Arquitetura](docs/ARQUITETURA.md): como é construído
- [Roadmap](docs/ROADMAP.md): onde estamos
- [Compatibilidade](docs/compatibilidade.md): o que já funciona igual ao Power BI

## Licença

Apache-2.0
