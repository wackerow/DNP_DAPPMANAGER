import memoize from "memoizee";
import { runScript } from "../runScripts";

export const dockerConfig = memoize(
  async function (): Promise<string> {
    return await runScript("copy_docker_config.sh");
  }
);
