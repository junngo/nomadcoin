const CryptoJS = require("crypto-js");

class Block {
  constructor(index, hash, previousHash, timestamp, data){
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
  }
};

const genesisBlock = new Block(
  0,
  "FC093ABF7C2E0AFFC1FE3B0E8AB7C7D3849E37B0D2BD868BE4DF93C34158C897",
  null,
  1520519860205,
  "This is the genesis!!"
);

let blockchain = [genesisBlock];

const getLastBlock = () => blockchain[blockchain.length -1];

const getTimestamp = () => new Date().getTime() / 1000;

const getBlockChain = () => blockChain;

cost createHash = (index, previousHash, timestamp, data) =>
  CryptoJS.SHA256(
    index + previousHash + timestamp + JSON.stringify(data)
  ).toString();

const createNewBlock = data => {
  const previousBlock = getLastBlock();
  const newBlockIndex = previousBlock.index + 1;
  const newTimeStamp = getTimestamp();
  const newHash = createHash(
    newBlockIndex,
    previousBlock.hash,
    newTimeStamp,
    data
  );
  const newBlock = new Block(
    newBlockIndex,
    newHash,
    previousBlock.hash,
    newTimeStamp,
    data
  );

  return newBlock;
};

const getBlockHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data);

const isNewBlockValid = (candiateBlock, latestBlock) => {
  if (!isNewStructureValid(candiateBlock)) {
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

const isNewStructureValid = (block) => {
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
    if(!isNewBlockValid(candidateChain[i], candidateChain[i-1])){
      return false;
    }
  }

  return true;
}

const replaceChain = candiateBlock => {
  if(isChainValid(candiateBlock) && newChain.length > getBlockChain().length) {
    blockchain = candiateBlock;
    return true;
  } else {
    return false;
  }
};

const addBlockToChain = candiateBlock => {
  if (isNewBlockValid(candiateBlock, getLastBlock())) {
    getBlockChain().push(candiateBlock);
    return true;
  } else {
    return false;
  }
}
