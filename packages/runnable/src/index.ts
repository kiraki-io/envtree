import { loadEnvTree } from "envtree";
import path = require("path");

export const loadAllEnv = () => {
  console.log(path.resolve());

  const result = loadEnvTree({
    startDir: path.resolve()
  })

  console.log(result)
  console.log("env", process.env);
}

loadAllEnv()
