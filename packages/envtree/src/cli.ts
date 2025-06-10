#!/usr/bin/env node

import { Command } from "commander";
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
    "--no-set-env",
    "Do not set environment variables, just show what would be loaded"
  )
  .option(
    "--node-env <env>",
    "Override NODE_ENV for nextjs convention",
    process.env.NODE_ENV || "development"
  )
  .option("--verbose", "Show detailed information about loaded files")
  .action((dir, options) => {
    const envTreeOptions: EnvTreeOptions = {
      convention: options.convention as "nextjs",
      startDir: dir,
      setEnv: options.setEnv,
      nodeEnv: options.nodeEnv,
    };

    const result = loadEnvTree(envTreeOptions);

    if (!result) {
      console.error("❌ No workspace root found. Could not locate .env files.");
      process.exit(1);
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

    if (options.setEnv) {
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
    } else {
      console.log(
        `📋 Found ${envCount} environment variables in ${result.filesLoaded.length} files (not set)`
      );

      if (options.verbose) {
        console.log("\n🔑 Environment variables found:");
        Object.keys(result.envVars)
          .sort()
          .forEach((key) => {
            console.log(`  ${key}=${result.envVars[key]}`);
          });
      }
    }
  });

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
