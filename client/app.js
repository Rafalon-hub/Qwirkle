const socket = io();
socket.on('connected', onConnected);
socket.on('newGameCreated', onNewGameCreated);
socket.on('roomJoined', onRoomJoined);
socket.on('playerList', onPlayerList);
socket.on('gameStarted', onGameStarted);
socket.on('playerHand', onPlayerHand);
socket.on('canPlay', onPlayerCanPlay);
socket.on('board', onBoard);

socket.on('gameOver', gameOver);
socket.on('error', error);

function onConnected(socketId) {
  App.init(socketId);
}
function onNewGameCreated(data) {
  App.Host.gameInit(data);
}
function onRoomJoined(gameId) {
  App.Player.onRoomJoined(gameId);
}
function onPlayerList(playerList) {
  App.Player.onPlayerList(playerList);
}
function onGameStarted() {
  App.Player.gameStarted();
}
function onPlayerHand(tiles) {
  App.Player.myHand(tiles);
}
function onPlayerCanPlay(socketId) {
  App.Player.onCanPlay(socketId);
}
function onBoard(board) {
  App.tiles = board;
  App.updateBoard();
}

function gameOver() {

}
function error() {
  
}

var App = {
  gameId: 0,
  role: '',
  socketId: '',
  currentRound: 0,
  tiles: [],
  xStart: 0,
  yStart: 0,
  init: function(socketId) {
    App.socketId = socketId;
    App.cacheElements();
    App.showInitScreen();
    App.bindEvents();
    App.initBoard();
  },
  cacheElements: function() {
    App.$doc = document;
    App.$gameArea = document.getElementById("gameArea");
    App.$hiddenArea = document.getElementById("hiddenArea");
    App.$templateIntroScreen = document.getElementById('intro-screen-template');
    App.$templateNewGame = document.getElementById('create-game-template');
    App.$templateJoinGame = document.getElementById('join-game-template');
    App.$waitingRoom = document.getElementById('waiting-room-template');
    App.$game = document.getElementById('game-template');
    App.$playerName = document.getElementById('player-name');
    App.$gameId = document.getElementById('game-id');
    App.$board = document.getElementById('board');
    App.$handTiles = document.getElementById('hand').getElementsByTagName('div');
    App.$actions = document.getElementById('actions');
  },
  showInitScreen: function() {
    App.switchView(App.$templateIntroScreen);
  },
  bindEvents: function () {
    // Host
    App.bindBtnEvent('btnCreateGame', App.Host.onCreateClick);
    App.bindBtnEvent('btnHostStart', App.Host.onStartClick);

    // Player
    App.bindBtnEvent('btnJoinGame', App.Player.onJoinClick);
    App.bindBtnEvent('btnStart', App.Player.onStartClick);

    App.bindBtnEvent('btnStartGame', App.onStartGameClick);
    
    // App.bindBtnEvent('btnPlayerRestart', App.Player.onPlayerRestart);
  },
  bindBtnEvent: function (id, fn) {
    App.$doc.getElementById(id).addEventListener('click', fn, false);
  },
  switchView: function(newView) {
    let children = App.$gameArea.getElementsByTagName('div');
    if (children && children.length > 0)
      App.$hiddenArea.appendChild(App.$gameArea.getElementsByTagName('div')[0]);
    App.$gameArea.appendChild(newView);
  },
  onStartGameClick: function() {
    socket.emit('startGame', App.gameId);
  },
  initBoard: function() {
    App.$board.innerHTML = "";
    for (let i=0; i<20; i++) {
      for (let j=0; j<20; j++) {
        App.$board.innerHTML += `<div class='tile' onclick='App.Player.clickBoard(${i},${j})'></div>`;
      }
    }
  },
  updateBoard: function() {
    App.initBoard();
    App.tiles.forEach((tile) => {
      let theCell = App.getCell(tile.x, tile.y);
      theCell.innerHTML = tile.shape;
      theCell.style.color = tile.color;
      if (tile.justPlaced)
        theCell.className = 'tile newTile';
    });
  },
  checkPossible: function() {
    let coords = [];
    App.clearPossible();
    // If it is the beginning, only allow the 4 middle tiles
    if (!App.tiles.length && !App.Player.playedTiles.length) {
      for (let i = 9; i < 11; i++) {
        for (let j = 9; j < 11; j++) {
          coords.push({
            x: i,
            y: j
          });
        }
      }
    // if the player hasn't placed any tile, check the full board
    } else if (!App.Player.playedTiles.length) {
      for (let i=0; i<20; i++) {
        for (let j=0; j<20; j++) {
          if (App.canBePlaced(i, j)){
            coords.push({
              x: i,
              y: j
            });
          }
        }
      }
    // if the player has played some tiles, only check the relevant row/column
    } else {
      let aList = App.availableSpots();
      for (let i = 0; i < aList.length; i++) {
        if (App.canBePlaced(aList[i].x, aList[i].y)) {
          coords.push({
            x: aList[i].x,
            y: aList[i].y
          });
        }
      }
    }

    for (let i = 0; i < coords.length; i++) {
      let theCell = App.getCell(coords[i].x, coords[i].y);
      theCell.className = 'tile possible';
    }
  },
  clearPossible: function() {
    for (const el of App.$board.children) {
      if (el.className != 'tile placed')
        el.className = 'tile';
    }
  },
  /**
   * Gets the HTML cell corresponding to the x/y coordinates
   * @param {number} x 
   * @param {number} y 
   * @returns HTML cell or null if out of board
   */
  getCell: function(x, y) {
    if (x < 0 || y < 0 || x > 19 || y > 19)
      return null;
    return App.$board.children[20 * x + y];
  },
  /**
   * Lists all possible empty cell based on tiles already placed by player
   * @returns {{x: number, y: number}[]} coords
   */
  availableSpots: function() {
    let result = [];

    if (App.Player.playedHorizontally()) {
      let r = App.rightFrom(App.Player.playedTiles[0].x, App.Player.playedTiles[0].y);
      let l = App.leftFrom(App.Player.playedTiles[0].x, App.Player.playedTiles[0].y);

      if (r != null) {
        result.push({
          x: r.x,
          y: r.y
        });
      }
      if (l != null) {
        result.push({
          x: l.x,
          y: l.y
        });
      }
    }
    if (App.Player.playedVertically()) {
      var t = App.topFrom(App.Player.playedTiles[0].x, App.Player.playedTiles[0].y);
      var b = App.bottomFrom(App.Player.playedTiles[0].x, App.Player.playedTiles[0].y);

      if (t != null) {
        result.push({
          x: t.x,
          y: t.y
        });
      }
      if (b != null) {
        result.push({
          x: b.x,
          y: b.y
        });
      }
    }

    return result;
  },
  /**
   * Tells if the selected tile can be placed on x/y coords
   * @param {number} x 
   * @param {number} y 
   * @returns {boolean} True/False
   */
  canBePlaced: function(x, y) {
    let result = false;
    let theCell = App.getCell(x, y);
    if (theCell.innerHTML == '') {
      if (App.checkNeighbour(x, y) && App.checkVertical(x, y) && App.checkHorizontal(x, y)) {
        result = true;
      }
    }

    return result;
  },
  /**
   * Returns the first free spot on the right of specified coords
   * @param {number} x 
   * @param {number} y 
   * @returns 
   */
  rightFrom: function(x, y) {
    for (let k = y + 1; k < 20; k++) {
      let theCell = App.getCell(x, k);
      if (theCell !== null && theCell.innerHTML == '') {
        return {
          x: x,
          y: k
        };
      }
    }
    return null;
  },
  /**
   * Returns the first free spot on the left of specified coords
   * @param {number} x 
   * @param {number} y 
   * @returns 
   */
  leftFrom: function(x, y) {
    for (let k = y - 1; k >= 0; k--) {
      let theCell = App.getCell(x, k);
      if (theCell !== null && theCell.innerHTML == '') {
        return {
          x: x,
          y: k
        };
      }
    }
    return null;
  },
  /**
   * Returns the first free spot above the specified coords
   * @param {number} x 
   * @param {number} y 
   * @returns 
   */
  topFrom: function(x, y) {
    for (let k = x - 1; k >= 0; k--) {
      let theCell = App.getCell(k, y);
      if (theCell !== null && theCell.innerHTML == '') {
        return {
          x: k,
          y: y
        };
      }
    }
    return null;
  },
  /**
   * Returns the first free spot below the specified coords
   * @param {number} x x coord
   * @param {number} y y coord
   * @returns {{x: number, y: number} | null}
   */
  bottomFrom: function(x, y) {
    for (let k = x + 1; k < 20; k++) {
      let theCell = App.getCell(k, y);
      if (theCell !== null && theCell.innerHTML == '') {
        return {
          x: k,
          y: y
        };
      }
    }
    return null;
  },
  /** Checks if there is a tile next to the cell */
  checkNeighbour: function(i, j) {
    return App.getCell(i-1, j)?.innerHTML?.length > 0 || App.getCell(i+1, j)?.innerHTML?.length > 0
      || App.getCell(i, j-1)?.innerHTML?.length > 0 || App.getCell(i, j+1)?.innerHTML?.length > 0;
  },
  /**
   * Checks vertically if selected tile can be placed
   * @param {number} i x coord
   * @param {number} j y coord
   * @returns {boolean} result
   */
  checkVertical: function(i, j) {
    let vList = [];
    let k;
    let curTile;

    for (k = i - 1; k >= 0; k--) {
      curTile = App.getCell(k, j);
      if (curTile != null && curTile.innerHTML != '') {
        vList.push({
          shape: curTile.innerHTML,
          color: curTile.style.color
        });
      } else {
        break;
      }
    }
    for (k = +i + 1; k < 20; k++) {
      curTile = App.getCell(k, j);
      if (curTile != null && curTile.innerHTML != '') {
        vList.push({
          shape: curTile.innerHTML,
          color: curTile.style.color
        });
      } else {
        break;
      }
    }
    vList.push({
      shape: App.Player.selectedTile.shape,
      color: App.Player.selectedTile.color
    });
    console.log(`CheckVert(${i},${j})`);
    console.log(vList);

    return App.checkList(vList);
  },
  /**
   * Checks horizontally if selected tile can be placed
   * @param {number} i x coord
   * @param {number} j y coord
   * @returns {boolean} result
   */
  checkHorizontal: function(i, j) {
    let hList = [];
    let l;
    let curTile;

    for (l = j - 1; l >= 0; l--) {
      curTile = App.getCell(i, l);
      if (curTile != null && curTile.innerHTML != '') {
        hList.push({
          shape: curTile.innerHTML,
          color: curTile.style.color
        });
      } else {
        break;
      }
    }
    for (l = +j + 1; l < 20; l++) {
      curTile = App.getCell(i, l);
      if (curTile != null && curTile.innerHTML != '') {
        hList.push({
          shape: curTile.innerHTML,
          color: curTile.style.color
        });
      } else {
        break;
      }
    }
    hList.push({
      shape: App.Player.selectedTile.shape,
      color: App.Player.selectedTile.color
    });

    return App.checkList(hList);
  },
  /**
   * Checks if all tiles in a list are compatible
   * @param {{color: string, shape: string}[]} tileList 
   * @returns True if all tiles are compatible, else false
   */
  checkList: function(tileList) {
    let isGood = true;

    for (let i = 0; isGood && i < tileList.length - 1; i++) {
      for (let j = +i + 1; isGood && j < tileList.length; j++) {
        if (!App.areCompatible(tileList[i], tileList[j])) {
          isGood = false;
        }
      }
    }

    return isGood;
  },
  /**
   * Checks if two tiles are compatible
   * @param {{color: string, shape: string}} tileA 
   * @param {{color: string, shape: string}} tileB 
   * @returns {boolean}
   */
  areCompatible: function(tileA, tileB) {
    let colorCheck = tileA.color == tileB.color;
    let shapeCheck = App.decodeHtml(tileA.shape) == App.decodeHtml(tileB.shape);

    return colorCheck != shapeCheck;
  },

  decodeHtml: function(html) {
    let txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  },

  Host: {
    players: [],
    isNewGame: false,
    
    onCreateClick: function() {
      socket.emit('hostCreateNewGame');
    },
    gameInit: function(data) {
      App.gameId = data.gameId;
      App.socketId = data.mySocketId;
      App.role = 'Host';
      App.Host.numPlayersInRoom = 0;

      App.Host.displayNewGameScreen();
    },
    displayNewGameScreen : function() {
      App.switchView(App.$templateNewGame);
      App.$doc.getElementById('spanNewGameCode').textContent = App.gameId;
    },
    onStartClick: function() {
      // collect data to send to the server
      let data = {
        gameId : App.gameId,
        playerName : App.$doc.getElementById('inputHostName').value || 'anon'
      };

      // Send the gameId and playerName to the server
      socket.emit('playerJoinGame', data);

      // Set the appropriate properties for the current player.
      App.role = 'Player';
      App.Player.myName = data.playerName;
      App.$playerName.innerHTML = `Pseudo: ${data.playerName}`;
    }
  },

  Player: {
    myName: '',
    canPlay: false,
    isChangingTiles: false,
    tiles: [],
    tilesToChange: [],
    playedTiles: [],
    selectedTile: null,
    onJoinClick: function() {
      App.switchView(App.$templateJoinGame);
    },
    /**
     * The player entered their name and gameId (hopefully)
     * and clicked Start.
     */
    onStartClick: function() {
      // collect data to send to the server
      let data = {
        gameId : +(App.$doc.getElementById('inputGameId').value),
        playerName : App.$doc.getElementById('inputPlayerName').value || 'anon'
      };

      // Send the gameId and playerName to the server
      socket.emit('playerJoinGame', data);

      // Set the appropriate properties for the current player.
      App.role = 'Player';
      App.Player.myName = data.playerName;
      App.$playerName.innerHTML = `Pseudo: ${data.playerName}`;
    },
    onRoomJoined: function(gameId) {
      App.gameId = gameId;
      App.$gameId.innerHTML = `ID: ${gameId}`;
      App.switchView(App.$waitingRoom);
    },
    onPlayerList: function(playerList) {
      console.log(playerList);
      App.Host.players = playerList;
      let playerListEl = App.$doc.getElementById('playersWaiting');
      playerListEl.innerHTML = "";
      playerList.forEach(player => {
        playerListEl.innerHTML += `Le joueur ${player.name} a rejoint la partie<p/>`;
      });
    },
    gameStarted: function() {
      App.switchView(App.$game);
    },
    myHand: function(tiles) {
      App.Player.tiles = tiles;
      App.Player.isChangingTiles = false;
      App.Player.playedTiles = [];
      App.Player.selectedTile = null;
      App.Player.tilesToChange = [];
      
      for (let i=0; i<App.$handTiles.length; i++) {
        App.$handTiles[i].className = 'tile';
        if (tiles[i]) {
          App.$handTiles[i].style.color = tiles[i].color;
          App.$handTiles[i].innerHTML = tiles[i].shape;
        } else {
          App.$handTiles[i].style.color = "";
          App.$handTiles[i].innerHTML = "";
        }
      }
    },
    onCanPlay: function(socketId) {
      if (App.socketId === socketId) {
        App.Player.canPlay = true;
        App.$actions.style.display = "block";
      } else {
        App.Player.canPlay = false;
        App.$actions.style.display = "none";
      }
    },
    selectTile: function(j) {
      if (App.Player.canPlay && j < App.Player.tiles.length) {
        let clickedTile = App.Player.tiles[j];

        if (App.Player.isChangingTiles) {
          if (App.$handTiles[j].className != 'tile selected') {
            App.$handTiles[j].className = 'tile selected';
            App.Player.tilesToChange.push(clickedTile);
          } else {
            App.$handTiles[j].className = 'tile';
            for (let k = 0; k < App.Player.tilesToChange.length; k++) {
              if (App.Player.tilesToChange[k] == clickedTile) {
                App.Player.tilesToChange.splice(k, 1);
                break;
              }
            }
          }
        } else {
          if (App.$handTiles[j].className != 'tile placed') {
            for (let k = 0; k < App.$handTiles.length; k++) {
              if (App.$handTiles[k].className == 'tile selected') {
                App.$handTiles[k].className = 'tile';
                break;
              }
            }
            App.$handTiles[j].className = 'tile selected';
  
            App.Player.selectedTile = clickedTile;
  
            // TO DO : update possible actions

            App.checkPossible();
          }
        }
      }
    },
    clickBoard: function(i, j) {
      if (App.Player.canPlay) {
        console.log(`Clicked on board: ${i}/${j}`);
        let theCell = App.getCell(i, j);
  
        if (App.Player.selectedTile != null && theCell.className == 'tile possible') {
          App.Player.selectedTile.x = i;
          App.Player.selectedTile.y = j;
          App.Player.playedTiles.push(App.Player.selectedTile);
  
          theCell.innerHTML = App.Player.selectedTile.shape;
          theCell.style = 'color:' + App.Player.selectedTile.color;
          theCell.className = 'tile placed';
          App.clearPossible();
  
          for (let k = 0; k < App.$handTiles.length; k++) {
            if (App.$handTiles[k].className == 'tile selected') {
              App.$handTiles[k].className = 'tile placed';
              break;
            }
          }
  
          App.Player.selectedTile = null;
  
          // if (PLAYED_TILES.length > 0) {
          //   document.getElementById('apply').innerHTML = 'Jouer';
          //   document.getElementById('change').style = 'display:none';
          //   document.getElementById('cancel').style = 'display:inline-block';
          // }
        }
      }
    },
    applyMove: function() {
      if (App.Player.canPlay) {
        socket.emit('applyMove', App.Player.playedTiles);
      }
    },
    changeTiles: function() {
      if (App.Player.canPlay) {
        if (!App.Player.isChangingTiles) {
          App.Player.isChangingTiles = true;
        } else {
          socket.emit('changeTiles', App.Player.tilesToChange);
        }
      }
    },
    cancelMove: function() {
      if (App.Player.canPlay) {
        while (App.Player.playedTiles.length) {
          let value = App.Player.playedTiles.pop();
          let theCell = App.getCell(value.x, value.y);
          theCell.innerHTML = '';
          theCell.style = '';
          theCell.className = 'tile';
        }
  
        App.Player.isChangingTiles = false;
        App.Player.tilesToChange = [];
        App.Player.selectedTile = null;
  
        for (let i=0; i<App.$handTiles.length; i++) {
          App.$handTiles[i].className = 'tile';
        }
      }
    },
    shiftUp: function() {

    },
    shiftDown: function() {

    },
    shiftLeft: function() {

    },
    shiftRight: function() {

    },
    playedHorizontally: function() {
      return App.Player.playedTiles.length === 1 ||
        (App.Player.playedTiles.length > 1 &&
         App.Player.playedTiles[0].x === App.Player.playedTiles[1].x);
    },
    playedVertically: function() {
      return App.Player.playedTiles.length === 1 ||
        (App.Player.playedTiles.length > 1 &&
         App.Player.playedTiles[0].y === App.Player.playedTiles[1].y);
    }
  }
}
