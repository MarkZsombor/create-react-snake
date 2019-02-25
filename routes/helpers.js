const PF = require("pathfinding");

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
      distance += 5;
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
  return { target: allTargets[0], type: "food" };
}

// Finds your own tail and returns its coordinates for targeting.
function findTail(gameState) {
  let { body } = gameState.you;
  let snakeLength = body.length;
  if (snakeLength === 1) {
    return findFood(gameState);
  }
  let tailPosition = body[snakeLength - 1];
  return { target: tailPosition, type: "tail" };
}

// Checks current health to switch between tail chasing and food chasing.
function chooseTarget(gameState, grid) {
  const { snakes } = gameState.board;
  // if 2 snakes left
  // go for food if close or smaller
  // move towards attack
  if (!gameState.board.food.length) {
    return findTail(gameState);
  } else {
    return findFood(gameState);
  }
}

// Stop the snake from running into itself
function checkSelf(gameState, possibleMoves) {
  const { body } = gameState.you;
  for (let i = 0; i < body.length - 1; i++) {
    for (let move of possibleMoves) {
      if (move.valid && move.x === body[i].x && move.y === body[i].y) {
        move.valid = false;
      }
    }
  }
  if (
    body[body.length - 1].x == body[body.length - 2].x &&
    body[body.length - 1].y == body[body.length - 2].y
  ) {
    for (let move of possibleMoves) {
      if (
        move.valid &&
        move.x === body[body.length - 1].x &&
        move.y === body[body.length - 1].y
      ) {
        move.valid = false;
      }
    }
  }
  return possibleMoves;
}

//Stop from running into wall
function checkEdges(gameState, possibleMoves) {
  for (let move of possibleMoves) {
    if (move.x < 0 || move.x >= gameState.board.width) {
      console.log("bad width");
      move.valid = false;
      console.log(move);
    }
    if (move.y < 0 || move.y >= gameState.board.height) {
      console.log("bad height");
      move.valid = false;
      console.log(move);
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
        for (let move of possibleMoves) {
          if (
            move.valid &&
            move.x === snakes[snake].body[i].x &&
            move.y === snakes[snake].body[i].y
          ) {
            move.valid = false;
          }
        }
      }
    }
  }
  return possibleMoves;
}

function checkAllSnakes(gameState, possibleMoves, dangerZone) {
  for (let move of possibleMoves) {
    if (move.valid) {
      for (let segment of dangerZone) {
        if (move.x == segment.x && move.y == segment.y) {
          move.valid = false;
          console.log("blocked by snake");
          console.log(move);
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

function isInDangerZone(zone, dangerZone) {
  dangerZone = dangerZone.filter(
    segment => segment.x == zone.x && segment.y == zone.y
  );
  return dangerZone.length == 1;
}

function isDeadEnd(gameState, dangerZone, move) {
  const { height, width } = gameState.board;
  let blocked = false;
  let edgeZones = [
    [move.x + 1, move.y],
    [move.x - 1, move.y],
    [move.x, move.y + 1],
    [move.x, move.y - 1]
  ];

  edgeZones = edgeZones.filter(zone => {
    if (
      zone[0] >= width ||
      zone[0] < 0 ||
      zone[1] >= height ||
      zone[1] < 0 ||
      isInDangerZone(zone, dangerZone)
    ) {
      console.log("zone is dangerous");
      return false;
    } else {
      return true;
    }
  });
  
  if (edgeZones.length == 0) {
    blocked = true;
  }
  return blocked;
}

function checkDeadEnd(gameState, possibleMoves, dangerZone) {
  dangerZone = dangerZone.map(segment => [segment.x, segment.y]);
  for (let move of possibleMoves) {
    if (move.valid) {
      if (isDeadEnd(gameState, dangerZone, move)) {
        move.valid = false;
        console.log("deadend");
        console.log(move);
      }
    }
  }
  return possibleMoves;
}

//Marks areas on the Grid where the snake can't pass into
function setGrid(gameState, targetType) {
  const { you, board } = gameState;
  const { body } = you;
  const myHead = body[0];
  const { snakes } = board;
  const grid = new PF.Grid(board.width, board.height);

  //Mark my snake in grid
  for (let i = 1; i < body.length - 1; i++) {
    grid.setWalkableAt(body[i].x, body[i].y, false);
  }

  //Don't mark my tail -1 if just ate but won't collide
  if (
    body.length > 1 &&
    (targetType == "tail" ||
      (body[body.length - 1].x == body[body.length - 2].x &&
        body[body.length - 1].y == body[body.length - 2].y &&
        getDistance(body[body.length - 1].x, body[body.length - 1].y, myHead) >
          1))
  ) {
    grid.setWalkableAt(body[body.length - 1].x, body[body.length - 1].y, true);
  }

  //Mark other snake heads
  for (let snake of snakes) {
    if (snake.id !== you.id) {
      //Don't run into body

      for (let j = 0; j < snake.body.length; j++) {
        grid.setWalkableAt(snake.body[j].x, snake.body[j].y, false);
      }
      //Could we run into the head this turn
      if (getDistance(snake.body[0].x, snake.body[0].y, myHead) === 2) {
        //Decide on head collision depending on size
        if (body.length <= snake.body.length) {
          //Pathfinding will throw an error if we try to set a space outside the board
          if (snake.body[0].x + 1 < board.width) {
            grid.setWalkableAt(snake.body[0].x + 1, snake.body[0].y, false);
          }
          if (snake.body[0].x - 1 >= 0) {
            grid.setWalkableAt(snake.body[0].x - 1, snake.body[0].y, false);
          }
          if (snake.body[0].y + 1 < board.height) {
            grid.setWalkableAt(snake.body[0].x, snake.body[0].y + 1, false);
          }
          if (snake.body[0].y - 1 >= 0) {
            grid.setWalkableAt(snake.body[0].x, snake.body[0].y - 1, false);
          }
        }
      }
    }
  }

  return grid;
}

function generatePath(gameState, grid, target) {
  const { you, board } = gameState;
  const myHead = you.body[0];
  // Set the board, choose the target and generate a path
  try {
    const finder = new PF.AStarFinder();

    const path = finder.findPath(
      myHead.x,
      myHead.y,
      target.target.x,
      target.target.y,
      grid
    );
    return path;
  } catch (e) {
    console.error(e);
    return [];
  }
}

function noPathFallback(gameState) {
  console.log("NO PATH");
  const { you, board } = gameState;
  const myHead = you.body[0];
  const dangerZone = flatBoard(gameState);

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
  possibleMoves = checkAllSnakes(gameState, possibleMoves, dangerZone);
  possibleMoves = checkEdges(gameState, possibleMoves);
  possibleMoves = checkOtherHeads(gameState, possibleMoves);
  possibleMoves = checkDeadEnd(gameState, possibleMoves, dangerZone);

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
    possibleMoves = checkDeadEnd(gameState, possibleMoves, dangerZone);

    validMoves = possibleMoves.filter(move => move.valid);
  }
  const random = Math.floor(Math.random() * validMoves.length);
  console.log(possibleMoves);
  return validMoves[random].direction;
}

function validatePath(gameState, path) {
  const { you, board } = gameState;
  path = path
    .map(move => {
      return { x: move[0], y: move[1] };
    })
    .reverse();
  path.pop();
  const newBody = path.concat(you.body);
  newBody.length = you.body.length + 1;
  const newGameState = { ...gameState, you: { ...you, body: newBody } };
  const grid = setGrid(newGameState, "tail");

  try {
    const newPath = generatePath(newGameState, grid, findTail(newGameState));
    console.log("newPath", newPath.length);
    return newPath.length;
  } catch (e) {
    console.log("validate path failed");
    return 0;
  }
}

function flatBoard(gameState) {
  const { snakes } = gameState.board;
  return snakes.map(snake => snake.body.slice(0, -1)).flat();
}

module.exports = {
  generatePath,
  checkOtherHeads,
  checkSnakes,
  checkEdges,
  checkSelf,
  chooseTarget,
  findTail,
  findFood,
  getDistance,
  setMove,
  noPathFallback,
  validatePath,
  setGrid,
  flatBoard
};
