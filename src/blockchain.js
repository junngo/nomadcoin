const CryptoJS = require("crypto-js"),
  _ = require("lodash"),
  Wallet = require("./wallet"),
  Mempool = require("./mempool"),
  Transaction = require("./transactions"),
  hexToBinary = require("hex-to-binary");

const { getBalance, getPublicFromWallet, createTx, getPrivateFromWallet } = Wallet;
const { createCoinbaseTx, processTxs } = Transaction;
const { addToMempool, getMempool } = Mempool;

const BLOCK_GENERATION_INTERVAL = 10;
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;  

class Block {
  constructor(index, hash, previousHash, timestamp, data, difficulty, nonce){
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }
};

const genesisBlock = new Block(
  0,
  "FC093ABF7C2E0AFFC1FE3B0E8AB7C7D3849E37B0D2BD868BE4DF93C34158C897",
  null,
  1532944450,
  "This is the genesis!!",
  0,
  0
);

let blockchain = [genesisBlock];

let uTxOuts = [];

const getNewestBlock = () => blockchain[blockchain.length -1];

const getTimestamp = () => Math.round(new Date().getTime() / 1000);

const getBlockChain = () => blockchain;

const createHash = (index, previousHash, timestamp, data, difficulty, nonce) =>
  CryptoJS.SHA256(
    index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce
  ).toString();

const createNewBlock = () => {
  const coinbaseTx = createCoinbaseTx(
    getPublicFromWallet(),
    getNewestBlock().index + 1
  );

  const blockData = [coinbaseTx].concat(getMempool());
  return createNewRawBlock(blockData);
};

const createNewRawBlock = data => {
  const previousBlock = getNewestBlock();
  const newBlockIndex = previousBlock.index + 1;
  const newTimeStamp = getTimestamp();
  const difficulty = findDifficulty();
  const newBlock = findBlock(
    newBlockIndex,
    previousBlock.hash,
    newTimeStamp,
    data,
    difficulty
  );

  addBlockToChain(newBlock);
  require("./p2p").broadcastNewBlock();
  return newBlock;
};

const findDifficulty = () => {
  const newestBlock = getNewestBlock();
  if (newestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
      newestBlock.index !== 0) {
    return calculateNewDifficulty(newestBlock, getBlockChain());
  } else {
    return newestBlock.difficulty;
  }
};

const calculateNewDifficulty = (newestBlock, blockchain) => {
  const lastCalculateBlock =
    blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected =
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken = newestBlock.timestamp - lastCalculateBlock.timestamp;
  if (timeTaken < timeExpected / 2){
    return lastCalculateBlock.difficulty + 1;
  } else if (timeTaken > timeExpected * 2){
    return lastCalculateBlock.difficulty - 1;
  } else {
    return lastCalculateBlock.difficulty;
  }
};

const findBlock = (index, previousHash, timestamp, data, difficulty) => {
  let nonce = 0;
  while(true) {
    const hash = createHash(
      index,
      previousHash,
      timestamp,
      data,
      difficulty,
      nonce
    );

    //to-do: check amount of zeros(hashMatchesDifficulty)
    if(hashMatchesDifficulty(hash, difficulty)){
      return new Block(
        index,
        hash,
        previousHash,
        timestamp,
        data,
        difficulty,
        nonce
      );
    }
    nonce++;
  }
};

const hashMatchesDifficulty = (hash, difficulty) => {
  const hashInBinary = hexToBinary(hash);
  const requiredZeros = "0".repeat(difficulty);
  console.log("Trying difficulty:", difficulty, "with hash", hashInBinary);
  return hashInBinary.startsWith(requiredZeros);
}

const getBlockHash = block => 
  createHash(
    block.index, 
    block.previousHash, 
    block.timestamp, 
    block.data,
    block.difficulty,
    block.nonce
  );

const isTimeStampValid = (newBlock, oldBlock) => {
  return (
    oldBlock.timestamp - 60 < newBlock.timestamp &&
    newBlock.timestamp - 60 < getTimestamp()
    );
};

const isBlockValid = (candiateBlock, latestBlock) => {
  if (!isBlockStructureValid(candiateBlock)) {
    console.log("The canditate block structure is not valid");
    return false;
  } else if (latestBlock.index +1 !== candiateBlock.index) {
    console.log("the candiate block doesn't have a valid index");
    return false;
  } else if (latestBlock.hash !== candiateBlock.previousHash) {
    console.log(
      "the previousHash of the candiate block is not the hash of the latest block"
    );
    return false;
  } else if (getBlockHash(candiateBlock) !== candiateBlock.hash) {
    console.log("The hash of this block is invalid");
    return false;
  } else if(!isTimeStampValid(candiateBlock, latestBlock)) {
    console.log("The timespamp of this block is dodgy");
    return false;
  }
  return true;
};

const isBlockStructureValid = block => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "object"
  );
};

const isChainValid = candidateChain => {

  const isGenesisValid = block => {
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };

  if(!isGenesisValid(candidateChain[0])){
    console.log(
      "The candidateChain's genesisBlock is not the same as our genesisBlock"
    );

    return false;
  }

  for(let i = 1; i < candidateChain.length; i++){
    if(!isBlockValid(candidateChain[i], candidateChain[i-1])){
      return false;
    }
  }

  return true;
};

const sumDifficulty = anyBlockchain =>
  anyBlockchain
    .map(block => block.difficulty)
    .map(difficulty => Math.pow(2, difficulty))
    .reduce((a, b) => a+b);

const replaceChain = candidateChain => {
  if(isChainValid(candidateChain) &&
     sumDifficulty(candidateChain) > sumDifficulty(getBlockChain())
     ) 
  {
    blockchain = candidateChain;
    return true;
  } else {
    return false;
  }
};

const addBlockToChain = candiateBlock => {
  if (isBlockValid(candiateBlock, getNewestBlock())) {
    
    const processedTxs = processTxs(
      candiateBlock.data,
      uTxOuts,
      candiateBlock.index
    );

    if(processedTxs === null){
      console.log("Couldn't process txs");
      return false;
    } else {
      blockchain.push(candiateBlock);
      uTxOuts = processedTxs;
      return true;
    }
    return true;
  } else {
    return false;
  }
};

const getUTxOutList = () => _.cloneDeep(uTxOuts);

const getAccountBalance = () =>
  getBalance(getPublicFromWallet(), uTxOuts);

const sendTx = (address, amount) => {
  const tx = createTx(address, amount, getPrivateFromWallet(), getUTxOutList());
  addToMempool(tx, getUTxOutList());

  return tx;
};

module.exports = {
  getNewestBlock,
  getBlockChain,
  createNewBlock,
  isBlockStructureValid,
  addBlockToChain,
  replaceChain,
  getAccountBalance,
  sendTx
};
