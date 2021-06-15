import { expect } from "chai";
import { ChainDriver, InstalledPackageData } from "../../../src/common";
import { getChainDriverName } from "../../../src/modules/chains/getChainDriverName";
import { mockContainer, mockDnpName } from "../../testUtils";

describe("Watchers > chains ", () => {
  it("stringify dappnode.dnp.chain label as string", () => {
    const chain: ChainDriver = "ethereum";
    const mockDnp: InstalledPackageData = {
      dnpName: mockDnpName,
      instanceName: "",
      version: "0.0.0",
      isDnp: true,
      isCore: false,
      dependencies: {},
      origin: "",
      avatarUrl: "",
      containers: [mockContainer],
      chain: chain
    };
  });
});
