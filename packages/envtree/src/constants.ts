/**
 * Lock files that indicate workspace root
 */
export const LOCK_FILES = [
  'package-lock.json', // npm
  'yarn.lock', // yarn v1/v2+
  'pnpm-lock.yaml', // pnpm
  'bun.lockb', // bun
];

/**
 * Alternative workspace root indicators
 */
export const WORKSPACE_INDICATORS = [
  '.git', // git repository root
  'lerna.json', // lerna monorepo
  'nx.json', // nx workspace
  'rush.json', // rush monorepo
  'workspace.json', // generic workspace config
  'pnpm-workspace.yaml', // pnpm workspace
  'turbo.json', // turborepo
  'bazel.build', // bazel workspace
  'WORKSPACE', // bazel workspace (alternative)
  'deno.json', // deno workspace
  'deno.jsonc', // deno workspace (with comments)
  'cargo.toml', // rust workspace (check if has workspace section)
  'go.work', // go workspace
  '.vscode/settings.json', // vscode workspace (multi-root)
];

/**
 * All workspace file names that can be used for validation
 */
export const ALL_WORKSPACE_FILES = [
  ...LOCK_FILES,
  ...WORKSPACE_INDICATORS,
  'package.json', // Also a workspace indicator when it has workspaces field
];
