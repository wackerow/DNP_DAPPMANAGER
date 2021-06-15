import {
  labelParseFns,
  labelStringifyFns
} from "../../../src/modules/compose/labelsDb";
import { expect } from "chai";

describe("modules > compose > labelsDB", () => {
  it("parse dappnode.dnp.chain label as string", () => {
    const chain = labelParseFns["dappnode.dnp.chain"]("ethereum");
    expect(chain).to.equal("hola");
  });

  it("stringify dappnode.dnp.chain label as string", () => {
    const chain = labelStringifyFns["dappnode.dnp.chain"]("ethereum");
    expect(chain).to.equal("ethereum");
  });

  it("parse dappnode.dnp.chain label as object", () => {
    const chain = labelParseFns["dappnode.dnp.chain"](
      '{"preset":"ethereum","service":"service","port":8732}'
    );
    expect(chain).to.deep.equal({
      preset: "ethereum",
      service: "service",
      port: 8732
    });
  });

  it("stringify dappnode.dnp.chain label as object", () => {
    const chain = labelStringifyFns["dappnode.dnp.chain"]({
      preset: "ethereum",
      service: "service",
      port: 8732
    });
    expect(chain).to.equal(
      '{"preset":"ethereum","service":"service","port":8732}'
    );
  });
});
