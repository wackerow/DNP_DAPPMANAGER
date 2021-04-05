import { shellHost } from "../../utils/shell";

/**
 * Reload services: Only necessary if there are any service "enabled" (systemctl enable service)
 */
export async function reloadServices(): Promise<void> {
  await shellHost("systemctl daemon-reload");
}
