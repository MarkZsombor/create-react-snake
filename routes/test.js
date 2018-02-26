var reqObj = {
    "food": {
        "data": [
            {
                "object": "point",
                "x": 0,
                "y": 9
            }
        ],
        "object": "list"
    },
    "height": 20,
    "id": 1,
    "object": "world",
    "snakes": {
        "data": [
            {
                "body": {
                    "data": [
                        {
                            "object": "point",
                            "x": 13,
                            "y": 19
                        },
                        {
                            "object": "point",
                            "x": 13,
                            "y": 19
                        },
                        {
                            "object": "point",
                            "x": 13,
                            "y": 19
                        }
                    ],
                    "object": "list"
                },
                "health": 100,
                "id": "58a0142f-4cd7-4d35-9b17-815ec8ff8e70",
                "length": 3,
                "name": "Sonic Snake",
                "object": "snake",
                "taunt": "Gotta go fast"
            },
            {
                "body": {
                    "data": [
                        {
                            "object": "point",
                            "x": 8,
                            "y": 15
                        },
                        {
                            "object": "point",
                            "x": 8,
                            "y": 15
                        },
                        {
                            "object": "point",
                            "x": 8,
                            "y": 15
                        }
                    ],
                    "object": "list"
                },
                "health": 100,
                "id": "48ca23a2-dde8-4d0f-b03a-61cc9780427e",
                "length": 3,
                "name": "Typescript Snake",
                "object": "snake",
                "taunt": ""
            }
        ],
        "object": "list"
    },
    "turn": 0,
    "width": 20,
    "you": {
        "body": {
            "data": [
                {
                    "object": "point",
                    "x": 8,
                    "y": 15
                },
                {
                    "object": "point",
                    "x": 8,
                    "y": 16
                },
                {
                    "object": "point",
                    "x": 8,
                    "y": 17
                }
            ],
            "object": "list"
        },
        "health": 100,
        "id": "48ca23a2-dde8-4d0f-b03a-61cc9780427e",
        "length": 3,
        "name": "Typescript Snake",
        "object": "snake",
        "taunt": ""
    }
};

var myHead = { 
    x: reqObj.you.body.data[0].x,
    y: reqObj.you.body.data[0].y
}
// console.log("my snak head? \n", myHead);
// console.log('snek', reqObj.you);
var mySnekBody = reqObj.you.body.data;

// console.log(mySnekBody);

var possibleMoves = [
  {
    direction: "up",
    x: myHead.x,
    y: myHead.y - 1,
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
    direction: "right",
    x: myHead.x + 1,
    y: myHead.y,
    valid: true
  }
]
// Stop the snake from turning back into itself
for (var i = 0; i < mySnekBody.length; i++) {
    for (var move in possibleMoves) {
        if (possibleMoves[move].x === mySnekBody[i].x && possibleMoves[move].y === mySnekBody[i].y) {
            possibleMoves[move].valid = false;
        }
    }
}

console.log(reqObj.width)

function checkEdges() {
	for (var move in possibleMoves) {
		console.log('yup')
		if (possibleMoves[move].x < 0 || possibleMoves[move].x > reqObj.width) {
			possibleMoves[move].valid = false;
		}
		if (possibleMoves[move].y < 0 || possibleMoves[move].y > reqObj.height) {
			possibleMoves[move].valid = false;
		}
	}
} 

checkEdges();



console.log(possibleMoves)