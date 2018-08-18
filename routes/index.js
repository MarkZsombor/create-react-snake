const express = require('express')
const router  = express.Router()
const bodyParser = require('body-parser')
const app = express();
const PF = require('pathfinding');

app.use(bodyParser.json());

const taunts = [
  "Don't make me run, I'm full of Chocolate!",
  "I don't deserve this!",
  "Oh guten tag.",
  "I also have a bag of marzipan JoyJoys!",
  "Would you like a lick of my flavor wax?",
  "I begged you to look at mine first!"
];

//Johnnie's contribution
router.post('/end', (req, res) => {
  return res.sendStatus(200);
});

router.post('/start', function (req, res) {
  // console.log("Starter Request Object", req.body)
  const snakeInfo = {
    color: '#FFD90F',
    // head_url: 'http://www.simpsonspark.com/images/persos/contributions/uter-22544.jpg',
    // head_type: 'smile',
    // tail_type: 'fat-rattle',
    // taunt: taunts[0],
  }
  return res.json(snakeInfo);
});

router.post('/move', function (req, res) {
  // console.log("Move Request Object", req.body)
  const gameState = req.body;

  const myHead = {
    x: gameState.you.body[0].x,
    y: gameState.you.body[0].y
  };
  console.log("myHead", myHead);
  //Create an empty board
  const grid = new PF.Grid(gameState.board.width, gameState.board.height);

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

        for (let j = 0; j < allSnakes[snake].body.length - 1; j++) {
          grid.setWalkableAt(allSnakes[snake].body[j].x, allSnakes[snake].body[j].y, false);
        }
        //Could we run into the head this turn
        if (getDistance(allSnakes[snake].body[0].x, allSnakes[snake].body[0].y, myHead) === 2) {

          //Decide on head collision depending on size
          if (gs.you.body.length <= allSnakes[snake].body.length) {
            //Pathfinding will throw an error if we try to set a space outside the board
            if (allSnakes[snake].body[0].x + 1 < gs.board.width) {
              grid.setWalkableAt((allSnakes[snake].body[0].x + 1), allSnakes[snake].body[0].y, false);
            }
            if (allSnakes[snake].body[0].x - 1 >= 0) {
              grid.setWalkableAt((allSnakes[snake].body[0].x - 1), allSnakes[snake].body[0].y, false);
            }
            if (allSnakes[snake].body[0].y + 1 < gs.board.height) {
              grid.setWalkableAt(allSnakes[snake].body[0].x, (allSnakes[snake].body[0].y + 1), false);
            }
            if (allSnakes[snake].body[0].y - 1 >= 0) {
              grid.setWalkableAt(allSnakes[snake].body[0].x, (allSnakes[snake].body[0].y - 1), false);
            }
          }
        }
      }
    }
  }

  // Set the board, choose the target and generate a path
  setGrid(gameState, grid);
  const closestTarget = chooseTarget(gameState);
  const finder = new PF.AStarFinder;
  const path = finder.findPath(myHead.x, myHead.y, closestTarget.x, closestTarget.y, grid);
  const snakeResponse = {};

  // if no path exists or a bigger snake can move into the same space choose a safe direction
  if (!path.length || (path.length === 2 && !grid.nodes[path[0][1]][path[0][0]].walkable)) {
    // console.log('NO PATH')
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
      },
    ];

    // Stop the snake from running into itself
    function checkSelf(gs, pm) {
      for (let i = 0; i < gs.you.body.length-1; i++) {
        for (let move in pm) {
          if (pm[move].x === gs.you.body[i].x && pm[move].y === gs.you.body[i].y) {
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
      const allSnakes = gs.board.snakes
      for (let snake in allSnakes) {
        if (allSnakes[snake].id !== gs.you.id) {
          //Don't run into body
          for (let i = 0; i < allSnakes[snake].body.length-1; i++) {
            for (let move in pm) {
              if (pm[move].x === allSnakes[snake].body[i].x && pm[move].y === allSnakes[snake].body[i].y) {
                pm[move].valid = false;
              }
            }
          }
          //Decide on head collision depending on size
          if (allSnakes[snake].body.length >= gs.you.body.length) {
            for (let move in pm) {
              if (pm[move].x === allSnakes[snake].body[0].x + 1 && pm[move].y === allSnakes[snake].body[0].y) {
                pm[move].valid = false;
              }
              if (pm[move].x === allSnakes[snake].body[0].x - 1 && pm[move].y === allSnakes[snake].body[0].y) {
                pm[move].valid = false;
              }
              if (pm[move].x === allSnakes[snake].body[0].x && pm[move].y === allSnakes[snake].body[0].y + 1) {
                pm[move].valid = false;
              }
              if (pm[move].x === allSnakes[snake].body[0].x && pm[move].y === allSnakes[snake].body[0].y - 1) {
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
      // console.log('NO PATH, NO OPEN MOVES');

      //Reset possibleMoves
      for (let i in possibleMoves) {
        possibleMoves[i].valid = true
      }
      
      //Recheck possibleMoves but ignoring larger snakes
      gameState.you.body.length += 100;
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
    // snakeResponse.taunt = taunts[1];
    console.log(snakeResponse)
    return res.json(snakeResponse);

  } else {
    
    snakeResponse.move = setMove(path, myHead);
    // snakeResponse.taunt = taunts[getTaunt(gameState)];
    console.log(snakeResponse)

    return res.json(snakeResponse);

  }
})

module.exports = router

//Helper functions

//Convert the calculated path coords to a direction of movement
function setMove(path, head) {
  if (path[1][0] === head.x && path[1][1] === head.y + 1) {
    return 'down';
  } else if (path[1][0] === head.x && path[1][1] === head.y - 1) {
    return 'up';
  } else if (path[1][0] === head.x + 1 && path[1][1] === head.y) {
    return 'right';
  } else if (path[1][0] === head.x - 1 && path[1][1] === head.y) {
    return 'left';
  } else {
    return 'down';
  }
}

// Make Uter say funny things for hilarity
function getTaunt(gs) {
  let tauntIndex = 0;
  if (gs.you.health > 90) {
    tauntIndex = 0;
  } else if (gs.you.health < 30) {
    tauntIndex = 5;
  } else if (gs.turn < 100) {
    tauntIndex = 4;
  } else if (gs.turn < 150) {
    tauntIndex = 2;
  } else {
    tauntIndex = 3;
  }
  return tauntIndex;
}

//Determines the distance from the snakes head to something
function getDistance(a, b, head) {
  console.log('inside the get distance function', a, b, head)
  let x = Math.abs(a - head.x) 
  let y = Math.abs(b - head.y);
  return x + y;
} 

//return the closest food item
function findFood(gs) {
  let myHead = gs.you.body[0]
  console.log("looking for food")
  console.log('first food in array', gs.board.food[0].x, gs.board.food[0].y)
  const allTargets = [];
  for (let i in gs.board.food) {
    console.log('inside the food for loop', i)
    console.log(gs.board.food[i].x, gs.board.food[i].y)
    console.log(myHead)
    let distance = getDistance(gs.board.food[i].x, gs.board.food[i].y, myHead);
    console.log('distance to food', distance)
    //Add a weight that reduces the likelihood of targeting wall food
    if (!gs.board.food[i].x || !gs.board.food[i].y || gs.board.food[i].x === gs.board.width - 1 || gs.board.food[i].y === gs.board.height - 1) {
      distance += 10;
    }

    allTargets.push({
      x: gs.board.food[i].x,
      y: gs.board.food[i].y,
      distance: distance
    });

  }
  //Sort by weighted distance
  allTargets.sort(function (a, b) {
    return a.distance - b.distance;
  });
  //Return the closest
  console.log("closest food is ", allTargets[0]);
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
function chooseTarget(gs) {
  // Toggle to keep you as the longest snake
  // if (gs.you.length < getLongestLength(gs)){
  //     return findFood(gs);
  // } else 
  if (gs.board.snakes.length == 2) {
    if (gs.you.health > 111) {
      return findTail(gs);
    } else {
      return findFood(gs);
    }
  } else {
    return findFood(gs);
  }
}
