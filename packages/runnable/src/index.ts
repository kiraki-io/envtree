import { loadEnvTree, loadEnvTreeSync } from 'envtree';
import * as path from 'path';

export const loadAllEnv = async () => {
  const result = await loadEnvTree({
    startDir: path.resolve(),
  });

  console.log(result);
  console.log(process.env);
};

export const loadAllEnvSync = () => {
  const result = loadEnvTreeSync({
    startDir: path.resolve(),
    prefixFilter: 'NEXT_PUBLIC_',
  });

  console.log(result);
  console.log(process.env);
};

loadAllEnvSync();
