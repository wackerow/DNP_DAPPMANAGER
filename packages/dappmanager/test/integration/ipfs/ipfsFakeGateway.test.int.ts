import "mocha";
import { expect } from "chai";
import { beforeAndAfter, createTestDir, testDir } from "../../testUtils";
import { packToFs } from "ipfs-car/pack/fs";
import { unpack } from "ipfs-car/unpack";
import { MemoryBlockStore } from "ipfs-car/blockstore/memory";
import fs from "fs";
import { FsBlockStore } from "ipfs-car/blockstore/fs";
import { CarReader } from "@ipld/car";
import all from "it-all";
import { equals } from "uint8arrays/equals";
import { pack } from "ipfs-car/pack";
import { packToStream } from "ipfs-car/pack/stream";
import sinon from "sinon";
import { packToBlob } from "ipfs-car/pack/blob";
import http from "http";
import { ipfs } from "../../../src/modules/ipfs";
import { IpfsClientTarget } from "../../../src/types";

const dappmanagerManifest = `{
  "name": "dappmanager.dnp.dappnode.eth",
  "version": "0.2.33",
  "description": "Dappnode package responsible for providing the DappNode Package Manager",
  "type": "dncore",
  "author": "DAppNode Association <admin@dappnode.io> (https://github.com/dappnode)",
  "contributors": [
    "Eduardo Antuña <eduadiez@gmail.com> (https://github.com/eduadiez)",
    "DAppLion <dapplion@giveth.io> (https://github.com/dapplion)"
  ],
  "keywords": ["DAppNodeCore", "Manager", "Installer"],
  "links": {
    "ui": "http://my.dappnode/",
    "homepage": "https://github.com/dappnode/DNP_DAPPMANAGER#readme"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/dappnode/DNP_DAPPMANAGER"
  },
  "bugs": {
    "url": "https://github.com/dappnode/DNP_DAPPMANAGER/issues"
  },
  "license": "GPL-3.0"
  }`;

describe("IPFS remote mallicious gateway", function () {
  [MemoryBlockStore, FsBlockStore].map(Blockstore => {
    describe(`with ${Blockstore.name}`, () => {
      // Define paths
      const fileName = "dappmanager_package.json";
      const rawFilePath = testDir + fileName;
      const dirPath = testDir + "dir/";
      const dirCarFilePath = testDir + "dir.car";
      const carFilePath = testDir + "dappmanager_package.car";
      const rawFileDirPath = dirPath + fileName;
      // API Server
      let server: http.Server;
      const port = 3030;

      beforeAndAfter("Clean files", async () => {
        await createTestDir();
      });

      before(async () => {
        // Write raw file
        fs.writeFileSync(rawFilePath, dappmanagerManifest);
        // Write raw in dir
        fs.mkdirSync(dirPath);
        fs.writeFileSync(rawFileDirPath, dappmanagerManifest);
        // Write dir.car
        await packToFs({
          input: dirPath,
          output: dirCarFilePath,
          blockstore: new FsBlockStore()
        });
        // Write CAR file
        await packToFs({
          input: rawFilePath,
          output: carFilePath,
          blockstore: new FsBlockStore()
        });
      });

      before(() => {
        server = http
          .createServer(async (req, res) => {
            if (
              req.url !==
              "/api/v0/dag/export?arg=QmZgyqhA6so3FjCtJC7gN6Ybuua8YVBWzYppdAnEBFAZCr"
            ) {
              res.writeHead(500, `wrong hash: ${req.url}`);
              res.end();
              return;
            }

            const inStream = fs.createReadStream(carFilePath);
            // Reserva en memoria x bytes
            const data = Buffer.alloc(10e9, 0xaa);
            // convertir data en car
            //const carReader = new CarReader()
            res.write(data);
            res.end();
            const carReader = await CarReader.fromIterable(inStream);
            inStream.pipe(res);
          })
          .listen(port);
      });

      after(() => {
        server.close();
      });

      it.only("Should get CAR content from fake IPFS gateway", async () => {
        ipfs.changeHost(`http://localhost:${port}`, IpfsClientTarget.remote);
        const data = await ipfs.writeFileToMemory(
          "QmZgyqhA6so3FjCtJC7gN6Ybuua8YVBWzYppdAnEBFAZCr"
        );
      });

      it("can pack from a readable stream", async () => {
        const { out } = await pack({
          input: fs.createReadStream(rawFilePath)
        });

        const carParts = [];
        for await (const part of out) {
          carParts.push(part);
        }

        expect(carParts.length).to.not.eql(0);
      });

      it("pack dir to car with filesystem output with iterable input", async () => {
        const blockstore = new Blockstore();
        const writable = fs.createWriteStream(dirCarFilePath);
        // Create car from file
        await packToStream({
          input: dirPath,
          writable,
          blockstore
        });

        await blockstore.close();

        const inStream = fs.createReadStream(dirCarFilePath);
        const carReader = await CarReader.fromIterable(inStream);
        const files = await all(unpack(carReader));

        expect(files).to.have.lengthOf(3);
      });

      it("pack dir to car with filesystem output", async () => {
        const blockstore = new Blockstore();
        // Create car from file
        await packToFs({
          input: dirPath,
          output: dirCarFilePath,
          blockstore
        });

        await blockstore.close();

        const inStream = fs.createReadStream(dirCarFilePath);
        const carReader = await CarReader.fromIterable(inStream);
        const files = await all(unpack(carReader));

        expect(files).to.have.lengthOf(3);
      });

      it("pack raw file to car with filesystem output", async () => {
        const blockstore = new Blockstore();
        // Create car from file
        await packToFs({
          input: rawFilePath,
          output: carFilePath,
          blockstore
        });

        await blockstore.close();

        const inStream = fs.createReadStream(carFilePath);
        const carReader = await CarReader.fromIterable(inStream);
        const files = await all(unpack(carReader));

        expect(files).to.have.lengthOf(2);

        const rawOriginalContent = new Uint8Array(fs.readFileSync(rawFilePath));
        const rawContent = (await all(files[files.length - 1].content()))[0];

        expect(equals(rawOriginalContent, rawContent)).to.eql(true);
      });

      it("pack raw file to car without output", async () => {
        const blockstore = new Blockstore();

        // Create car from file
        await packToFs({
          input: rawFilePath,
          blockstore
        });
        await blockstore.close();

        const newCarPath = carFilePath;

        const inStream = fs.createReadStream(newCarPath);
        const carReader = await CarReader.fromIterable(inStream);
        const files = await all(unpack(carReader));

        expect(files).to.have.lengthOf(2);

        const rawOriginalContent = new Uint8Array(fs.readFileSync(rawFilePath));
        const rawContent = (await all(files[files.length - 1].content()))[0];

        expect(equals(rawOriginalContent, rawContent)).to.eql(true);
      });

      it("pack raw file to car with writable stream", async () => {
        const blockstore = new Blockstore();
        const writable = fs.createWriteStream(carFilePath);

        // Create car from file
        await packToStream({
          input: rawFilePath,
          writable,
          blockstore
        });
        await blockstore.close();

        const inStream = fs.createReadStream(carFilePath);
        const carReader = await CarReader.fromIterable(inStream);
        const files = await all(unpack(carReader));

        expect(files).to.have.lengthOf(2);

        const rawOriginalContent = new Uint8Array(fs.readFileSync(rawFilePath));
        const rawContent = (await all(files[files.length - 1].content()))[0];

        expect(equals(rawOriginalContent, rawContent)).to.eql(true);
      });

      it("packToStream does not close provided blockstore", async () => {
        const writable = fs.createWriteStream(carFilePath);
        const blockstore = new Blockstore();

        const spy = sinon.spy(blockstore, "close");

        // Create car from file
        await packToStream({
          input: dirPath,
          writable,
          blockstore
        });

        expect(spy.callCount).to.eql(0);
        await blockstore.close();
      });

      it("packToFs does not close provided blockstore", async () => {
        const blockstore = new Blockstore();
        const spy = sinon.spy(blockstore, "close");

        // Create car from file
        await packToFs({
          input: carFilePath,
          output: dirCarFilePath,
          blockstore
        });

        expect(spy.callCount).to.eql(0);
        await blockstore.close();
      });

      it("can packToBlob", async () => {
        const blockstore = new Blockstore();

        const { car, root } = await packToBlob({
          input: [new Uint8Array([21, 31])],
          blockstore
        });

        expect(car).to.exist;
        expect(root.toString()).to.eql(
          "bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354"
        );
        await blockstore.close();
      });

      /*         it("can packToBlob Web File", async () => {
          const blockstore = new Blockstore();

          const file = new File([new Uint8Array([1, 2, 3])], "file.txt");
          const { car, root } = await packToBlob({
            input: [file],
            blockstore
          });

          expect(car).to.exist;
          expect(root.toString()).to.eql(
            "bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354"
          );
          await blockstore.close();
        });
 */
      it("should error to pack empty input", async () => {
        const blockstore = new Blockstore();

        try {
          await pack({
            input: [],
            blockstore
          });
        } catch (err) {
          expect(err).to.exist;
          return;
        }
        throw new Error("pack should throw error with empty input");
      });
    });
  });
});
