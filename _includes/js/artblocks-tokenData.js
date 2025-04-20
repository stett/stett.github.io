function genTokenData(projectNum) {

    let data = {};
    let hash = "0x";

    for (var i = 0; i < 64; i++) {
        hash += Math.floor(Math.random() * 16).toString(16);
    }
    // TEMP for testing:
    //hash = "0x11ac128f8b54949c12d04102cfc01960fc496813cbc3495bf77aeed738579738";

    data.hash = hash;
    data.tokenId = (
        projectNum * 1000000 +
        Math.floor(Math.random() * 1000)
        ).toString();

    return data;
}

let tokenData = genTokenData(123);