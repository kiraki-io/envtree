import { config as dotenvConfig } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { findEnvFiles } from "./workspace-utils";

export interface EnvTreeOptions {
  /**
   * The convention of environment loading strategy to use
   * - 'nextjs': Loads .env files in Next.js order (.env, .env.local, .env.[NODE_ENV], .env.[NODE_ENV].local)
   */
  convention?: "nextjs";

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
}

export interface EnvTreeResult {
  envVars: Record<string, string>;
  filesLoaded: string[];
  workspaceRoot: string;
  method: "lockfile" | "workspace-indicators";
}

/**
 * Parse a .env file and return key-value pairs
 */
function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const result = dotenvConfig({ path: filePath });
    return result.parsed || {};
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
  nodeEnv: string = process.env.NODE_ENV || "development"
): string[] {
  const envFiles: string[] = [];

  // Collect directories from workspace root to current directory
  const dirs: string[] = [];
  let dir = path.resolve(currentDir);
  const root = path.resolve(workspaceRoot);

  while (dir.startsWith(root)) {
    dirs.unshift(dir);
    if (dir === root) break;
    dir = path.dirname(dir);
  }

  // For each directory, check for .env files in Next.js priority order
  for (const dirPath of dirs) {
    // .env (base configuration)
    const envDefault = path.join(dirPath, ".env");
    if (fs.existsSync(envDefault)) {
      envFiles.push(envDefault);
    }

    // .env.[NODE_ENV] (environment-specific)
    const envNodeEnv = path.join(dirPath, `.env.${nodeEnv}`);
    if (fs.existsSync(envNodeEnv)) {
      envFiles.push(envNodeEnv);
    }

    // .env.local (local overrides for all environments except test)
    if (nodeEnv !== "test") {
      const envLocal = path.join(dirPath, ".env.local");
      if (fs.existsSync(envLocal)) {
        envFiles.push(envLocal);
      }
    }

    // .env.[NODE_ENV].local (environment-specific local overrides, highest priority)
    if (nodeEnv !== "test") {
      const envNodeEnvLocal = path.join(dirPath, `.env.${nodeEnv}.local`);
      if (fs.existsSync(envNodeEnvLocal)) {
        envFiles.push(envNodeEnvLocal);
      }
    }
  }

  return envFiles;
}

/**
 * Load and merge environment variables from .env files
 */
export function loadEnvTree(
  options: EnvTreeOptions = {}
): EnvTreeResult | null {
  const {
    convention = "nextjs",
    startDir = process.cwd(),
    setEnv = true,
    nodeEnv = process.env.NODE_ENV || "development",
  } = options;

  // Find .env files using workspace utilities
  const result = findEnvFiles(startDir);
  if (!result) {
    return null;
  }

  // Use Next.js loading strategy (currently the only supported convention)
  const filesToLoad = getNextJsEnvFiles(
    result.workspaceRoot,
    startDir,
    nodeEnv
  );

  // Load and merge environment variables
  const envVars: Record<string, string> = {};
  const filesLoaded: string[] = [];

  for (const filePath of filesToLoad) {
    if (fs.existsSync(filePath)) {
      const parsed = parseEnvFile(filePath);
      Object.assign(envVars, parsed);
      filesLoaded.push(filePath);
    }
  }

  // Set environment variables if requested
  if (setEnv) {
    for (const [key, value] of Object.entries(envVars)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  return {
    envVars,
    filesLoaded,
    workspaceRoot: result.workspaceRoot,
    method: result.method,
  };
}

// Export workspace utilities for advanced usage
export {
  findEnvFiles,
  findEnvFilesUsingLockFiles,
  findEnvFilesUsingWorkspaceIndicators
} from "./workspace-utils";
export type { EnvFileResult } from "./workspace-utils";

