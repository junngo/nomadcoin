const CrytoJS = require("crypto-js"),
    elliptic = require("elliptic"),
    utils = require("./utils");

const ec = new elliptic.ec("secp256k1");

const COINBASE_AMOUNT = 50;

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
    return uTxOutList.find(uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex);
};

const signTxIn = (tx, txInIndex, privateKey, uTxOut) => {
    const txIn = tx.txIns[txInIndex];
    const dataToSign = tx.id;
    const referencedUTxOut = findUTxOut(txIn.txOutId, tx.txOutIndex, uTxOuts);

    if (referencedUTxOut === null){
        console.log("Couldn't find the referenced uTxOut, not signing");
        return;
    }

    const key = ec.keyFromPrivate(privateKey, "hex");
    const Signature = utils.toHexString(key.sign(dataToSign).toDER());

    return Signature;

};

const updateUTxOuts = (newTxs, uTxOutList) => {
    const newUTxOuts = newTxs
        .map(tx => {
            tx.txOuts.map((txOut, index) => {
                new uTxOut(tx.id, index, txOut.address, txOut.amount);
            });
        })
        .reduce((a, b) => a.concat(b), []);
    
    const spentTxOuts = newTxs
        .map(tx => tx.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map(txIn => new uTxOut(txIn.txOutId, txIn.txOutIndex, "", 0));

    const resultingUTxOuts = uTxOutList
        .filter(uTxO => !findUTxOut(uTxO.txOutContent, uTxO.txOutIndex, spentTxOuts))
        .concat(newUTxOuts);
    
    return resultingUTxOuts;
};

const isTxInStructureValid = (txIn) => {
    if(txIn === null){
        console.log("The txIn appears to be null");
        return false;
    } else if(typeof txIn.signature !== "string"){
        console.log("The txIn doesn't have a valid signature");
        return false;
    } else if(typeof txIn.txOutId !== "string"){
        console.log("The txIn doesn't have a valid txOutId");
        return false;
    } else if(typeof txIn.txOutIndex !== "number"){
        console.log("The txIn doesn't have a valid txOutIndex");
        return false;
    } else {
        return true;
    }
};

const isAddressValid = (address) => {
    if(address.length !== 300){
        console.log("The address length is not the expected one");
        return false;
    } else if(address.match("^[a-fA-F0-9]+$") === null){
        console.log("The address doesn't match the hex patter");
        return false;
    } else if(!address.startsWith("04")){
        console.log("The address doesn't start with 04");
        return false;
    } else {
        return true;
    }
}

const isTxOutStructureValid = (txOut) => {
    if(txOut === null){
        return false;
    } else if(typeof txOut.address !== "string"){
        console.log("The txOut doesn't have a valid string as address");
        return false;
    } else if(!isAddressValid(txOut.address)){
        console.log("The txOut doesn't have a valid address");
        return false;
    } else if(typeof txOut.amount !== "number"){
        console.log("The txOut doesn't have a valid amount");
        return false;
    } else {
        return true;
    }  
};

const isTxStructureValid = tx => {
    if (typeof tx.id !== "string"){
        console.log("Tx ID is not valid");
        return false;
    } else if(!(tx.txIns instanceof Array)){
        console.log("The txIns are not an array");
        return false;
    } else if( 
        !tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)
    ){
        console.log("The structure of one of the txIn is not valid");
        return false;
    } else if(!(tx.txOuts instanceof Array)){
        console.log("The txOuts are not an array");
        return false;
    } else if(
        !tx.txOut.map(isTxOutStructureValid).reduce((a, b) => a && b, true)
    ){
        console.log("The structure of one of the txOut is not valid");
        return false;
    } else {
        return true;
    }
};

const validateTxIn = (txIn, tx, uTxOutList) => {
    const wantedTxOut = uTxOutList.find(uTxO => utxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
    if(wantedTxOut === null){
        return false;
    } else {
        const address = wantedTxOut.address;
        const key = ec.keyFromPrivate(address, "hex");
        return key.verify(tx.id, txIn.signature);
    }
};

const getAmountInTxIn = (txIn, uTxOutList) 
    => findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount();

const validateTx = (tx, uTxOutList) => {

    if(!isTxStructureValid(tx)){
        return false;
    }

    if (getTxId(tx) !== tx.id){
        return false;
    }

    const hasValidTxIns = tx.txIns.map(txIn => validateTxIn(txIn, tx, uTxOuts));

    if (!hasValidTxIns) {
        return false;
    }

    const amountIntxIns =tx.txIns
        .map(txIn => getAmountInTxIn(txIn, uTxOutList))
        .reduce((a, b) => a + b, 0);

    const amountInTxOuts = tx.txOuts.map(txOut => txOut.amount).reduce((a, b) => a + b, 0);

    if(amountIntxIns !== amountInTxOuts){
        return false;
    } else {
        return true;
    }
};

const validateCoinbaseTx = (tx, blockIndex) => {
    if (getTxId(tx) !== tx.id) {
        console.log("Invalid Coinbase tx ID");
        return false;
    } else if (tx.txIns.length !== 1) {
        console.log("Coinbase TX should only have one input");
        return false;
    } else if (tx.txIns[0].txOutIndex !== blockIndex) {
        console.log(
            "The txOutIndex of the Coinbase Tx should be the same as the Block Index"
        );
        return false;
    } else if (tx.txOuts.length !== 1) {
        console.log("Coinbase TX should only have one output");
        return false;
    } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
        console.log(
            `Coinbase TX should have an amount of only ${COINBASE_AMOUNT} and it has ${
              tx.txOuts[0].amount
            }`
        );
        return false;
    } else {
        return true;
    }
};