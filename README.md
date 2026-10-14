# Measura

An open-source clone of Power BI Desktop: same Power Query, same DAX, same screens, on Windows, macOS and Linux.

> Early development. See the [roadmap](docs/ROADMAP.md).

## Running

Prerequisites: Rust (stable), Node 20+, pnpm 10 and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your system.

```sh
pnpm install
pnpm dev
```

The first build takes a few minutes because DuckDB is compiled from source.

## Documentation

- [Overview](docs/OVERVIEW.md): the problem and the proposal
- [Architecture](docs/ARCHITECTURE.md): how it is built
- [Roadmap](docs/ROADMAP.md): where we are
- [Compatibility](docs/COMPATIBILITY.md): what already works the same as in Power BI

## License

[Apache-2.0](LICENSE)

Measura is an independent project, not affiliated with or endorsed by Microsoft. Power BI is a trademark of Microsoft Corporation.
