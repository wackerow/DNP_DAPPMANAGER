import { getPrivateNetworkAlias } from "../../domains";
import {
  InstalledPackageData,
  PackageContainer,
  ChainDriver
} from "../../types";

/**
 * Make sure progress is a valid number, otherwise API typechecking will error since
 * a NaN value may be converted to null
 */
export function safeProgress(progress: number): number | undefined {
  if (typeof progress !== "number" || isNaN(progress) || !isFinite(progress))
    return undefined;
  else return progress;
}

/**
 * Reword expected chain errors
 */
export function parseChainErrors(error: Error): string {
  if (error.message.includes("ECONNREFUSED"))
    return `DAppNode Package stopped or unreachable (connection refused)`;

  if (error.message.includes("Invalid JSON RPC response"))
    return `DAppNode Package stopped or unreachable (invalid response)`;

  return error.message;
}

/**
 *
 *
 */

export function searchContainerByService(
  service: string,
  containers: PackageContainer[]
): string {
  const container = containers.find(
    container => service === container.serviceName
  );
  //obtain the domain of that container
  if (!container) throw Error("The Container does not exist");
  const domain = getPrivateNetworkAlias(container);
  console.log(`searchContainer domain: ${domain}`);
  return domain;
}

/**
 * This function will generate a url, this url is where the chain Obect collect the data
 * defaultPort: Declare the default port of the chain in case the manifest dont define a specific port, for example ethereum default port is 8545
 * @returns
 */

export function getApiUrl(
  dnp: InstalledPackageData,
  defaultPort: number
): string {
  const chain = dnp.chain;
  const container = dnp.containers[0];
  let containerDomain = getPrivateNetworkAlias(container);
  let port = defaultPort;

  if (chain === undefined) {
    throw Error("Chain field is undefined");
  }

  if (typeof chain !== "string") {
    if (chain.service !== undefined) {
      containerDomain = searchContainerByService(chain.service, dnp.containers);
    }

    if (chain.port !== undefined) {
      port = chain.port;
    }
  }

  const apiUrl = `http://${containerDomain}:${port}`;

  return apiUrl;
}
