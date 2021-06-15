import { reset } from "sinon";
import { ChainDriver, Type, InstalledPackageData } from "../../common";

/**
 * Get ChainDriver for a given dnp
 * Uses a hardcoded registry for new packages that have not updated their manifests yet
 */
export function getChainDriverName(dnp: InstalledPackageData): ChainDriver {
  let res: ChainDriver;
  console.log(`getChainDriverName: ${dnp.chain}`);
  if (dnp.chain === undefined) {
    throw Error(`chain is undefined ${dnp.chain}`);
  } else {
    if (typeof dnp.chain === "string") {
      res = dnp.chain;
    } else res = dnp.chain.preset;
  }
  return res;
  //return (dnp.chain || knownChains[dnp.dnpName]) ?? null;
}

export const knownChains: { [dnpName: string]: Type } = {
  "openethereum.dnp.dappnode.eth": "ethereum",
  "ropsten.dnp.dappnode.eth": "ethereum",
  "rinkeby.dnp.dappnode.eth": "ethereum",
  "kovan.dnp.dappnode.eth": "ethereum",
  "bitcoin.dnp.dappnode.eth": "bitcoin",
  "monero.dnp.dappnode.eth": "monero",
  "prysm.dnp.dappnode.eth": "ethereum2-beacon-chain-prysm",
  "prysm-pyrmont.dnp.dappnode.eth": "ethereum2-beacon-chain-prysm"
};
