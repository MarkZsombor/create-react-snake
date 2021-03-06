const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const app = express();
const PF = require("pathfinding");
const {
  generatePath,
  chooseTarget,
  setMove,
  noPathFallback,
  findTail,
  validatePath,
  setGrid
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
    headType: "evil",
    tailType: "freckled",
    color: "#61DAFB"
  };
  return res.json(snakeInfo);
});

router.post("/move", function(req, res) {
  const gameState = req.body;
  const { you, board } = gameState;
  const myHead = you.body[0];
  const snakeResponse = {};
  let validPath = true;
  try {
    console.log("turn", gameState.turn);
    const target = chooseTarget(gameState);
    const grid = setGrid(gameState, target.type);
    const gridBackup = grid.clone();
    let path = generatePath(gameState, grid, target);
    if (path.length) {
      validPath = validatePath(gameState, path);
    } else {
      validPath = false;
    }
    console.log("path", path.length);
    console.log("validPath", validPath);

    if (!validPath) {
      const newGrid = setGrid(req.body);
      path = generatePath(gameState, newGrid, findTail(gameState));
      console.log("path2", path.length);

      if (path.length) {
        validPath = true;
      }
    }
    // if no path exists choose a safe direction
    if (!path.length || !validPath) {
      snakeResponse.move = noPathFallback(gameState);
      console.log(snakeResponse);
      return res.json(snakeResponse);
    } else {
      snakeResponse.move = setMove(path, myHead);
      console.log(snakeResponse);
      return res.json(snakeResponse);
    }
  } catch (e) {
    console.log(JSON.stringify(gameState));
    console.log(e);
    snakeResponse.move = noPathFallback(gameState);
    console.log(snakeResponse);
    return res.json(snakeResponse);
  }
});

module.exports = router;
