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
  const { you, board } = req.body;
  const myHead = {
    x: you.body[0].x,
    y: you.body[0].y
  };

  //Marks areas on the Grid where the snake can't pass into
  function setGrid(gameState, grid) {
    //Mark my snake in grid
    for (let i = 1; i < gameState.you.body.length - 1; i++) {
      grid.setWalkableAt(
        gameState.you.body[i].x,
        gameState.you.body[i].y,
        false
      );
    }

    //Mark other snake heads
    const allSnakes = gameState.board.snakes;
    for (let snake in allSnakes) {
      if (allSnakes[snake].id !== gameState.you.id) {
        //Don't run into body

        for (let j = 0; j < allSnakes[snake].body.length; j++) {
          grid.setWalkableAt(
            allSnakes[snake].body[j].x,
            allSnakes[snake].body[j].y,
            false
          );
        }
        //Could we run into the head this turn
        if (
          getDistance(
            allSnakes[snake].body[0].x,
            allSnakes[snake].body[0].y,
            myHead
          ) === 2
        ) {
          //Decide on head collision depending on size
          if (gameState.you.body.length <= allSnakes[snake].body.length) {
            //Pathfinding will throw an error if we try to set a space outside the board
            if (allSnakes[snake].body[0].x + 1 < gameState.board.width) {
              grid.setWalkableAt(
                allSnakes[snake].body[0].x + 1,
                allSnakes[snake].body[0].y,
                false
              );
            }
            if (allSnakes[snake].body[0].x - 1 >= 0) {
              grid.setWalkableAt(
                allSnakes[snake].body[0].x - 1,
                allSnakes[snake].body[0].y,
                false
              );
            }
            if (allSnakes[snake].body[0].y + 1 < gameState.board.height) {
              grid.setWalkableAt(
                allSnakes[snake].body[0].x,
                allSnakes[snake].body[0].y + 1,
                false
              );
            }
            if (allSnakes[snake].body[0].y - 1 >= 0) {
              grid.setWalkableAt(
                allSnakes[snake].body[0].x,
                allSnakes[snake].body[0].y - 1,
                false
              );
            }
          }
        }
      }
    }
  }

  function generatePath(gameState, target) {
    const { you, board } = gameState;
    const myHead = {
      x: you.body[0].x,
      y: you.body[0].y
    };
    console.log("head", myHead);
    console.log("target", target);
    const grid = new PF.Grid(board.width, board.height);

    // Set the board, choose the target and generate a path
    setGrid(gameState, grid);
    const finder = new PF.AStarFinder();

    const path = finder.findPath(myHead.x, myHead.y, target.x, target.y, grid);
    return path;
  }

  const path = generatePath(gameState, chooseTarget(gameState));
  console.log("path length", path.length);
  const snakeResponse = {};

  // if no path exists or a bigger snake can move into the same space choose a safe direction
  if (!path.length) {
    console.log("NO PATH");
    const possibleMoves = [
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

    // Stop the snake from running into itself
    function checkSelf(gameState, possibleMoves) {
      console.log("checking self");
      const { body } = gameState.you;
      for (let i = 0; i < body.length - 1; i++) {
        for (let move in possibleMoves) {
          if (
            possibleMoves[move].x === body[i].x &&
            possibleMoves[move].y === body[i].y
          ) {
            possibleMoves[move].valid = false;
          }
        }
      }
    }

    //Stop from running into wall
    function checkEdges(gameState, possibleMoves) {
      console.log("checking edges");

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
    }

    //check for other snakes
    function checkSnakes(gameState, possibleMoves) {
      console.log("checking snakes");

      const { snakes } = gameState.board;
      for (let snake in snakes) {
        if (snakes[snake].id !== gameState.you.id) {
          //Don't run into body
          for (let i = 0; i < snakes[snake].body.length - 1; i++) {
            for (let move in possibleMoves) {
              if (
                possibleMoves[move].x === snakes[snake].body[i].x &&
                possibleMoves[move].y === snakes[snake].body[i].y
              ) {
                possibleMoves[move].valid = false;
              }
            }
          }
          //Decide on head collision depending on size
          if (snakes[snake].body.length >= gameState.you.body.length) {
            for (let move in possibleMoves) {
              if (
                possibleMoves[move].x === snakes[snake].body[0].x + 1 &&
                possibleMoves[move].y === snakes[snake].body[0].y
              ) {
                possibleMoves[move].valid = false;
              }
              if (
                possibleMoves[move].x === snakes[snake].body[0].x - 1 &&
                possibleMoves[move].y === snakes[snake].body[0].y
              ) {
                possibleMoves[move].valid = false;
              }
              if (
                possibleMoves[move].x === snakes[snake].body[0].x &&
                possibleMoves[move].y === snakes[snake].body[0].y + 1
              ) {
                possibleMoves[move].valid = false;
              }
              if (
                possibleMoves[move].x === snakes[snake].body[0].x &&
                possibleMoves[move].y === snakes[snake].body[0].y - 1
              ) {
                possibleMoves[move].valid = false;
              }
            }
          }
        }
      }
    }

    checkSelf(gameState, possibleMoves);
    checkEdges(gameState, possibleMoves);
    checkSnakes(gameState, possibleMoves);
    console.log("possibleMoves", possibleMoves);

    const validMoves = [];
    for (let i in possibleMoves) {
      if (possibleMoves[i].valid) {
        validMoves.push(possibleMoves[i]);
      }
    }
    // if no spaces are safe, this will allow to move into spaces bigger snakes can allow move into
    if (!validMoves.length) {
      //Reset possibleMoves
      for (let i in possibleMoves) {
        possibleMoves[i].valid = true;
      }

      //Recheck possibleMoves but ignoring larger snakes
      you.body.length += 100;
      checkSelf(gameState, possibleMoves);
      checkEdges(gameState, possibleMoves);
      checkSnakes(gameState, possibleMoves);
      for (let i in possibleMoves) {
        if (possibleMoves[i].valid) {
          validMoves.push(possibleMoves[i]);
        }
      }
    }

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
  let myHead = gameState.you.body[0];
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
