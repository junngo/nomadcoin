const CrytoJS = require("crypto-js"),
    elliptic = require("elliptic"),
    utils = require("./utils");

const ec = new elliptic("secp256k1").ec;

class TxOut {
    constructor(address, amount){
        this.address = address;
        this.amount = amount;
    }
}

class TxIn{
    // uxTxOutId
    // uTxOutIndex
    // Signature
}

class Transaction{
    // Id
    // txIns[]
    // txOuts[]
}

class uTxOut{
    constructor(uTxOutId, uTxOutIndex, address, amount){
        this.uTxOutId = uTxOutId;
        this.uTxOutIndex = uTxOutIndex;
        this.address = address;
        this.amount = amount;
    }
}

const uTxOuts = [];

const getTxId = tx => {
    const txInContent = tx.txIns
        .map(txIn => txIn.uTxOutId + txIn.uTxOutIndex)
        .reduce((a, b) => a + b, "");

    const txOutContent = tx.txOuts
        .map(txOut => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, "");
    
    return CryptoJS.SHA256(txInContent + txOutContent).toString();
};

const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
    return uTxOutList.find(uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex)
}

const signTxIn = (tx, txInIndex, privateKey, uTxOut) => {
    const txIn = tx.txIns[txInIndex];
    const dataToSign = tx.id;
    const referencedUTxOut = findUTxOut(txIn.txOutId, tx.txOutIndex, uTxOuts);

    if (referencedUTxOut === null){
        return;
    }

    const key = ec.keyFromPrivate(privateKey, "hex");
    const Signature = utils.toHexString(key.sign(dataToSign).toDER());

    return Signature;

};