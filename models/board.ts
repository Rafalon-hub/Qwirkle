import { Tile } from "./tile";

export class Board {
  tiles: Tile[] = [];
  xStart: number = 0;
  yStart: number = 0;

  /**
   * Adds a set of tiles to the board, and returns the move score
   * @param tiles Tiles to be added
   * @returns Score for the move and number of "Qwirkle"
   */
  public addTiles(tiles: Tile[]): { score: number, qwirkles: number } {
    let totalScore = 0;
    let qwirkleNb = 0;

    this.tiles.forEach((tile: Tile) => tile.justPlaced = false);
    tiles.forEach((tile: Tile) => tile.justPlaced = true);
    this.tiles.push(...tiles);

    for (let i = 0; i < tiles.length; i++) {
      let scoreSuppl = 0;
      let scoreSuppl2 = 0;

      if (i == 0) {
        scoreSuppl = this.verticalScore(tiles[i]);
        scoreSuppl2 = this.horizontalScore(tiles[i]);
      } else if (tiles[i].x == tiles[i - 1].x) {
        scoreSuppl = this.verticalScore(tiles[i]);
      } else {
        scoreSuppl = this.horizontalScore(tiles[i]);
      }
      if (scoreSuppl > 0)
        totalScore += 1 + scoreSuppl;
      if (scoreSuppl2 > 0)
        totalScore += 1 + scoreSuppl2;
      if (scoreSuppl == 11)
        qwirkleNb++;
      if (scoreSuppl2 == 11)
        qwirkleNb++;
    }
    if (tiles.length > 0 && totalScore == 0) {
      totalScore = 1;
    }
    
    return { score: totalScore, qwirkles: qwirkleNb };
  }

  /**
   * Computes the horizontal score for a newly placed tile
   * @param tile Newly placed tile
   * @returns Horizontal score
   */
  private horizontalScore(tile: Tile): number {
    let hT = this.tiles
      .filter(t => t.x === tile.x)
      .sort((a: Tile, b: Tile) => this.compareCoords(a.y, b.y));

    let i = tile.x!;
    let j = tile.y!;
    let score = 0;
    for (let y = j - 1; y >= 0; y--) {
      if (!hT.some((t: Tile) => t.x === i && t.y === y)) {
        break;
      } else {
        score++;
      }
    }
    for (let y = j + 1; y < 20; y++) {
      if (!hT.some((t: Tile) => t.x === i && t.y === y)) {
        break;
      } else {
        score++;
      }
    }

    if (score == 5)
      score += 6;

    return score;
  }

  /**
   * Computes the vertical score for a newly placed tile
   * @param tile Newly placed tile
   * @returns Vertical score
   */
  private verticalScore(tile: Tile): number {
    let vT = this.tiles
      .filter(t => t.y === tile.y)
      .sort((a: Tile, b: Tile) => this.compareCoords(a.x, b.x));

    let i = tile.x!;
    let j = tile.y!;
    let score = 0;
    for (let x = i - 1; x >= 0; x--) {
      if (!vT.some((t: Tile) => t.x === x && t.y === j)) {
        break;
      } else {
        score++;
      }
    }
    for (let x = i + 1; x < 20; x++) {
      if (!vT.some((t: Tile) => t.x === x && t.y === j)) {
        break;
      } else {
        score++;
      }
    }

    if (score == 5)
      score += 6;

    return score;
  }

  private compareCoords(a?: number, b?: number) {
    let aa = a !== undefined ? a : 0;
    let bb = b !== undefined ? b : 0;
    return bb - aa;
  }
}
