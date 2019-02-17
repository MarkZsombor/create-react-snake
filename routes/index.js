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
    color: "#FFD90F"
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

  const grid = new PF.Grid(board.width, board.height);

  //Marks areas on the Grid where the snake can't pass into
  function setGrid(gs, grid) {
    //Mark my snake in grid
    for (let i = 1; i < gs.you.body.length - 1; i++) {
      grid.setWalkableAt(gs.you.body[i].x, gs.you.body[i].y, false);
    }

    //Mark other snake heads
    const allSnakes = gs.board.snakes;
    for (let snake in allSnakes) {
      if (allSnakes[snake].id !== gs.you.id) {
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
          if (gs.you.body.length <= allSnakes[snake].body.length) {
            //Pathfinding will throw an error if we try to set a space outside the board
            if (allSnakes[snake].body[0].x + 1 < gs.board.width) {
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
            if (allSnakes[snake].body[0].y + 1 < gs.board.height) {
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

  // Set the board, choose the target and generate a path
  setGrid(gameState, grid);
  const closestTarget = chooseTarget(gameState);
  let snakeLength = you.body.length;

  const finder = new PF.AStarFinder();
  const path = finder.findPath(
    myHead.x,
    myHead.y,
    closestTarget.x,
    closestTarget.y,
    grid
  );

  const snakeResponse = {};

  // if no path exists or a bigger snake can move into the same space choose a safe direction
  if (
    !path.length ||
    (path.length === 2 && !grid.nodes[path[0][1]][path[0][0]].walkable)
  ) {
    // console.log("NO PATH");
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
    function checkSelf(gs, pm) {
      for (let i = 0; i < gs.you.body.length - 1; i++) {
        for (let move in pm) {
          if (
            pm[move].x === gs.you.body[i].x &&
            pm[move].y === gs.you.body[i].y
          ) {
            pm[move].valid = false;
          }
        }
      }
    }

    //Stop from running into wall
    function checkEdges(gs, pm) {
      for (let move in pm) {
        if (pm[move].x < 0 || pm[move].x >= gs.board.width) {
          pm[move].valid = false;
        }
        if (pm[move].y < 0 || pm[move].y >= gs.board.height) {
          pm[move].valid = false;
        }
      }
    }

    //check for other snakes
    function checkSnakes(gs, pm) {
      const allSnakes = getLivingSnakes(gs);
      for (let snake in allSnakes) {
        if (allSnakes[snake].id !== gs.you.id) {
          //Don't run into body
          for (let i = 0; i < allSnakes[snake].body.length - 1; i++) {
            for (let move in pm) {
              if (
                pm[move].x === allSnakes[snake].body[i].x &&
                pm[move].y === allSnakes[snake].body[i].y
              ) {
                pm[move].valid = false;
              }
            }
          }
          //Decide on head collision depending on size
          if (allSnakes[snake].body.length >= gs.you.body.length) {
            for (let move in pm) {
              if (
                pm[move].x === allSnakes[snake].body[0].x + 1 &&
                pm[move].y === allSnakes[snake].body[0].y
              ) {
                pm[move].valid = false;
              }
              if (
                pm[move].x === allSnakes[snake].body[0].x - 1 &&
                pm[move].y === allSnakes[snake].body[0].y
              ) {
                pm[move].valid = false;
              }
              if (
                pm[move].x === allSnakes[snake].body[0].x &&
                pm[move].y === allSnakes[snake].body[0].y + 1
              ) {
                pm[move].valid = false;
              }
              if (
                pm[move].x === allSnakes[snake].body[0].x &&
                pm[move].y === allSnakes[snake].body[0].y - 1
              ) {
                pm[move].valid = false;
              }
            }
          }
        }
      }
    }

    checkSelf(gameState, possibleMoves);
    checkEdges(gameState, possibleMoves);
    checkSnakes(gameState, possibleMoves);

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
function findFood(gs) {
  let myHead = gs.you.body[0];
  const allTargets = [];
  for (let i in gs.board.food) {
    let distance = getDistance(gs.board.food[i].x, gs.board.food[i].y, myHead);
    //Add a weight that reduces the likelihood of targeting wall food
    if (
      !gs.board.food[i].x ||
      !gs.board.food[i].y ||
      gs.board.food[i].x === gs.board.width - 1 ||
      gs.board.food[i].y === gs.board.height - 1
    ) {
      distance += 10;
    }

    allTargets.push({
      x: gs.board.food[i].x,
      y: gs.board.food[i].y,
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
function findTail(gs) {
  let snakeBody = gs.you.body;
  let snakeLength = snakeBody.length;
  if (snakeLength === 1) {
    return findFood(gs);
  }
  let tailPosition = snakeBody[snakeLength - 1];
  return tailPosition;
}

//Determine the longest snake
function getLongestLength(gs) {
  const allSnakes = gs.board.snakes;
  let longestSnake = 0;
  for (let snake in allSnakes) {
    if (allSnakes[snake].id !== gs.you.id) {
      if (allSnakes[snake].body.length > longestSnake) {
        longestSnake = allSnakes[snake].body.length;
      }
    }
  }
  return longestSnake;
}

// Checks current health to switch between tail chasing and food chasing.
function chooseTarget(gs, grid) {
  const { snakes } = gs.board;
  if ((snakes.length == 2 && gs.you.health > 60) || !gs.board.food.length) {
    return findTail(gs);
  } else {
    return findFood(gs);
  }
}
