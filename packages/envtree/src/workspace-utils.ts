import * as fs from 'fs';
import * as path from 'path';
import { ALL_WORKSPACE_FILES, LOCK_FILES, WORKSPACE_INDICATORS } from './constants.js';

/**
 * Check if a file/directory exists
 */
function isPathAvailable(filePath: string): boolean {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory contains any of the specified files
 */
function containsAnyOfFiles(dirPath: string, files: string[]): boolean {
  return files.some((file) => isPathAvailable(path.join(dirPath, file)));
}

/**
 * Check if a directory contains valid workspace indicators
 */
function containsValidWorkspaceIndicators(dirPath: string): boolean {
  return WORKSPACE_INDICATORS.some((indicator: string) => {
    const fullPath = path.join(dirPath, indicator);
    return isPathAvailable(fullPath) && isValidWorkspaceConfig(fullPath);
  });
}

/**
 * Get all .env files in a directory
 */
function getEnvFilesInDirectory(dirPath: string): string[] {
  try {
    const files = fs.readdirSync(dirPath);
    return files
      .filter((file) => file.startsWith('.env'))
      .map((file) => path.join(dirPath, file))
      .filter((filePath) => fs.statSync(filePath).isFile());
  } catch {
    return [];
  }
}

/**
 * Check if a package.json indicates a workspace root
 */
function isWorkspacePackageJson(packageJsonPath: string): boolean {
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(content);

    // Check for workspaces field (npm/yarn)
    if (pkg.workspaces) return true;

    // Check if there are any valid workspace indicator files in the same directory
    const dirPath = path.dirname(packageJsonPath);
    if (containsValidWorkspaceIndicators(dirPath)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check workspace config files that need content validation
 */
function isValidWorkspaceConfig(filePath: string): boolean {
  const fileName = path.basename(filePath);

  try {
    switch (fileName) {
      case 'cargo.toml': {
        const content = fs.readFileSync(filePath, 'utf8');
        // Check if cargo.toml has a [workspace] section
        return /^\s*\[workspace\]/m.test(content);
      }

      case 'deno.json':
      case 'deno.jsonc': {
        const content = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(content);
        // Check if it has workspace configuration
        return !!(config.workspace || config.workspaces);
      }

      case '.vscode/settings.json': {
        const content = fs.readFileSync(filePath, 'utf8');
        const settings = JSON.parse(content);
        // Check if it's a multi-root workspace
        return !!(settings['folders'] || settings['workspace.folders']);
      }

      default:
        // Check if the file name matches any known workspace file
        return ALL_WORKSPACE_FILES.includes(fileName);
    }
  } catch {
    // If we can't read/parse the file, assume it's not a valid workspace config
    return false;
  }
}

export interface EnvFileResult {
  envFiles: string[];
  workspaceRoot: string;
  method: 'lockfile' | 'workspace-indicators';
}

/**
 * Find all .env files from current directory up to workspace root (using lock files)
 */
export function findEnvFilesUsingLockFiles(startDir: string = process.cwd()): EnvFileResult | null {
  const envFiles: string[] = [];
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    // Collect .env files in current directory
    const currentEnvFiles = getEnvFilesInDirectory(currentDir);
    envFiles.push(...currentEnvFiles);

    // Check if current directory contains a lock file
    if (containsAnyOfFiles(currentDir, LOCK_FILES)) {
      return {
        envFiles: envFiles.reverse(), // Reverse to have files from root to current
        workspaceRoot: currentDir,
        method: 'lockfile',
      };
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  return null; // No workspace root found
}

/**
 * Find all .env files from current directory up to workspace root (using alternative methods)
 */
export function findEnvFilesUsingWorkspaceIndicators(
  startDir: string = process.cwd(),
): EnvFileResult | null {
  const envFiles: string[] = [];
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    // Collect .env files in current directory
    const currentEnvFiles = getEnvFilesInDirectory(currentDir);
    envFiles.push(...currentEnvFiles);

    // Check for workspace indicators with validation
    if (containsValidWorkspaceIndicators(currentDir)) {
      return {
        envFiles: envFiles.reverse(), // Reverse to have files from root to current
        workspaceRoot: currentDir,
        method: 'workspace-indicators',
      };
    }

    // Check for workspace package.json
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (isPathAvailable(packageJsonPath) && isWorkspacePackageJson(packageJsonPath)) {
      return {
        envFiles: envFiles.reverse(),
        workspaceRoot: currentDir,
        method: 'workspace-indicators',
      };
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  return null; // No workspace root found
}

/**
 * Find all .env files using both methods and return the best result
 */
export function findEnvFiles(startDir: string = process.cwd()): EnvFileResult | null {
  // Try lock files first (more reliable for dependency management)
  const lockFileResult = findEnvFilesUsingLockFiles(startDir);
  if (lockFileResult) {
    return lockFileResult;
  }

  // Fallback to workspace indicators
  return findEnvFilesUsingWorkspaceIndicators(startDir);
}

/**
 * Compare both methods and return detailed results
 */
export function compareWorkspaceDetectionMethods(startDir: string = process.cwd()): {
  lockFileMethod: EnvFileResult | null;
  workspaceIndicatorMethod: EnvFileResult | null;
  recommendation: string;
} {
  const lockFileResult = findEnvFilesUsingLockFiles(startDir);
  const workspaceIndicatorResult = findEnvFilesUsingWorkspaceIndicators(startDir);

  let recommendation = '';

  if (lockFileResult && workspaceIndicatorResult) {
    if (lockFileResult.workspaceRoot === workspaceIndicatorResult.workspaceRoot) {
      recommendation =
        'Both methods found the same workspace root. Lock file method is recommended for dependency-based projects.';
    } else {
      recommendation =
        'Methods found different workspace roots. Lock file method is generally more reliable for Node.js projects.';
    }
  } else if (lockFileResult) {
    recommendation =
      'Only lock file method found a workspace root. This is typical for projects with dependency management.';
  } else if (workspaceIndicatorResult) {
    recommendation =
      'Only workspace indicator method found a workspace root. This might be a non-Node.js project or missing lock files.';
  } else {
    recommendation =
      'No workspace root found with either method. You might be in a standalone project or need to initialize a workspace.';
  }

  return {
    lockFileMethod: lockFileResult,
    workspaceIndicatorMethod: workspaceIndicatorResult,
    recommendation,
  };
}
