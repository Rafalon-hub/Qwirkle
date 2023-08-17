const express = require('express');
const app = express();
const serv = require('http').Server(app);
const PORT = process.env.PORT || 2000;

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(PORT);
console.log(`Server started on port ${PORT}`);

const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
const SHAPES = ['&spades;', '&clubs;', '&hearts;', '&diams;', '&#10022;', '&#10039;'];

var TILES = [];
var BOARD = {};
var SOCKET_LIST = {};
var PLAYER_LIST = {};
var PLAYER_ARRAY = [];
var IsGameStarted = false;
var EmptyBag = false;
var PENDING_PLAYERS = {};

/**
 * Shuffles an array in place
 * @param {any[]} array Array that needs to be shuffled
 * @returns Nothing
 */
function shuffleArray(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function initializeGame() {
  TILES = [];
  BOARD = {};
  IsGameStarted = false;
  EmptyBag = false;

  for (var i = 0; i < 3; i++) {
    for (var c = 0; c < COLORS.length; c++) {
      for (var s = 0; s < SHAPES.length; s++) {
        TILES.push({
          color: COLORS[c],
          shape: SHAPES[s]
        });
      }
    }
  }

  TILES = shuffleArray(TILES);
}

initializeGame();

var Player = function (id) {
  var self = {
    id: id,
    name: "Joueur",
    score: 0,
    scores: [],
    tiles: [],
    maxCount: 0
  }
  return self;
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function (socket) {
  socket.id = socket.conn.remoteAddress;
  console.log(socket.id);

  var player;

  if (IsGameStarted) {
    if (PENDING_PLAYERS[socket.id]) {
      player = PENDING_PLAYERS[socket.id];

      SOCKET_LIST[socket.id] = socket;
      PLAYER_LIST[socket.id] = player;
      PLAYER_ARRAY.push(player);

      delete PENDING_PLAYERS[socket.id];
    }
  } else {
    if (!SOCKET_LIST[socket.id]) {
      SOCKET_LIST[socket.id] = socket;

      player = Player(socket.id);
      for (var i = 0; i < 6; i++) {
        player.tiles.push(TILES.pop());
      }
      player.maxCount = countMax(player.tiles);
      player.order = 1 + PLAYER_ARRAY.length;
      PLAYER_LIST[socket.id] = player;
      PLAYER_ARRAY.push(player);
    } else {
      SOCKET_LIST[socket.id] = socket;
      player = PLAYER_LIST[socket.id];
    }
  }

  // Permet de récupérer le nom d'un joueur et d'actualiser la liste des joueurs
  socket.on('myNameIs', function (data) {
    console.log("Joueur : " + data.name + " : " + player.order);
    player.name = data.name;

    sendPlayerNames();
  });

  socket.on('startGame', function () {
    IsGameStarted = true;

    PLAYER_ARRAY.sort((a, b) => b.maxCount - a.maxCount);

    for (var i = 0; i < PLAYER_ARRAY.length; i++) {
      PLAYER_LIST[PLAYER_ARRAY[i].id].order = 1 + i;
    }
    //console.log("Le jeu commence pour "+PLAYER_ARRAY[0].name);

    SOCKET_LIST[PLAYER_ARRAY[0].id].emit('yourTurn');

    updatePlayerTurn();
  });

  socket.on('disconnect', function () {
    if (!IsGameStarted) {
      while (player.tiles.length) {
        TILES.push(player.tiles.pop());
      }
    } else {
      PENDING_PLAYERS[socket.id] = player;
    }

    for (var i = 0; i < PLAYER_ARRAY.length; i++) {
      if (PLAYER_ARRAY[i].id === socket.id) {
        PLAYER_ARRAY.splice(i, 1);
        break;
      }
    }
    delete SOCKET_LIST[socket.id];
    delete PLAYER_LIST[socket.id];

    if (!PLAYER_ARRAY.length) {
      initializeGame();
    } else {
      sendPlayerNames();
    }
  });

  socket.on('changedTiles', function (data) {
    var minLength = data.length;
    if (TILES.length < minLength)
      minLength = TILES.length;

    for (var i = 0; i < minLength; i++) {
      player.tiles.push(TILES.pop());
    }
    for (var i = 0; i < minLength; i++) {
      //console.log("Tuile changée: ["+data[i].color+","+data[i].shape+"]");
      for (var j = 0; j < player.tiles.length; j++) {
        if (player.tiles[j].shape == data[i].shape && player.tiles[j].color == data[i].color) {
          TILES.unshift({
            color: data[i].color,
            shape: data[i].shape
          });
          player.tiles.splice(j, 1);
          break;
        }
      }
    }

    player.scores.push(0);

    socket.emit('playerTiles', player.tiles);

    PLAYER_ARRAY.push(PLAYER_ARRAY.shift());
    //console.log("Le jeu continue pour "+PLAYER_ARRAY[0].name);
    SOCKET_LIST[PLAYER_ARRAY[0].id].emit('yourTurn');

    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit('tilesLeft', TILES.length);
    }

    updatePlayerTurn();
  });

  socket.on('playedTiles', function (data) {
    for (var i in BOARD) {
      for (var j in BOARD[i]) {
        BOARD[i][j].isNew = false;
      }
    }

    for (var i = 0; i < data.length; i++) {
      if (!BOARD[data[i].x]) {
        BOARD[data[i].x] = {};
      }
      BOARD[data[i].x][data[i].y] = {
        shape: data[i].shape,
        color: data[i].color,
        x: data[i].x,
        y: data[i].y,
        isNew: true
      };

      for (var j = 0; j < player.tiles.length; j++) {
        if (player.tiles[j].shape == data[i].shape && player.tiles[j].color == data[i].color) {
          player.tiles.splice(j, 1);
          break;
        }
      }
    }

    var scoreTotal = 0;
    var nbQwirkle = 0;

    for (var i = 0; i < data.length; i++) {
      var scoreSuppl = 0;
      var scoreSuppl2 = 0;

      if (i == 0) {
        scoreSuppl = verticalScore(data[i].x, data[i].y);
        scoreSuppl2 = horizontalScore(data[i].x, data[i].y);
      } else if (data[i].x == data[i - 1].x) {
        scoreSuppl = verticalScore(data[i].x, data[i].y);
      } else {
        scoreSuppl = horizontalScore(data[i].x, data[i].y);
      }
      if (scoreSuppl > 0)
        scoreTotal += 1 + scoreSuppl;
      if (scoreSuppl2 > 0)
        scoreTotal += 1 + scoreSuppl2;
      if (scoreSuppl == 11)
        nbQwirkle++;
      if (scoreSuppl2 == 11)
        nbQwirkle++;
    }
    if (data.length > 0 && scoreTotal == 0) {
      scoreTotal = 1;
    }

    while (TILES.length && player.tiles.length < 6) {
      player.tiles.push(TILES.pop());
    }

    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit('board', BOARD);
      SOCKET_LIST[i].emit('tilesLeft', TILES.length);
    }

    var msgToSend = '';
    switch (nbQwirkle) {
      case 1:
        msgToSend = 'QWIRKLE';
        break;
      case 2:
        msgToSend = 'DOUBLE\nQWIRKLE';
        break;
      case 3:
        msgToSend = 'TRIPLE\nQWIRKLE';
        break;
      case 4:
        msgToSend = 'QUADRUPLE\nQWIRKLE';
        break;
      case 5:
        msgToSend = 'QUINTUPLE\nQWIRKLE';
        break;
      default:
        msgToSend = '';
    }
    if (!TILES.length && !EmptyBag) {
      if (msgToSend.length > 0)
        msgToSend += '\n';
      msgToSend += 'NAPLOU';

      EmptyBag = true;
    }

    var gameOver = false;
    if (!player.tiles.length) {
      scoreTotal += 6;
      gameOver = true;
      if (msgToSend.length > 0)
        msgToSend += '\n';
      msgToSend += 'BONUS +6';
    } else {
      PLAYER_ARRAY.push(PLAYER_ARRAY.shift());
      SOCKET_LIST[PLAYER_ARRAY[0].id].emit('yourTurn');
    }

    player.scores.push(scoreTotal);
    player.score += scoreTotal;

    if (msgToSend.length > 0) {
      for (var i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('displayMessage', {
          txtMsg: msgToSend,
          className: 'colorful',
          subclassName: 'tile',
          isGameOver: gameOver
        });
      }
    }
    sendPlayerNames();

    updatePlayerTurn();
  });

  socket.on('shiftUp', function () {
    if (!BOARD[0]) {
      for (var i = 0; i < 20; i++) {
        delete BOARD[i];

        if (BOARD[1 + i]) {
          BOARD[i] = {};
          for (var j in BOARD[1 + i]) {
            BOARD[i][j] = {
              shape: BOARD[1 + i][j].shape,
              color: BOARD[1 + i][j].color,
              x: BOARD[1 + i][j].x - 1,
              y: BOARD[1 + i][j].y
            };
          }
        }
      }
    }

    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit('board', BOARD);
    }
  });
  socket.on('shiftDown', function () {
    if (!BOARD[19]) {
      for (var i = 19; i >= 0; i--) {
        delete BOARD[i];

        if (BOARD[i - 1]) {
          BOARD[i] = {};
          for (var j in BOARD[i - 1]) {
            BOARD[i][j] = {
              shape: BOARD[i - 1][j].shape,
              color: BOARD[i - 1][j].color,
              x: BOARD[i - 1][j].x + 1,
              y: BOARD[i - 1][j].y
            };
          }
        }
      }
    }

    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit('board', BOARD);
    }
  });
  socket.on('shiftLeft', function () {
    var canShift = true;
    for (var i in BOARD) {
      if (BOARD[i][0]) {
        canShift = false;
        break;
      }
    }

    if (canShift) {
      for (var i in BOARD) {
        for (var j = 0; j < 20; j++) {
          if (BOARD[i][1 + j]) {
            BOARD[i][j] = {
              shape: BOARD[i][1 + j].shape,
              color: BOARD[i][1 + j].color,
              x: BOARD[i][1 + j].x,
              y: BOARD[i][1 + j].y - 1
            };
          } else {
            delete BOARD[i][j];
          }
        }
      }
    }

    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit('board', BOARD);
    }
  });
  socket.on('shiftRight', function () {
    var canShift = true;
    for (var i in BOARD) {
      if (BOARD[i][19]) {
        canShift = false;
        break;
      }
    }

    if (canShift) {
      for (var i in BOARD) {
        for (var j = 19; j >= 0; j--) {
          if (BOARD[i][j - 1]) {
            BOARD[i][j] = {
              shape: BOARD[i][j - 1].shape,
              color: BOARD[i][j - 1].color,
              x: BOARD[i][j - 1].x,
              y: BOARD[i][j - 1].y + 1
            };
          } else {
            delete BOARD[i][j];
          }
        }
      }
    }

    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit('board', BOARD);
    }
  });
});

function updatePlayerTurn() {
  for (var i in PLAYER_LIST) {
    if (PLAYER_LIST[i].id === PLAYER_ARRAY[0].id) {
      PLAYER_LIST[i].turnToPlay = true;
    } else {
      PLAYER_LIST[i].turnToPlay = false;
    }
  }
  for (var i in SOCKET_LIST) {
    SOCKET_LIST[i].emit('playerNames', PLAYER_LIST);
  }
}

function verticalScore(i, j) {
  var score = 0;
  for (var x = i - 1; x >= 0; x--) {
    if (!BOARD[x] || !BOARD[x][j]) {
      break;
    } else {
      score++;
    }
  }
  for (var x = i + 1; x < 20; x++) {
    if (!BOARD[x] || !BOARD[x][j]) {
      break;
    } else {
      score++;
    }
  }

  if (score == 5)
    score += 6;

  return score;
}
function horizontalScore(i, j) {
  var score = 0;
  for (var y = j - 1; y >= 0; y--) {
    if (!BOARD[i][y]) {
      break;
    } else {
      score++;
    }
  }
  for (var y = j + 1; y < 20; y++) {
    if (!BOARD[i][y]) {
      break;
    } else {
      score++;
    }
  }

  if (score == 5)
    score += 6;

  return score;
}

function sendPlayerNames() {
  for (var i in SOCKET_LIST) {
    SOCKET_LIST[i].emit('playerTiles', PLAYER_LIST[i].tiles);
    SOCKET_LIST[i].emit('playerNames', PLAYER_LIST);
  }
}

function countMax(tiles) {
  var maxValue = 1;
  var colorCount = 1;
  var shapeCount = 1;
  var colorList = [];
  var shapeList = [];

  for (var i = 0; i < tiles.length; i++) {
    colorCount = 1;
    shapeCount = 1;
    colorList = [];
    shapeList = [];
    for (var j = 0; j < tiles.length; j++) {
      if (tiles[j].shape == tiles[i].shape && tiles[j].color != tiles[i].color) {
        if (colorList.length > 0) {
          var colorFound = false;
          for (var k = 0; k < colorList.length; k++) {
            if (tiles[j].color == colorList[k]) {
              colorFound = true;
            }
          }
          if (!colorFound) {
            colorList.push(tiles[j].color);
            colorCount++;
          }
        } else {
          colorList.push(tiles[j].color);
          colorCount++;
        }
      }
    }
    if (colorCount > maxValue) {
      maxValue = colorCount;
    }
    for (var j = 0; j < tiles.length; j++) {
      if (tiles[j].color == tiles[i].color && tiles[j].shape != tiles[i].shape) {
        if (shapeList.length > 0) {
          var shapeFound = false;
          for (var k = 0; k < shapeList.length; k++) {
            if (tiles[j].shape == shapeList[k]) {
              shapeFound = true;
            }
          }
          if (!shapeFound) {
            shapeList.push(tiles[j].shape);
            shapeCount++;
          }
        } else {
          shapeList.push(tiles[j].shape);
          shapeCount++;
        }
      }
    }
    if (shapeCount > maxValue) {
      maxValue = shapeCount;
    }
  }

  return maxValue;
}