#!/usr/bin/env node

import { Command } from "commander";
import { spawn } from "child_process";
import { EnvTreeOptions, loadEnvTree } from "./index.js";

const program = new Command();

program
  .name("envtree")
  .description("Grow and load your envs. Organically.")
  .version("0.1.0");

program
  .argument("[dir]", "Starting directory to search from", process.cwd())
  .option(
    "-c, --convention <type>",
    "Environment loading strategy (nextjs)",
    "nextjs"
  )

  .option(
    "--node-env <env>",
    "Override NODE_ENV for nextjs convention",
    process.env.NODE_ENV || "development"
  )
  .option("--verbose", "Show detailed information about loaded files")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .action(async (dir, options) => {
    const envTreeOptions: EnvTreeOptions = {
      convention: options.convention as "nextjs",
      startDir: dir,
      setEnv: true, // Always set environment variables for command execution
      nodeEnv: options.nodeEnv,
    };

    const result = await loadEnvTree(envTreeOptions);

    if (!result) {
      console.error("❌ No workspace root found. Could not locate .env files.");
      process.exit(1);
    }

    // Check if there are arguments after "--"
    const rawArgs = process.argv.slice(2);
    const dashIndex = rawArgs.indexOf("--");
    let commandToRun: string[] = [];

    if (dashIndex !== -1) {
      // Extract command after "--"
      commandToRun = rawArgs.slice(dashIndex + 1);
    }

    if (options.verbose) {
      console.log(`🌳 EnvTree - Loading environment variables`);
      console.log(`📁 Workspace root: ${result.workspaceRoot}`);
      console.log(`🔍 Detection method: ${result.method}`);
      console.log(`📋 Convention: ${options.convention}`);
      console.log(`📂 Starting directory: ${dir}`);
      console.log(`🌍 NODE_ENV: ${options.nodeEnv}`);
      console.log("");
    }

    if (result.filesLoaded.length === 0) {
      console.log("⚠️  No .env files found in the workspace tree.");
      if (commandToRun.length > 0) {
        // Still execute the command even if no env files found
        executeCommand(commandToRun, {});
      }
      return;
    }

    if (options.verbose) {
      console.log("📄 Files loaded (in order):");
      result.filesLoaded.forEach((file: string, index: number) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      console.log("");
    }

    const envCount = Object.keys(result.envVars).length;

    if (commandToRun.length > 0) {
      // Execute command with loaded environment variables
      if (options.verbose) {
        console.log(
          `🚀 Executing command with ${envCount} environment variables: ${commandToRun.join(" ")}`
        );
        console.log("");
      }
      executeCommand(commandToRun, result.envVars);
    } else {
      // Default behavior - just show what was loaded
      console.log(
        `✅ Loaded ${envCount} environment variables from ${result.filesLoaded.length} files`
      );

      if (options.verbose) {
        console.log("\n🔑 Environment variables loaded:");
        Object.keys(result.envVars)
          .sort()
          .forEach((key) => {
            console.log(`  ${key}=${result.envVars[key]}`);
          });
      }
    }
  });

/**
 * Execute a command with the given environment variables
 */
function executeCommand(command: string[], envVars: Record<string, string>) {
  if (command.length === 0) {
    console.error("❌ No command specified");
    process.exit(1);
  }

  const [cmd, ...args] = command;

  // Merge loaded env vars with current process env
  const env = { ...process.env, ...envVars };

  const child = spawn(cmd!, args, {
    env,
    stdio: "inherit",
    shell: true,
  });

  child.on("close", (code: number | null) => {
    process.exit(code || 0);
  });

  child.on("error", (error: Error) => {
    console.error(`❌ Failed to execute command: ${error.message}`);
    process.exit(1);
  });
}

program
  .command("info")
  .description("Show information about workspace detection")
  .argument("[dir]", "Starting directory to search from", process.cwd())
  .action(async (dir) => {
    const { compareWorkspaceDetectionMethods } = await import(
      "./workspace-utils.js"
    );
    const comparison = compareWorkspaceDetectionMethods(dir);

    console.log("🔍 Workspace Detection Analysis");
    console.log("===============================");

    if (comparison.lockFileMethod) {
      console.log("\n📦 Lock File Method:");
      console.log(
        `  ✅ Found workspace root: ${comparison.lockFileMethod.workspaceRoot}`
      );
      console.log(
        `  📄 .env files found: ${comparison.lockFileMethod.envFiles.length}`
      );
      comparison.lockFileMethod.envFiles.forEach(
        (file: string, index: number) => {
          console.log(`    ${index + 1}. ${file}`);
        }
      );
    } else {
      console.log("\n📦 Lock File Method: ❌ No workspace root found");
    }

    if (comparison.workspaceIndicatorMethod) {
      console.log("\n🏷️  Workspace Indicator Method:");
      console.log(
        `  ✅ Found workspace root: ${comparison.workspaceIndicatorMethod.workspaceRoot}`
      );
      console.log(
        `  📄 .env files found: ${comparison.workspaceIndicatorMethod.envFiles.length}`
      );
      comparison.workspaceIndicatorMethod.envFiles.forEach(
        (file: string, index: number) => {
          console.log(`    ${index + 1}. ${file}`);
        }
      );
    } else {
      console.log(
        "\n🏷️  Workspace Indicator Method: ❌ No workspace root found"
      );
    }

    console.log(`\n💡 Recommendation: ${comparison.recommendation}`);
  });

program.parse();
