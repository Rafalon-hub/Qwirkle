import { Tile } from "./tile";

export class Bag {
  private tiles: Tile[];

  /**
   * Initializes a bag with 3 Tiles of each color/shape
   * @param colors List of all possible colors
   * @param shapes List of all possible shapes
   */
  constructor(colors: string[], shapes: string[]) {
    this.tiles = [];
    for (let i = 0; i < 3; i++) {
      colors.forEach(c => {
        shapes.forEach(s => {
          this.tiles.push(new Tile(c, s));
        })
      })
    }
    this.shuffle();
  }

  /**
   * Picks up to nb Tiles from the bag
   * @param nb Number of requested Tiles
   * @returns Up to nb Tiles
   */
  public draw(nb: number): Tile[] {
    return nb < this.tiles.length
      ? this.tiles.splice(0, nb)
      : this.tiles.splice(0, this.tiles.length);
  }

  public addTiles(tiles: Tile[]) {
    tiles.forEach((tile: Tile) => this.tiles.push(tile));
  }

  public tilesLeft(): number {
    return this.tiles.length;
  }

  public shuffle() {
    let currentIndex: number = this.tiles.length
    let temporaryValue: Tile, randomIndex: number;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = this.tiles[currentIndex];
      this.tiles[currentIndex] = this.tiles[randomIndex];
      this.tiles[randomIndex] = temporaryValue;
    }
  }
}
