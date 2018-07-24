const express = require("express"),
  bodyParser = require("body-parser"),
  morgan = require("morgan"),
  Blockchain = require("./blockchain"),
  P2P = require("./p2p");


const { getBlockChain, createNewBlock} = Blockchain;
const { startP2PServer } = P2P;

// export HTTP_PORT=4000
const PORT = process.env.HTTP_PORT || 3000;

const app = express();
app.use(bodyParser.json());
app.use(morgan("combined"));

app.get("/blocks", (req, res) => {
  res.send(getBlockChain());
});

app.post("/blocks", (req, res) => {
  const { body: { data }} = req;
  //const { headers: { data }} = req;
  const newBlock = createNewBlock(data);
  res.send(newBlock);
});

const server = app.listen(PORT, () =>
  console.log(`Nomadcoin HTTP server running on port ${PORT}`)
);

startP2PServer(server);
