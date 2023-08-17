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
    var room = io.sockets.adapter.rooms[data.gameId];

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
  function startGame(gameId: number) {
    game.startGame();

    io.sockets.in(gameId).emit('gameStarted');

    // Send each player their hands
    game.players.forEach((p: Player) => io.sockets.sockets[p.id].emit('playerHand', p.tiles));
    io.sockets.in(gameId).emit('canPlay', game.players[0].id);
  }

  function applyMove(tiles: Tile[]) {
    game.applyMove(socket.id, tiles);
    io.sockets.in(game.gameId).emit('board', game.board.tiles);
    socket.emit('playerHand', game.getPlayer(socket.id).tiles);
    io.sockets.in(game.gameId).emit('canPlay', game.players[game.playerTurn].id);
  }

  function changeTiles(tiles: Tile[]) {
    game.changeTiles(socket.id, tiles);
    socket.emit('playerHand', game.getPlayer(socket.id).tiles);
    io.sockets.in(game.gameId).emit('canPlay', game.players[game.playerTurn].id);
  }
}
