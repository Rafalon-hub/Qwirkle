import { Tile } from "./tile";

export class Board {
  tiles: Tile[] = [];

  /**
   * Adds a set of tiles to the board, and returns the move score
   * @param tiles Tiles to be added
   * @returns Score for the move
   */
  public addTiles(tiles: Tile[]): number {
    let score = 0;

    this.tiles.forEach((tile: Tile) => tile.justPlaced = false);
    tiles.forEach((tile: Tile) => tile.justPlaced = true);

    score = tiles.length;

    if (score > 0) {
      this.tiles = this.tiles.concat(tiles);
    }
    return score;
  }

  private horizontalScore(tile: Tile): number {
    let hT = this.tiles
      .filter(t => t.y === tile.y)
      .sort((a: Tile, b: Tile) => this.compareCoords(a.x, b.x));

    return 0;
  }

  private compareCoords(a?: number, b?: number) {
    let aa = a !== undefined ? a : 0;
    let bb = b !== undefined ? b : 0;
    return bb - aa;
  }
}
