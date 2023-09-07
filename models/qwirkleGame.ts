import { Bag } from "./bag";
import { Board } from "./board";
import { Player } from "./player";
import { Tile } from "./tile";

export class QwirkleGame {
  static readonly COLORS: string[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  static readonly SHAPES: string[] = ['&#9635;', '&#9672;', '&#9673;', '&#9708;', '&#10022;', '&#10039;'];
  static readonly HAND_SIZE: number = 6;

  players: Player[] = [];
  bag: Bag;
  board: Board;
  gameStarted: boolean = false;
  gameId: number;
  playerTurn: number = 0;

  constructor(gameId: number) {
    this.bag = new Bag(QwirkleGame.COLORS, QwirkleGame.SHAPES);
    this.board = new Board();
    this.gameId = gameId;
  }

  /**
   * Adds a new player to the game
   * @param id Socket ID
   * @param name Player name
   */
  public addPlayer(id: string, name: string) {
    console.log(`Attempting to add player ${name}. Game started: ${this.gameStarted}`);
    if (!this.gameStarted) {
      this.players.push(new Player(id, name));
    }
  }

  public startGame() {
    if (!this.gameStarted) {
      this.gameStarted = true;
      this.players.forEach(p => {
        p.tiles = this.bag.draw(6);
        p.computeMaxScore();
      });
      this.players.sort((a: Player, b: Player) => {
        if (a.maxInitialScore < b.maxInitialScore) return 1;
        if (b.maxInitialScore < a.maxInitialScore) return -1;
        return a.id.localeCompare(b.id);
      });
    }
  }

  /**
   * Applies the move of a player:
   * - Puts the tiles on the board
   * - Computes the score for the move
   * - Fills the player's hand with new tiles
   * - Update players turn
   * @param id Player ID
   * @param tiles Tiles that should be put on the board
   */
  public applyMove(id: string, tiles: Tile[]): number {
    let result = this.board.addTiles(tiles);
    let player = this.getPlayer(id);

    console.log(`Player ${player.name} placed ${tiles.length} tiles for a score of ${result.score}`);
    if (result.qwirkles > 0) {
      console.log(`${result.qwirkles} qwirkles!`);
    }

    player.addScore(result.score);
    if (result.score > 0) {
      player.removeTiles(tiles);
      player.drawTiles(this.bag);
    }

    this.nextPlayer();

    return result.qwirkles;
  }

  /**
   * Let a player change some tiles
   * @param id Player ID
   * @param tiles Tiles to change
   */
  public changeTiles(id: string, tiles: Tile[]) {
    let player = this.getPlayer(id);
    player.addScore(0);

    this.bag.addTiles(tiles);
    player.removeTiles(tiles);
    player.drawTiles(this.bag);
    this.bag.shuffle();

    this.nextPlayer();
  }

  public getPlayer(id: string): Player {
    return this.players.find((player: Player) => player.id === id) ?? this.players[0];
  }

  public getNextPlayerId(): string {
    return this.players[this.playerTurn].id;
  }

  private nextPlayer() {
    this.playerTurn = (this.playerTurn + 1) % this.players.length;
  }

  public scoreBoard(): { name: string, score: number }[] {
    let scoreBoard = this.players.map((p) => {
      return {
        name: p.name,
        score: p.score
      }
    });
    scoreBoard.sort((a, b) => b.score - a.score);
    return scoreBoard;
  }
}
