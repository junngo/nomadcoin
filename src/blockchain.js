const CryptoJS = require("crypto-js"),
  hexToBinary = require("hex-to-binary");

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
  1520519860205,
  "This is the genesis!!",
  0,
  0
);

let blockchain = [genesisBlock];

const getNewestBlock = () => blockchain[blockchain.length -1];

const getTimestamp = () => new Date().getTime() / 1000;

const getBlockChain = () => blockchain;

const createHash = (index, previousHash, timestamp, data, difficulty, nonce) =>
  CryptoJS.SHA256(
    index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce
  ).toString();

const createNewBlock = data => {
  const previousBlock = getNewestBlock();
  const newBlockIndex = previousBlock.index + 1;
  const newTimeStamp = getTimestamp();
  const newBlock = findBlock(
    newBlockIndex,
    previousBlock.hash,
    newTimeStamp,
    data,
    15
  );

  addBlockToChain(newBlock);
  require("./p2p").broadcastNewBlock();
  return newBlock;
};

const findBlock = (index, previousHash, timestamp, data, difficulty) => {
  let nonce = 0;
  console.log("Current nonce", nonce);
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

const getBlockHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data);

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
  }
  return true;
};

const isBlockStructureValid = (block) => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "string"
  );
};

const isChainValid = (candidateChain) => {

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

const replaceChain = candiateBlock => {
  if(isChainValid(candiateBlock) && candiateBlock.length > getBlockChain().length) {
    blockchain = candiateBlock;
    return true;
  } else {
    return false;
  }
};

const addBlockToChain = candiateBlock => {
  if (isBlockValid(candiateBlock, getNewestBlock())) {
    blockchain.push(candiateBlock);
    return true;
  } else {
    return false;
  }
};

module.exports = {
  getNewestBlock,
  getBlockChain,
  createNewBlock,
  isBlockStructureValid,
  addBlockToChain,
  replaceChain
};
