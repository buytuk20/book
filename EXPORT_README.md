# Project Assembler — Final Clean Export

This is the final source export of Project Assembler after the latest improvements.

## Latest features included

- Local multi-project workspace with automatic browser persistence
- Real multi-file upload from the device
- Text bundle import using `=== FILE: path ===` blocks
- JSON export and JSON import from pasted content or a local JSON file
- Path matching that handles project-root differences without ambiguous matches
- Relative-path safety checks against absolute paths and traversal segments
- Safe in-browser ZIP creation
- Arabic RTL and English LTR interfaces
- File preview, editing, deletion, search, coverage, and replacement confirmations

## Run locally

```bash
pnpm install
PORT=25065 BASE_PATH=/ pnpm --filter @workspace/project-assembler run dev
```

The application is local-first: projects are stored in the browser's localStorage. No backend, database, or login is required for local project storage.

## Intentionally excluded

`node_modules`, build output, Vite caches, coverage, logs, temporary files, internal agent metadata, uploaded archives, and generated ZIP exports.
