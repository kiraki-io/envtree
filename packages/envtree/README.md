# EnvTree 🌳

[![npm version](https://badge.fury.io/js/envtree.svg)](https://badge.fury.io/js/envtree)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Grow and load your envs. Organically.

EnvTree is a smart environment variable loader that automatically discovers and loads `.env` files from your current directory up to your workspace root, following Next.js environment loading conventions. Execute any command with your environment variables loaded using the simple `envtree -- command` syntax.

## Features

- 🔍 **Smart Workspace Detection**: Automatically finds your workspace root using lockfiles or workspace indicators
- 📁 **Hierarchical Loading**: Loads `.env` files from workspace root down to current directory
- ⚡ **Next.js Convention**: Follows Next.js environment loading strategy with proper priority
- 🚀 **Command Execution**: Execute commands with loaded environment variables (`envtree -- command`)
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

## How It Works

EnvTree automatically:

1. 🔍 **Finds your workspace root** using lockfiles or workspace indicators
2. 📁 **Discovers .env files** from workspace root down to your current directory
3. ⚡ **Loads variables** following Next.js priority conventions
4. 🚀 **Executes your command** with all environment variables available

Perfect for running development commands, build scripts, tests, or any tool that needs environment variables.

## Quick Start

### Command Execution (Recommended)

```bash
# Execute any command with loaded environment variables
npx envtree -- printenv DATABASE_URL
npx envtree -- npm run build
npx envtree -- node my-script.js
npx envtree -- python manage.py runserver

# With verbose output to see what's loaded
npx envtree --verbose -- npm start

# Different environments
npx envtree --node-env production -- npm run build
```

### Basic CLI Usage

```bash
# Load and display .env files (default behavior)
npx envtree

# Load from specific directory
npx envtree /path/to/project

# Show detailed information about loaded files
npx envtree --verbose



# Get workspace detection info
npx envtree info
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
├── .env.development            # ← 2. Loaded second
├── .env.local                  # ← 3. Loaded third
├── .env.development.local      # ← 4. Loaded fourth
├── packages/
│   └── my-app/
│       ├── .env                # ← 5. Loaded fifth
│       ├── .env.development    # ← 6. Loaded sixth
│       ├── .env.local          # ← 7. Loaded seventh
│       └── .env.development.local # ← 8. Loaded last (highest priority)
```

## CLI Options

```
Usage: envtree [options] [dir] [-- command...]

Arguments:
  dir                            Starting directory to search from (default: current directory)

Options:
  -V, --version                  output the version number
  -c, --convention <type>        Environment loading strategy (nextjs) (default: "nextjs")

  --node-env <env>               Override NODE_ENV for nextjs convention (default: "development")
  --verbose                      Show detailed information about loaded files
  -h, --help                     display help for command

Commands:
  info [dir]                     Show information about workspace detection

Command Execution:
  envtree -- <command>           Execute command with loaded environment variables
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

### Command Execution

Execute any command with loaded environment variables using the `--` syntax:

```bash
# Common development commands
npx envtree -- npm run dev
npx envtree -- npm run build
npx envtree -- npm test

# Node.js scripts
npx envtree -- node server.js
npx envtree -- node scripts/migrate.js

# Other languages and tools
npx envtree -- python manage.py runserver
npx envtree -- cargo run
npx envtree -- go run main.go

# View environment variables
npx envtree -- printenv DATABASE_URL
npx envtree -- printenv API_URL

# Chain multiple commands
npx envtree -- sh -c 'printenv DATABASE_URL && npm run build'

# With verbose output to see loaded files and variables
npx envtree --verbose -- npm start
```

### Environment Modes

```bash
# Development mode (default)
npx envtree -- npm run dev
npx envtree --node-env development -- npm start

# Production mode
npx envtree --node-env production -- npm run build

# Staging mode
npx envtree --node-env staging -- npm run deploy
```

### Monorepo Usage

```bash
# From any package in a monorepo - finds workspace root automatically
npx envtree --verbose -- npm run build

# From specific package directory
cd packages/api && npx envtree -- npm start

# Run commands from workspace root for specific packages
npx envtree -- npm run build --workspace=packages/api
```

### Basic Usage (Information Only)

```bash
# Load and display environment variables (no command execution)
npx envtree

# From specific directory
npx envtree /path/to/my-project

# Show detailed information about loaded files
npx envtree --verbose


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

## Contributing

We welcome contributions! <!-- Please see our [Contributing Guide](https://github.com/kiraki-io/envtree/blob/main/CONTRIBUTING.md) for details. -->

### Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/kiraki-io/envtree/issues).

### Development

```bash
# Clone the repository
git clone https://github.com/kiraki-io/envtree.git
cd envtree

# Install dependencies
pnpm install

# Build the package
pnpm build

# Run in development mode
pnpm dev
```

## License

MIT
