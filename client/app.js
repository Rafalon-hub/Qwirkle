const socket = io();
socket.on('connected', onConnected);
socket.on('newGameCreated', onNewGameCreated);
socket.on('roomJoined', onRoomJoined);
socket.on('playerList', onPlayerList);
socket.on('gameStarted', onGameStarted);
socket.on('playerHand', onPlayerHand);
socket.on('canPlay', onPlayerCanPlay);
socket.on('board', onBoard);
socket.on('message', onMessage);

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
/**
 * Updates front-end board
 * @param {{
 *  xStart: number,
 *  yStart: number,
 *  tiles: {
 *    color: string,
 *    shape: string,
 *    x: number,
 *    y: number,
 *    justPlaced: boolean
 *  }[]
 * }} board 
 */
function onBoard(board) {
  App.xStart = board.xStart;
  App.yStart = board.yStart;
  App.xEnd = BoardSize+board.xStart;
  App.yEnd = BoardSize+board.yStart;
  App.tiles = board.tiles;
  App.updateBoard();
}
function onMessage(msg) {
  App.displayMessage(msg);
}

function gameOver(scoreBoard) {
  App.gameOver(scoreBoard);
}
function error() {
  
}

/** @type {number} */
const BoardSize = 20;

const App = {
  gameId: 0,
  role: '',
  socketId: '',
  currentRound: 0,
  /** @type {{
   *    color: string,
   *    shape: string,
   *    x: number,
   *    y: number,
   *    justPlaced: boolean
   *  }[]
   * } */
  tiles: [],
  xStart: 0,
  yStart: 0,
  xEnd: BoardSize,
  yEnd: BoardSize,
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
    App.$scoreBoard = document.getElementById('scoreboard-template');
    App.$scoreList = document.getElementById('score-list');
    App.$playerName = document.getElementById('player-name');
    App.$gameId = document.getElementById('game-id');
    App.$board = document.getElementById('board');
    App.$handTiles = document.getElementById('hand').getElementsByTagName('div');
    App.$actions = document.getElementById('actions');
    App.$actApply = document.getElementById('apply');
    App.$actChange = document.getElementById('change');
    App.$actCancel = document.getElementById('cancel');
    App.$shiftTiles = document.getElementById('shiftTiles');
    App.$message = document.getElementById('message');
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
    socket.emit('startGame');
  },
  initBoard: function() {
    App.$board.innerHTML = "";
    for (let x=this.xStart; x<this.xEnd; x++) {
      for (let y=this.yStart; y<this.yEnd; y++) {
        App.$board.innerHTML += `<div class='tile' onclick='App.Player.clickBoard(${x},${y})'></div>`;
      }
    }
  },
  updateBoard: function() {
    App.initBoard();
    App.tiles.forEach((tile) => {
      let theCell = App.getCell(tile.x, tile.y);
      if (theCell) {
        theCell.innerHTML = tile.shape;
        theCell.style.color = tile.color;
        if (tile.justPlaced)
          theCell.className = 'tile newTile';
      }
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
      for (let i=this.xStart; i<this.xEnd; i++) {
        for (let j=this.yStart; j<this.yEnd; j++) {
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
   * @param {number} x Absolute X coord
   * @param {number} y Absolute Y coord
   * @returns {HTMLElement | null} HTML cell or null if out of board
   */
  getCell: function(x, y) {
    if (x < this.xStart || y < this.yStart || x >= this.xEnd || y >= this.yEnd)
      return null;
    return this.$board.children[BoardSize * (x-this.xStart) + (y-this.yStart)];
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
   * @param {number} x Absolute X coord
   * @param {number} y Absolute Y coord
   * @returns First free spot {x/y} absolute coords
   */
  rightFrom: function(x, y) {
    for (let k = y + 1; k < this.yEnd; k++) {
      let theCell = this.getCell(x, k);
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
    for (let k = y - 1; k >= this.yStart; k--) {
      let theCell = this.getCell(x, k);
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
    for (let k = x - 1; k >= this.xStart; k--) {
      let theCell = this.getCell(k, y);
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
    for (let k = x + 1; k < this.xEnd; k++) {
      let theCell = this.getCell(k, y);
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
   * Checks if there is a tile next to the cell
   * @param {number} x Absolute X coord
   * @param {number} y Absolute Y coord
   * @returns {boolean} result
   */
  checkNeighbour: function(x, y) {
    return App.getCell(x-1, y)?.innerHTML?.length > 0 || App.getCell(x+1, y)?.innerHTML?.length > 0
      || App.getCell(x, y-1)?.innerHTML?.length > 0 || App.getCell(x, y+1)?.innerHTML?.length > 0;
  },
  /**
   * Checks vertically if selected tile can be placed
   * @param {number} x Absolute X coord
   * @param {number} y Absolute Y coord
   * @returns {boolean} result
   */
  checkVertical: function(x, y) {
    let vList = [];
    let k;
    let curTile;

    for (k = x - 1; k >= this.xStart; k--) {
      curTile = App.getCell(k, y);
      if (curTile != null && curTile.innerHTML != '') {
        vList.push({
          shape: curTile.innerHTML,
          color: curTile.style.color
        });
      } else {
        break;
      }
    }
    for (k = +x + 1; k < this.xEnd; k++) {
      curTile = App.getCell(k, y);
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
    console.log(`CheckVert(${x},${y})`);
    console.log(vList);

    return App.checkList(vList);
  },
  /**
   * Checks horizontally if selected tile can be placed
   * @param {number} x Absolute X coord
   * @param {number} y Absolute Y coord
   * @returns {boolean} result
   */
  checkHorizontal: function(x, y) {
    let hList = [];
    let l;
    let curTile;

    for (l = y - 1; l >= this.yStart; l--) {
      curTile = App.getCell(x, l);
      if (curTile != null && curTile.innerHTML != '') {
        hList.push({
          shape: curTile.innerHTML,
          color: curTile.style.color
        });
      } else {
        break;
      }
    }
    for (l = +y + 1; l < this.yEnd; l++) {
      curTile = this.getCell(x, l);
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
   * @returns {boolean} True if all tiles are compatible, else false
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
  displayMessage: function(msg) {
    App.$message.classList.remove('none');
    for (let i=0; i<msg.length; i++) {
      if (msg[i] === '\n')
        App.$message.innerHTML += '<br/>';
      else
        App.$message.innerHTML += `<span>${msg[i]}</span>`;
    }
    setTimeout(() => {
      App.$message.innerHTML = '';
      App.$message.classList.add('none')
    }, 5000);
  },
  decodeHtml: function(html) {
    let txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  },
  gameOver: function(scoreBoard) {
    this.$scoreList.innerHTML = '';
    for (let i=0; i<scoreBoard.length; i++) {
      this.$scoreList.innerHTML += `<tr><td>#${i+1}</td><td>${scoreBoard[i].name}</td><td>${scoreBoard[i].score}</td></tr>`;
    }
    this.switchView(this.$scoreBoard);
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

      this.displayNewGameScreen();
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
          App.$handTiles[i].style.display = "none";
          App.$handTiles[i].style.color = "";
          App.$handTiles[i].innerHTML = "";
        }
      }
    },
    onCanPlay: function(socketId) {
      App.Player.canPlay = App.socketId === socketId;
      this.updateActions();
    },
    selectTile: function(j) {
      if (this.canPlay && j < this.tiles.length) {
        let clickedTile = this.tiles[j];

        if (this.isChangingTiles) {
          if (App.$handTiles[j].className != 'tile selected') {
            App.$handTiles[j].className = 'tile selected';
            this.tilesToChange.push(clickedTile);
          } else {
            App.$handTiles[j].className = 'tile';
            for (let k = 0; k < this.tilesToChange.length; k++) {
              if (this.tilesToChange[k] == clickedTile) {
                this.tilesToChange.splice(k, 1);
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
  
            this.updateActions();

            App.checkPossible();
          }
        }
      }
    },
    /**
     * Performs action when player clicks on board
     * @param {number} x Absolute X coord
     * @param {number} y Absolute Y coord
     */
    clickBoard: function(x, y) {
      if (App.Player.canPlay) {
        console.log(`Clicked on board: ${x}/${y}`);
        let theCell = App.getCell(x, y);
  
        if (App.Player.selectedTile != null && theCell.className == 'tile possible') {
          App.Player.selectedTile.x = x;
          App.Player.selectedTile.y = y;
          App.Player.playedTiles.push(App.Player.selectedTile);
  
          theCell.innerHTML = App.Player.selectedTile.shape;
          theCell.style.color = App.Player.selectedTile.color;
          theCell.className = 'tile placed';
          App.clearPossible();
  
          for (let k = 0; k < App.$handTiles.length; k++) {
            if (App.$handTiles[k].className == 'tile selected') {
              App.$handTiles[k].className = 'tile placed';
              break;
            }
          }
  
          App.Player.selectedTile = null;
  
          this.updateActions();
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
          this.updateActions();
        } else {
          socket.emit('changeTiles', App.Player.tilesToChange);
        }
      }
    },
    cancelMove: function() {
      if (this.canPlay) {
        while (this.playedTiles.length) {
          let value = this.playedTiles.pop();
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

        App.clearPossible();
        this.updateActions();
      }
    },
    shiftUp: function() {
      socket.emit('shiftUp');
    },
    shiftDown: function() {
      socket.emit('shiftDown');
    },
    shiftLeft: function() {
      socket.emit('shiftLeft');
    },
    shiftRight: function() {
      socket.emit('shiftRight');
    },
    playedHorizontally: function() {
      return this.playedTiles.length === 1 ||
        (this.playedTiles.length > 1 &&
         this.playedTiles[0].x === this.playedTiles[1].x);
    },
    playedVertically: function() {
      return this.playedTiles.length === 1 ||
        (this.playedTiles.length > 1 &&
         this.playedTiles[0].y === this.playedTiles[1].y);
    },
    updateActions: function() {
      if (this.canPlay) {
        App.$actions.style.visibility = "visible";
        App.$shiftTiles.style.visibility = this.selectedTile !== null || this.playedTiles.length > 0 || this.isChangingTiles
          ? "hidden"
          : "visible";
        App.$actApply.innerHTML = this.playedTiles.length > 0 ? "Jouer" : "Passer";
        App.$actApply.style.visibility = this.isChangingTiles ? "hidden" : "inherit";
        App.$actChange.style.visibility = this.playedTiles.length > 0 ? "hidden" : "inherit";
        App.$actCancel.style.visibility = this.selectedTile !== null || this.playedTiles.length > 0 || this.isChangingTiles
          ? "inherit" : "hidden";
      } else {
        App.$actions.style.visibility = "hidden";
        App.$shiftTiles.style.visibility = "hidden";
      }
    }
  }
}
