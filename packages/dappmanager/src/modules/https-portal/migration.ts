import { uniq } from "lodash";
import semver from "semver";
import params from "../../params";
import { logs } from "../../logs";
import { getPrivateNetworkAlias } from "../../domains";
import {
  dockerComposeUp,
  dockerContainerInspect,
  dockerCreateNetwork,
  dockerListNetworks,
  dockerNetworkConnect,
  dockerNetworkDisconnect
} from "../docker";
import { listContainers } from "../docker/list";
import Dockerode from "dockerode";
import * as getPath from "../../utils/getPath";
import { ComposeFileEditor } from "../compose/editor";
import { PackageContainer } from "../../types";
import { parseServiceNetworks } from "../compose/networks";
import { parseComposeSemver } from "../../utils/sanitizeVersion";

/**
 * DAPPMANAGER updates from <= v0.2.38 must manually add aliases
 * to all running containers.
 * This will run every single time dappmanager restarts and will list al packages
 * and do docker inspect.
 */
export async function addAliasToRunningContainersMigration(): Promise<void> {
  const containers = await listContainers();
  const networks = await dockerListNetworks();
  const networkNames = new Set(networks.map(n => n.Name));

  for (const { networkName, ipamConfig } of [
    // dnprivate_network
    {
      networkName: params.DNP_PRIVATE_NETWORK_NAME,
      ipamConfig: params.DNP_PRIVATE_NETWORK_IPAM_CONFIG
    },
    // dncore_network
    {
      networkName: params.DNP_NEXT_PRIVATE_NETWORK_NAME,
      ipamConfig: params.DNP_NEXT_PRIVATE_NETWORK_IPAM_CONFIG
    }
  ]) {
    // Ensure private network exists
    if (!networkNames.has(networkName)) {
      logs.info(`Created new network ${networkName}`);
      await dockerCreateNetwork(networkName, ipamConfig);
    }

    for (const container of containers) {
      // For each container and private network:
      // 1. Add new network + alias in compose if not there
      // 2. Connect to new network w/ alias if not connected

      try {
        // Info from docker inspect and compose file might be not-syncrhnonyzed
        // So this function must be before the check hasAlias()
        const alias = getPrivateNetworkAlias(container);
        const migratedCompose = migrateNetworkAndAliasInCompose(
          container,
          networkName,
          alias
        );

        if (migratedCompose)
          logs.info(`Migrated compose alias ${networkName} ${alias}`);

        const migratedContainer = await migrateNetworkAndAliasInLiveContainer(
          container,
          networkName,
          alias
        );

        if (migratedContainer)
          logs.info(`Migrated container alias ${networkName} ${alias}`);
      } catch (e) {
        logs.error(`Error alias migrate ${container.containerName}`, e);
      }
    }
  }
}

/** Return true if endpoint config exists and has alias */
export function hasAlias(
  endpointConfig: Dockerode.NetworkInfo | null,
  alias: string
): boolean {
  return Boolean(
    endpointConfig &&
      endpointConfig.Aliases &&
      Array.isArray(endpointConfig.Aliases) &&
      endpointConfig.Aliases.includes(alias)
  );
}

/** Get endpoint config for DNP_PRIVATE_NETWORK_NAME */
export async function getEndpointConfig(
  containerName: string,
  networkName: string
): Promise<Dockerode.NetworkInfo | null> {
  const inspectInfo = await dockerContainerInspect(containerName);
  return inspectInfo.NetworkSettings.Networks[networkName] ?? null;
}

/**
 * Get compose file network and compose network settings from dncore_network
 * And rewrites the compose with the core network edited
 * @returns true if it migrated
 */
export function migrateNetworkAndAliasInCompose(
  container: PackageContainer,
  networkName: string,
  alias: string
): boolean {
  const compose = new ComposeFileEditor(container.dnpName, container.isCore);

  // 1. Get compose network settings
  const composeNetwork = compose.getComposeNetwork(networkName);

  // 2. Get compose service network settings
  const composeService = compose.services()[container.serviceName];

  const serviceNetworks = parseServiceNetworks(
    composeService.get().networks || {}
  );

  const serviceNetwork = serviceNetworks[networkName] ?? null;

  // 3. Check if migration was done
  if (
    // 1. Migration undone for aliases or networks or both => return false
    // Consider as not migrated if either composeNetwork or serviceNetwork are not present
    composeNetwork &&
    serviceNetwork &&
    // Check property name is defined
    composeNetwork?.name === params.DNP_PRIVATE_NETWORK_NAME &&
    // Check is external network
    composeNetwork?.external &&
    // Check version is at least 3.5
    semver.gte(
      parseComposeSemver(compose.compose.version),
      parseComposeSemver(params.MINIMUM_COMPOSE_VERSION)
    ) &&
    // Check alias has been added
    serviceNetwork.aliases?.includes(alias)
  )
    return false;

  // 4. Ensure compose file version 3.5
  if (compose.compose.version < params.MINIMUM_COMPOSE_VERSION) {
    compose.compose.version = params.MINIMUM_COMPOSE_VERSION;
  }

  // 5. Add network and alias
  if (composeNetwork || serviceNetwork)
    // composeNetwork and serviceNetwork might be null and have different values (eitherway it should be the same)
    // Only remove network if exists
    composeService.removeNetwork(params.DNP_PRIVATE_NETWORK_NAME_FROM_CORE);

  const aliases = uniq([...(serviceNetwork?.aliases || []), alias]);

  composeService.addNetwork(
    networkName,
    { ...serviceNetwork, aliases },
    { external: true, name: networkName } //...networkConfig,
  );

  compose.write();

  return true;
}

/**
 * On live running container connect to new network
 * @returns true if it migrated
 */
async function migrateNetworkAndAliasInLiveContainer(
  container: PackageContainer,
  networkName: string,
  alias: string
): Promise<boolean> {
  const inspectInfo = await dockerContainerInspect(container.containerName);
  const networkConfig =
    inspectInfo.NetworkSettings.Networks[networkName] ?? null;

  // Don't migrate if network config exists and has alias
  if (
    networkConfig &&
    Array.isArray(networkConfig.Aliases) &&
    networkConfig.Aliases.includes(alias)
  ) {
    return false;
  }

  const newNetworkConfig: Partial<Dockerode.NetworkInfo> = {
    ...networkConfig,
    Aliases: [...(networkConfig?.Aliases || []), alias]
  };

  // Wifi and VPN containers needs a refresh connect due to its own network configuration
  if (
    container.containerName === params.vpnContainerName ||
    container.containerName === params.wifiContainerName
  ) {
    await dockerComposeUp(
      getPath.dockerCompose(container.dnpName, container.isCore),
      { forceRecreate: true }
    );
  } else {
    await dockerNetworkDisconnect(networkName, container.containerName);
    await dockerNetworkConnect(
      networkName,
      container.containerName,
      newNetworkConfig
    );
  }

  return true;
}
