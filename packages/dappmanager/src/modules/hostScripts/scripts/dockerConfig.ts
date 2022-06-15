import memoize from "memoizee";
import { runScript } from "../runScripts";

export const dockerConfig = memoize(
  async function (): Promise<string> {
    return await runScript("docker_config.sh");
  },
  // Prevent running this script more than once
  { promise: true, maxAge: 2000 }
);
