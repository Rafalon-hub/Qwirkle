import { Player } from "./models/player";
import { QwirkleGame } from "./models/qwirkleGame";
import { Tile } from "./models/tile";

var gameRooms: { [roomId: number] : QwirkleGame; } = {};

export function initGame(io: any, socket: any) {
  let game: QwirkleGame;

  console.log(`Socket ${socket.id} connected at ${socket.conn.remoteAddress}`);
  socket.emit('connected', socket.id);

  socket.on('hostCreateNewGame', hostCreateNewGame);
  socket.on('playerJoinGame', playerJoinGame);
  socket.on('startGame', startGame);
  socket.on('applyMove', applyMove);
  socket.on('changeTiles', changeTiles);
  socket.on('shiftUp', shiftUp);
  socket.on('shiftDown', shiftDown);
  socket.on('shiftLeft', shiftLeft);
  socket.on('shiftRight', shiftRight);

  function hostCreateNewGame() {
    const thisGameId = (Math.random() * 100000) | 0;
    console.log(`Game ${thisGameId} created by socket ${socket.id}`);
    game = new QwirkleGame(thisGameId);
    gameRooms[thisGameId] = game;
    socket.emit('newGameCreated', { gameId: thisGameId, mySocketId: socket.id });
    socket.join(thisGameId);
  }

  /**
   * A player clicked the 'START GAME' button.
   * Attempt to connect them to the room that matches
   * the gameId entered by the player.
   * @param data Contains data entered via player's input - playerName and gameId.
   */
  function playerJoinGame(data: { playerName: string, gameId: number }) {
    console.log(`Player ${data.playerName} attempting to join game: ${data.gameId}`);

    game = gameRooms[data.gameId];
    game.addPlayer(socket.id, data.playerName);

    // Look up the room ID in the Socket.IO manager object.
    let room = io.sockets.adapter.rooms[data.gameId];

    // If the room exists...
    if (room != undefined) {
      // Join the room
      socket.join(data.gameId);
      socket.emit('roomJoined', data.gameId);

      // Emit an event notifying the clients that the player has joined the room.
      io.sockets.in(data.gameId).emit('playerList', game.players);
    } else {
      // Otherwise, send an error message back to the player.
      socket.emit('error', { message: "This room does not exist." });
    }
  }

  /**
   * Starts the game:
   * - gives 6 tiles to each player
   * - tells which player starts
   * @param gameId 
   */
  function startGame() {
    game.startGame();

    sendAll('gameStarted');

    // Send each player their hands
    game.players.forEach((p: Player) => io.sockets.sockets[p.id].emit('playerHand', p.tiles));
    sendNextPlayer();
  }

  function applyMove(tiles: Tile[]) {
    let qwirkles = game.applyMove(socket.id, tiles);
    sendBoard();
    let player = game.getPlayer(socket.id);
    if (player.tiles.length === 0) {
      player.addScore(6);
      sendAll('gameOver', game.scoreBoard());
    } else {
      socket.emit('playerHand', player.tiles);
      if (player.tiles.length < 6) {
        sendAll('message', 'NAPLOU!');
      } else if (qwirkles > 1) {
        sendAll('message', `Qwirkle x${qwirkles} !`);
      } else if (qwirkles === 1) {
        sendAll('message', `Qwirkle !`);
      }
      sendNextPlayer();
    }
  }

  function changeTiles(tiles: Tile[]) {
    game.changeTiles(socket.id, tiles);
    socket.emit('playerHand', game.getPlayer(socket.id).tiles);
    sendNextPlayer();
  }

  function shiftUp() {
    game.board.xStart++;
    sendBoard();
  }
  function shiftDown() {
    game.board.xStart--;
    sendBoard();
  }
  function shiftLeft() {
    game.board.yStart++;
    sendBoard();
  }
  function shiftRight() {
    game.board.yStart--;
    sendBoard();
  }

  function sendNextPlayer() {
    sendAll('canPlay', game.getNextPlayerId());
  }

  function sendBoard() {
    sendAll('board', {
      xStart: game.board.xStart,
      yStart: game.board.yStart,
      tiles: game.board.tiles
    });
  }

  /**
   * Send an event to all sockets in current room
   * @param evt Event to send
   * @param data Data to send
   */
  function sendAll(evt: string, data?: any) {
    io.sockets.in(game.gameId).emit(evt, data);
  }
}
