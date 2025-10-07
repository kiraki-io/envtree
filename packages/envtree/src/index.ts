import { parse as parseDotenv } from 'dotenv';
import * as fs from 'fs';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as path from 'path';
import { findEnvFiles } from './workspace-utils.js';

export interface EnvTreeOptions {
  /**
   * The convention of environment loading strategy to use
   * - 'nextjs': Loads .env files in Next.js order (.env, .env.local, .env.[NODE_ENV], .env.[NODE_ENV].local)
   */
  convention?: 'nextjs';

  /**
   * Starting directory to search from
   */
  startDir?: string;

  /**
   * Whether to actually set environment variables or just return the merged object
   */
  setEnv?: boolean;

  /**
   * Custom environment (for nextjs convention)
   */
  nodeEnv?: string;

  /**
   * Only include env vars with this prefix (e.g. "NEXT_PUBLIC_")
   */
  prefixFilter?: string;

  /**
   * Enable detailed logging of all actions performed while loading envs
   */
  verbose?: boolean;
}

export interface EnvTreeResult {
  envVars: Record<string, string>;
  filesLoaded: string[];
  workspaceRoot: string;
  method: 'lockfile' | 'workspace-indicators';
}

/**
 * Parse a .env file asynchronously and return key-value pairs
 */
async function parseEnvFile(filePath: string): Promise<Record<string, string>> {
  try {
    const result = await readFile(filePath, 'utf8');
    return parseDotenv(result);
  } catch (error) {
    console.warn(`Warning: Could not parse ${filePath}:`, error);
    return {};
  }
}

/**
 * Parse a .env file synchronously and return key-value pairs
 */
function parseEnvFileSync(filePath: string): Record<string, string> {
  try {
    const result = readFileSync(filePath, 'utf8');
    return parseDotenv(result);
  } catch (error) {
    console.warn(`Warning: Could not parse ${filePath}:`, error);
    return {};
  }
}

/**
 * Get Next.js style .env files in priority order
 */
function getNextJsEnvFiles(
  workspaceRoot: string,
  currentDir: string,
  nodeEnv: string = process.env.NODE_ENV || 'development',
): string[] {
  const envFiles: string[] = [];

  // Collect directories from workspace root to current directory
  const dirs: string[] = [];
  let dir = path.resolve(currentDir);
  const root = path.resolve(workspaceRoot);

  while (dir.startsWith(root)) {
    dirs.push(dir);
    if (dir === root) break;
    dir = path.dirname(dir);
  }

  // For each directory, check for .env files in Next.js priority order
  for (const dirPath of dirs) {
    // .env.[NODE_ENV].local (environment-specific local overrides, highest priority)
    if (nodeEnv !== 'test') {
      const envNodeEnvLocal = path.join(dirPath, `.env.${nodeEnv}.local`);
      if (fs.existsSync(envNodeEnvLocal)) {
        envFiles.push(envNodeEnvLocal);
      }
    }

    // .env.local (local overrides for all environments except test)
    if (nodeEnv !== 'test') {
      const envLocal = path.join(dirPath, '.env.local');
      if (fs.existsSync(envLocal)) {
        envFiles.push(envLocal);
      }
    }

    // .env.[NODE_ENV] (environment-specific)
    const envNodeEnv = path.join(dirPath, `.env.${nodeEnv}`);
    if (fs.existsSync(envNodeEnv)) {
      envFiles.push(envNodeEnv);
    }

    // .env (base configuration)
    const envDefault = path.join(dirPath, '.env');
    if (fs.existsSync(envDefault)) {
      envFiles.push(envDefault);
    }
  }

  return envFiles;
}

/**
 * Filter environment variables by prefix
 */
function filterByPrefix(envVars: Record<string, string>, prefix?: string): Record<string, string> {
  if (!prefix) return envVars;
  return Object.fromEntries(Object.entries(envVars).filter(([key]) => key.startsWith(prefix)));
}

/**
 * Asynchronously load and merge environment variables from .env files
 */
export async function loadEnvTree(options: EnvTreeOptions = {}): Promise<EnvTreeResult | null> {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    convention = 'nextjs',
    startDir = process.cwd(),
    setEnv = true,
    nodeEnv = process.env.NODE_ENV || 'development',
    prefixFilter,
    verbose = false,
  } = options;

  const log = (...args: unknown[]) => {
    if (verbose) {
      console.log('🌿 [envtree]', ...args);
    }
  };

  log('Starting loadEnvTree with options:', {
    startDir,
    nodeEnv,
    prefixFilter,
  });

  log('Searching for workspace root and .env files ...');
  const result = findEnvFiles(startDir);
  if (!result) {
    log('No workspace root found');
    return null;
  }

  log(`Workspace root detected via ${result.method}:`, result.workspaceRoot);

  // Use Next.js loading strategy (currently the only supported convention)
  const filesToLoad = getNextJsEnvFiles(result.workspaceRoot, startDir, nodeEnv);
  log('Resolved candidate .env files (highest priority first):');
  filesToLoad.forEach((f, i) => log(`  ${i + 1}. ${f}`));

  // Load and merge environment variables
  const envVars: Record<string, string> = {};
  const filesLoaded: string[] = [];

  const loadOrder = [...filesToLoad].reverse();
  log('Final load order (base to highest priority):');
  loadOrder.forEach((f, i) => log(`  ${i + 1}. ${f}`));

  for (const filePath of loadOrder) {
    if (fs.existsSync(filePath)) {
      log('Parsing file:', filePath);
      const parsed = await parseEnvFile(filePath);
      const beforeCount = Object.keys(envVars).length;
      Object.assign(envVars, parsed);
      const afterCount = Object.keys(envVars).length;
      filesLoaded.push(filePath);
      log('Merged variables from', path.basename(filePath), `(+${afterCount - beforeCount})`);
    }
  }

  // Filter by prefix if specified
  const filteredEnvVars = filterByPrefix(envVars, prefixFilter);
  if (prefixFilter) {
    log(
      `Applied prefix filter "${prefixFilter}" -> kept ${Object.keys(filteredEnvVars).length} of ${
        Object.keys(envVars).length
      } variables`,
    );
  }

  // Set environment variables if requested
  if (setEnv) {
    let setCount = 0;
    for (const [key, value] of Object.entries(filteredEnvVars)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
        log(`Set ${key} = ${value}, old value: ${process.env[key]}`);
        setCount += 1;
      }
    }
    log(`Set ${setCount} new variables on process.env`);
  }

  log(
    `Completed loading: ${Object.keys(filteredEnvVars).length} variables from ${filesLoaded.length} files`,
  );

  return {
    envVars: filteredEnvVars,
    filesLoaded,
    workspaceRoot: result.workspaceRoot,
    method: result.method,
  };
}

/**
 * Synchronously load and merge environment variables from .env files
 */
export function loadEnvTreeSync(options: EnvTreeOptions = {}): EnvTreeResult | null {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    convention = 'nextjs',
    startDir = process.cwd(),
    setEnv = true,
    nodeEnv = process.env.NODE_ENV || 'development',
    prefixFilter,
  } = options;

  // Find .env files using workspace utilities
  const result = findEnvFiles(startDir);
  if (!result) {
    return null;
  }

  // Use Next.js loading strategy (currently the only supported convention)
  const filesToLoad = getNextJsEnvFiles(result.workspaceRoot, startDir, nodeEnv);

  // Load and merge environment variables
  const envVars: Record<string, string> = {};
  const filesLoaded: string[] = [];

  for (const filePath of filesToLoad.reverse()) {
    if (fs.existsSync(filePath)) {
      const parsed = parseEnvFileSync(filePath);
      Object.assign(envVars, parsed);
      filesLoaded.push(filePath);
    }
  }

  // Filter by prefix if specified
  const filteredEnvVars = filterByPrefix(envVars, prefixFilter);

  // Set environment variables if requested
  if (setEnv) {
    for (const [key, value] of Object.entries(filteredEnvVars)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  return {
    envVars: filteredEnvVars,
    filesLoaded,
    workspaceRoot: result.workspaceRoot,
    method: result.method,
  };
}

// Export workspace utilities for advanced usage
export {
  findEnvFiles,
  findEnvFilesUsingLockFiles,
  findEnvFilesUsingWorkspaceIndicators,
} from './workspace-utils.js';
export type { EnvFileResult } from './workspace-utils.js';
