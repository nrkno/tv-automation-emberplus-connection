const Decoder = require('.').Decoder;
const DeviceTree = require(".").DeviceTree;
const fs = require("fs");

const LOCALHOST = "0.0.0.0";
const PORT = 3336;

fs.readFile("./embrionix.ember", (e, data) => {
    let root = Decoder(data);

    const TreeServer = require("./").TreeServer;
    const server = new TreeServer(LOCALHOST, PORT, root);
    server.on("clientError", (e) => {
        console.log(e);
    });
    server.listen()
        .then(() => {
            console.log("listening");
        })
        .then(() => {
            let tree = new DeviceTree(LOCALHOST, PORT);
            return Promise.resolve()
                .then(() => tree.connect())
                .then(() => {
                    return tree.getDirectory();
                })
                .then(() => tree.disconnect())
                .then(() => tree.connect())
                .then(() => {
                    return tree.getDirectory();
                })
                .catch((e) => {
                    console.log(e.stack);
                })
                .then(() => tree.disconnect())
        })
        .catch((e) => {
            console.log(e.stack);
        })
        .then(() => {
            console.log("close");
            server.close();
        });
});
