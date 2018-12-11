const fs = require("fs");
const Decoder = require('../').Decoder;
const DeviceTree = require("../").DeviceTree;
const TreeServer = require("../").TreeServer;

const LOCALHOST = "127.0.0.1";
const PORT = 9008;

describe("DeviceTree", () => {
    let server;

    beforeAll(() => {
        return Promise.resolve()
            .then(() => new Promise((resolve, reject) => {
                fs.readFile("./embrionix.ember", (e, data) => {
                    if (e) {
                        reject(e);
                    }
                    resolve(Decoder(data));
                });
            }))
            .then(root => {
                server = new TreeServer(LOCALHOST, PORT, root);
                return server.listen();
            });
    });

    afterAll(() => server.close());

    it("should gracefully connect and disconnect", () => {
        return Promise.resolve()
            .then(() => {
                let tree = new DeviceTree(LOCALHOST, PORT);
                return Promise.resolve()
                    .then(() => tree.connect())
                    .then(() => tree.getDirectory())
                    .then(() => tree.disconnect())
                    .then(() => tree.connect())
                    .then(() => tree.getDirectory())
                    .then(() => tree.disconnect())
            })
    });
});
