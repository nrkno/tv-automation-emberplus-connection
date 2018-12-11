const { S101Client } = require("../index");
const s101Buffer = new Buffer("fe000e0001c001021f026082008d6b820089a0176a15a0050d03010201a10c310aa0080c066c6162656c73a01b6a19a0050d03010202a110310ea00c0c0a706172616d6574657273a051714fa0050d03010203a1463144a0080c066d6174726978a403020104a503020104aa183016a0147212a0050d03010201a1090c075072696d617279a203020102a303020101a8050d03010202a903020101f24cff", "hex");

describe("Ember", () => {
    let client;

    beforeAll(() => {
        client = new S101Client();
    });

    it("should parse S101 message without error", (done) => {
        client.on("emberPacket", () => {
            done();
        });
        client.on("error", e => {
            console.log(e);
            expect(e).toBeUndefined();
            done();
        });
        client.codec.dataIn(s101Buffer);
    });
});
