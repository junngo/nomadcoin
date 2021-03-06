const express = require("express"),
  bodyParser = require("body-parser"),
  morgan = require("morgan"),
  Blockchain = require("./blockchain"),
  P2P = require("./p2p"),
  Wallet = require("./wallet")
  ;


const { getBlockChain, createNewBlock, getAccountBalance, sendTx } = Blockchain;
const { startP2PServer, connectToPeers } = P2P;
const { initWallet } = Wallet;

// export HTTP_PORT=4000
const PORT = process.env.HTTP_PORT || 3000;

const app = express();
app.use(bodyParser.json());
app.use(morgan("combined"));

app
  .route("/blocks")
  .get((req, res) => {
  res.send(getBlockChain());
  })
  .post((req, res) => {
  const newBlock = createNewBlock();
  res.send(newBlock);
});

app.post("/peers", (req, res) => {
  const { body : { peer }} = req;
  connectToPeers(peer);
  res.send();
});

app.get("/me/balance", (req, res) => {
  const balance = getAccountBalance();
  res.send( { balance });
});

app
  .route("/transactions")
  .get((req, res) => {})
  .post((req, res) => {
    try {
      const { body: { address, amount }} = req;
      if(address === undefined || amount === undefined){
        throw Error("Please specify and address and an amount");
      } else {
        const resPonse = sendTx(address, amount);
        res.send(resPonse);
      }
    } catch(e) {
      res.status(400).send(e.message);
    }
  });

const server = app.listen(PORT, () =>
  console.log(`Nomadcoin HTTP server running on port ${PORT}`)
);

initWallet();
startP2PServer(server);
