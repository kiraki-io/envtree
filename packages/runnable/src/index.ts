import { loadEnvTree } from "envtree";
import * as path from "path";

export const loadAllEnv = () => {
  console.log(path.resolve());

  const result = loadEnvTree({
    startDir: path.resolve(),
  });

  console.log(result);
};

loadAllEnv();
