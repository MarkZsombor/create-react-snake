const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const app = express();
const PF = require("pathfinding");
const {
  generatePath,
  chooseTarget,
  checkOtherHeads,
  checkSnakes,
  checkEdges,
  checkSelf,
  setMove,
  noPathFallback
} = require("./helpers");

app.use(bodyParser.json());

router.post("/end", (req, res) => {
  return res.sendStatus(200);
});

router.post("/ping", (req, res) => {
  return res.sendStatus(200);
});

router.post("/start", function(req, res) {
  const snakeInfo = {
    color: "#61DAFB"
  };
  return res.json(snakeInfo);
});

router.post("/move", function(req, res) {
  const gameState = req.body;
  const { you, board } = gameState;
  const myHead = you.body[0];

  const path = generatePath(gameState, chooseTarget(gameState));
  const snakeResponse = {};

  // if no path exists choose a safe direction
  if (!path.length) {
    snakeResponse.move = noPathFallback(gameState);
    console.log(snakeResponse);
    return res.json(snakeResponse);
  } else {
    snakeResponse.move = setMove(path, myHead);
    console.log(snakeResponse);
    return res.json(snakeResponse);
  }
});

module.exports = router;
