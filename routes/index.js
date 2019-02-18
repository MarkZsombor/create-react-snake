const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const app = express();
const PF = require("pathfinding");

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

  // if no path exists or a bigger snake can move into the same space choose a safe direction
  if (!path.length) {
    console.log("NO PATH");
    let possibleMoves = [
      {
        direction: "right",
        x: myHead.x + 1,
        y: myHead.y,
        valid: true
      },
      {
        direction: "down",
        x: myHead.x,
        y: myHead.y + 1,
        valid: true
      },
      {
        direction: "left",
        x: myHead.x - 1,
        y: myHead.y,
        valid: true
      },
      {
        direction: "up",
        x: myHead.x,
        y: myHead.y - 1,
        valid: true
      }
    ];

    possibleMoves = checkSelf(gameState, possibleMoves);
    possibleMoves = checkEdges(gameState, possibleMoves);
    possibleMoves = checkSnakes(gameState, possibleMoves);
    possibleMoves = checkOtherHeads(gameState, possibleMoves);

    let validMoves = possibleMoves.filter(move => move.valid);
    // if no spaces are safe, this will allow to move into spaces bigger snakes can allow move into
    if (!validMoves.length) {
      //Reset possibleMoves
      for (let i in possibleMoves) {
        possibleMoves[i].valid = true;
      }

      //Recheck possibleMoves but ignoring larger snakes
      possibleMoves = checkSelf(gameState, possibleMoves);
      possibleMoves = checkEdges(gameState, possibleMoves);
      possibleMoves = checkSnakes(gameState, possibleMoves);
      validMoves = possibleMoves.filter(move => move.valid);
    }

    console.log(validMoves);
    snakeResponse.move = validMoves[0].direction;
    console.log(snakeResponse);
    return res.json(snakeResponse);
  } else {
    snakeResponse.move = setMove(path, myHead);
    console.log(snakeResponse);

    return res.json(snakeResponse);
  }
});

module.exports = router;

//Helper functions

//Convert the calculated path coords to a direction of movement
function setMove(path, head) {
  let move = "";
  if (path[1][0] === head.x && path[1][1] === head.y + 1) {
    move = "down";
  } else if (path[1][0] === head.x && path[1][1] === head.y - 1) {
    move = "up";
  } else if (path[1][0] === head.x + 1 && path[1][1] === head.y) {
    move = "right";
  } else if (path[1][0] === head.x - 1 && path[1][1] === head.y) {
    move = "left";
  } else {
    move = "down";
  }
  return move;
}

//Determines the distance from the snakes head to something
function getDistance(a, b, head) {
  let x = Math.abs(a - head.x);
  let y = Math.abs(b - head.y);
  return x + y;
}

//return the closest food item
function findFood(gameState) {
  const myHead = gameState.you.body[0];
  const allTargets = [];
  for (let i in gameState.board.food) {
    let distance = getDistance(
      gameState.board.food[i].x,
      gameState.board.food[i].y,
      myHead
    );
    //Add a weight that reduces the likelihood of targeting wall food
    if (
      !gameState.board.food[i].x ||
      !gameState.board.food[i].y ||
      gameState.board.food[i].x === gameState.board.width - 1 ||
      gameState.board.food[i].y === gameState.board.height - 1
    ) {
      distance += 10;
    }

    allTargets.push({
      x: gameState.board.food[i].x,
      y: gameState.board.food[i].y,
      distance: distance
    });
  }
  //Sort by weighted distance
  allTargets.sort(function(a, b) {
    return a.distance - b.distance;
  });
  //Return the closest
  return allTargets[0];
}

// Finds your own tail and returns its coordinates for targeting.
function findTail(gameState) {
  let snakeBody = gameState.you.body;
  let snakeLength = snakeBody.length;
  if (snakeLength === 1) {
    return findFood(gameState);
  }
  let tailPosition = snakeBody[snakeLength - 1];
  return tailPosition;
}

//Determine the longest snake
function getLongestLength(gameState) {
  const allSnakes = gameState.board.snakes;
  let longestSnake = 0;
  for (let snake in allSnakes) {
    if (allSnakes[snake].id !== gameState.you.id) {
      if (allSnakes[snake].body.length > longestSnake) {
        longestSnake = allSnakes[snake].body.length;
      }
    }
  }
  return longestSnake;
}

// Checks current health to switch between tail chasing and food chasing.
function chooseTarget(gameState, grid) {
  const { snakes } = gameState.board;
  if (
    (snakes.length == 2 && gameState.you.health > 60) ||
    !gameState.board.food.length
  ) {
    return findTail(gameState);
  } else {
    return findFood(gameState);
  }
}

// Stop the snake from running into itself
function checkSelf(gameState, possibleMoves) {
  const { body } = gameState.you;
  for (let i = 0; i < body.length - 1; i++) {
    for (let move in possibleMoves) {
      if (
        possibleMoves[move].valid &&
        possibleMoves[move].x === body[i].x &&
        possibleMoves[move].y === body[i].y
      ) {
        possibleMoves[move].valid = false;
      }
    }
  }
  return possibleMoves;
}

//Stop from running into wall
function checkEdges(gameState, possibleMoves) {
  for (let move in possibleMoves) {
    if (
      possibleMoves[move].x < 0 ||
      possibleMoves[move].x >= gameState.board.width
    ) {
      possibleMoves[move].valid = false;
    }
    if (
      possibleMoves[move].y < 0 ||
      possibleMoves[move].y >= gameState.board.height
    ) {
      possibleMoves[move].valid = false;
    }
  }
  return possibleMoves;
}

//check for other snakes
function checkSnakes(gameState, possibleMoves) {
  const { snakes } = gameState.board;
  for (let snake in snakes) {
    if (snakes[snake].id !== gameState.you.id) {
      //Don't run into body
      for (let i = 0; i < snakes[snake].body.length - 1; i++) {
        for (let move in possibleMoves) {
          if (
            possibleMoves[move].valid &&
            possibleMoves[move].x === snakes[snake].body[i].x &&
            possibleMoves[move].y === snakes[snake].body[i].y
          ) {
            possibleMoves[move].valid = false;
          }
        }
      }
    }
  }
  return possibleMoves;
}

function checkOtherHeads(gameState, possibleMoves) {
  const { snakes } = gameState.board;
  const { you } = gameState;
  snakeHeads = snakes
    .filter(snake => snake.id != you.id && snake.body.length >= you.body.length)
    .map(snake => snake.body[0]);
  const dangerZone = [];
  for (let head of snakeHeads) {
    dangerZone.push({ x: head.x + 1, y: head.y });
    dangerZone.push({ x: head.x - 1, y: head.y });
    dangerZone.push({ x: head.x, y: head.y + 1 });
    dangerZone.push({ x: head.x, y: head.y - 1 });
  }
  for (let i = 0; i < dangerZone.length; i++) {
    for (let move in possibleMoves) {
      if (
        possibleMoves[move].valid &&
        possibleMoves[move].x === dangerZone.x &&
        possibleMoves[move].y === dangerZone.y
      ) {
        possibleMoves[move].valid = false;
      }
    }
  }
  return possibleMoves;
}

//Marks areas on the Grid where the snake can't pass into
function setGrid(gameState) {
  const { you, board } = gameState;
  const myHead = you.body[0];
  const { snakes } = board;
  const grid = new PF.Grid(board.width, board.height);

  //Mark my snake in grid
  for (let i = 1; i < you.body.length - 1; i++) {
    grid.setWalkableAt(you.body[i].x, you.body[i].y, false);
  }

  //Mark other snake heads
  for (let snake in snakes) {
    if (snakes[snake].id !== you.id) {
      //Don't run into body

      for (let j = 0; j < snakes[snake].body.length; j++) {
        grid.setWalkableAt(
          snakes[snake].body[j].x,
          snakes[snake].body[j].y,
          false
        );
      }
      //Could we run into the head this turn
      if (
        getDistance(
          snakes[snake].body[0].x,
          snakes[snake].body[0].y,
          myHead
        ) === 2
      ) {
        //Decide on head collision depending on size
        if (you.body.length <= snakes[snake].body.length) {
          //Pathfinding will throw an error if we try to set a space outside the board
          if (snakes[snake].body[0].x + 1 < board.width) {
            grid.setWalkableAt(
              snakes[snake].body[0].x + 1,
              snakes[snake].body[0].y,
              false
            );
          }
          if (snakes[snake].body[0].x - 1 >= 0) {
            grid.setWalkableAt(
              snakes[snake].body[0].x - 1,
              snakes[snake].body[0].y,
              false
            );
          }
          if (snakes[snake].body[0].y + 1 < board.height) {
            grid.setWalkableAt(
              snakes[snake].body[0].x,
              snakes[snake].body[0].y + 1,
              false
            );
          }
          if (snakes[snake].body[0].y - 1 >= 0) {
            grid.setWalkableAt(
              snakes[snake].body[0].x,
              snakes[snake].body[0].y - 1,
              false
            );
          }
        }
      }
    }
  }
  return grid;
}

function generatePath(gameState, target) {
  const { you, board } = gameState;
  const myHead = you.body[0];

  // Set the board, choose the target and generate a path
  try {
    const grid = setGrid(gameState);
    const finder = new PF.AStarFinder();

    const path = finder.findPath(myHead.x, myHead.y, target.x, target.y, grid);
    return path;
  } catch (e) {
    console.error(e);
  }
}
