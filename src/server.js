const express = require("express"),
  bodyParser = require("body-parser"),
  morgan = require("morgan"),
  Blockchain = require("./blockchain");

const { getBlockChain, createNewBlock} = Blockchain;

const PORT = 3000;

const app = express();
app.use(bodyParser.json());
app.use(morgan("combined"));

app.get("/blocks", (req, res) =>{
  res.send(getBlockChain());
});

app.post("/blocks", (req, res) => {
  //const { body: { data }} = req;
  const { headers: { data }} = req;
  const newBlock = createNewBlock(data);
  res.send(newBlock);
});

app.listen(PORT, () => console.log(`Nomadcoin server running on ${PORT}`));
