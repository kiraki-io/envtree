# EnvTree 🌳

Grow and load your envs. Organically.

EnvTree is a smart environment variable loader that automatically discovers and loads `.env` files from your current directory up to your workspace root, following Next.js environment loading conventions.

## Features

- 🔍 **Smart Workspace Detection**: Automatically finds your workspace root using lockfiles or workspace indicators
- 📁 **Hierarchical Loading**: Loads `.env` files from workspace root down to current directory
- ⚡ **Next.js Convention**: Follows Next.js environment loading strategy with proper priority
- 🛠️ **CLI & Programmatic API**: Use via command line or import in your Node.js code
- 🎯 **TypeScript Support**: Full TypeScript support with proper type definitions

## Installation

```bash
npm install envtree
# or
pnpm add envtree
# or
yarn add envtree
```

## Quick Start

### CLI Usage

```bash
# Load .env files from current directory (default)
npx envtree

# Load .env files from specific directory
npx envtree /path/to/project

# Specify environment
npx envtree --node-env production

# Show detailed information
npx envtree --verbose

# Dry run (don't set environment variables)
npx envtree --no-set-env --verbose

# Get workspace detection info
npx envtree info
npx envtree info /path/to/project
```

### Programmatic Usage

```typescript
import { loadEnvTree } from "envtree";

// Basic usage with defaults
const result = loadEnvTree();

// With custom options
const result = loadEnvTree({
  convention: "nextjs",
  startDir: process.cwd(),
  setEnv: true,
  nodeEnv: "development",
});

if (result) {
  console.log(`Loaded ${Object.keys(result.envVars).length} variables`);
  console.log("Files loaded:", result.filesLoaded);
  console.log("Workspace root:", result.workspaceRoot);
}
```

## Loading Strategy

### Next.js Convention

EnvTree follows Next.js environment loading conventions with the following file types:

1. `.env` - Default environment variables
2. `.env.local` - Local overrides (ignored in test environment)
3. `.env.[NODE_ENV]` - Environment-specific variables (e.g., `.env.development`, `.env.production`)
4. `.env.[NODE_ENV].local` - Environment-specific local overrides (e.g., `.env.development.local`, ignored in test environment)

**Loading Priority (lowest to highest):**

- `.env` (base configuration, loaded first)
- `.env.local` (local overrides)
- `.env.[NODE_ENV]` (environment-specific, overrides base and local)
- `.env.[NODE_ENV].local` (environment-specific local overrides, highest priority)

The loading happens from workspace root to current directory, with files in subdirectories taking precedence over parent directories.

Example file structure and loading order:

```
workspace-root/
├── .env                        # ← 1. Loaded first (lowest priority)
├── .env.local                  # ← 2. Loaded second
├── .env.development            # ← 3. Loaded third
├── .env.development.local      # ← 4. Loaded fourth
├── packages/
│   └── my-app/
│       ├── .env                # ← 5. Loaded fifth
│       ├── .env.local          # ← 6. Loaded sixth
│       ├── .env.development    # ← 7. Loaded seventh
│       └── .env.development.local # ← 8. Loaded last (highest priority)
```

## CLI Options

```
Usage: envtree [options] [dir]

Arguments:
  dir                            Starting directory to search from (default: current directory)

Options:
  -V, --version                  output the version number
  -c, --convention <type>        Environment loading strategy (nextjs) (default: "nextjs")
  --no-set-env                   Do not set environment variables, just show what would be loaded
  --node-env <env>               Override NODE_ENV for nextjs convention (default: "development")
  --verbose                      Show detailed information about loaded files
  -h, --help                     display help for command

Commands:
  info [dir]                     Show information about workspace detection
```

## API Reference

### `loadEnvTree(options?: EnvTreeOptions): EnvTreeResult | null`

Loads environment variables from `.env` files in your workspace tree using Next.js conventions.

#### Parameters

```typescript
interface EnvTreeOptions {
  /** Loading strategy: currently only 'nextjs' is supported */
  convention?: "nextjs";

  /** Starting directory to search from */
  startDir?: string;

  /** Whether to set environment variables */
  setEnv?: boolean;

  /** Custom NODE_ENV for nextjs convention */
  nodeEnv?: string;
}
```

#### Returns

```typescript
interface EnvTreeResult {
  /** Merged environment variables */
  envVars: Record<string, string>;

  /** List of files that were loaded */
  filesLoaded: string[];

  /** Detected workspace root */
  workspaceRoot: string;

  /** Detection method used */
  method: "lockfile" | "workspace-indicators";
}
```

## Workspace Detection

EnvTree automatically detects your workspace root using two methods:

### Lock File Method (Preferred)

Looks for common lockfiles:

- `package-lock.json` (npm)
- `yarn.lock` (Yarn)
- `pnpm-lock.yaml` (pnpm)
- `bun.lockb` (Bun)

### Workspace Indicator Method (Fallback)

Looks for workspace configuration files:

- `.git` (Git repository)
- `lerna.json` (Lerna)
- `nx.json` (Nx)
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- And many more...

Use `npx envtree info` to see detailed workspace detection analysis.

## Examples

### Basic Usage

```bash
# Load environment variables from current directory
npx envtree

# From specific directory
npx envtree /path/to/my-project
```

### Environment Modes

```bash
# Development mode (default)
npx envtree --node-env development

# Production mode
npx envtree --node-env production

# Staging mode
npx envtree --node-env staging
```

### Monorepo Usage

```bash
# From any package in a monorepo
npx envtree --verbose
# Will find workspace root and load .env files from root down to current package

# From specific package directory
npx envtree packages/api --verbose
```

### Programmatic Integration

```typescript
// In your application startup
import { loadEnvTree } from "envtree";

// Load environment variables before anything else
const envResult = loadEnvTree({ setEnv: true });

if (!envResult) {
  console.error("Failed to load environment variables");
  process.exit(1);
}

console.log(
  `Loaded ${Object.keys(envResult.envVars).length} environment variables`
);

// Your application code here
import "./app";
```

### Custom Directory and Environment

```typescript
import { loadEnvTree } from "envtree";

const result = loadEnvTree({
  startDir: "/path/to/project",
  nodeEnv: "production",
  setEnv: false, // Don't set env vars, just return them
});

if (result) {
  // Use result.envVars object manually
  console.log("Environment variables:", result.envVars);
}
```

## License

MIT
