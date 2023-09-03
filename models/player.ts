import { Bag } from "./bag";
import { QwirkleGame } from "./qwirkleGame";
import { Tile } from "./tile";

export class Player {
  /** Player ID */
  id: string;
  /** Player name */
  name: string;
  /** Player total score */
  score: number = 0;
  /** Player score for each step */
  scores: number[] = [];
  /** Player tiles in hand */
  tiles: Tile[] = [];
  /** Player maximum initial score */
  maxInitialScore: number = -1;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public computeMaxScore(): void {
    if (this.maxInitialScore < 0) {
      let maxValue = 1;
      let colorCount = 1;
      let shapeCount = 1;
      let colorList: string[] = [];
      let shapeList: string[] = [];
  
      for (let i = 0; i < this.tiles.length; i++) {
        colorCount = 1;
        shapeCount = 1;
        colorList = [];
        shapeList = [];
        for (let j = 0; j < this.tiles.length; j++) {
          if (this.tiles[j].shape == this.tiles[i].shape && this.tiles[j].color != this.tiles[i].color) {
            if (colorList.length > 0) {
              let colorFound = false;
              for (let k = 0; k < colorList.length; k++) {
                if (this.tiles[j].color == colorList[k]) {
                  colorFound = true;
                }
              }
              if (!colorFound) {
                colorList.push(this.tiles[j].color);
                colorCount++;
              }
            } else {
              colorList.push(this.tiles[j].color);
              colorCount++;
            }
          }
        }
        if (colorCount > maxValue) {
          maxValue = colorCount;
        }
        for (let j = 0; j < this.tiles.length; j++) {
          if (this.tiles[j].color == this.tiles[i].color && this.tiles[j].shape != this.tiles[i].shape) {
            if (shapeList.length > 0) {
              let shapeFound = false;
              for (let k = 0; k < shapeList.length; k++) {
                if (this.tiles[j].shape == shapeList[k]) {
                  shapeFound = true;
                }
              }
              if (!shapeFound) {
                shapeList.push(this.tiles[j].shape);
                shapeCount++;
              }
            } else {
              shapeList.push(this.tiles[j].shape);
              shapeCount++;
            }
          }
        }
        if (shapeCount > maxValue) {
          maxValue = shapeCount;
        }
      }
      this.maxInitialScore = maxValue;
    }
  }

  public addScore(score: number): void {
    this.scores.push(score);
    this.score += score;
  }

  /**
   * Removes tiles from the player's hand
   * @param tiles Tiles to be removed
   */
  public removeTiles(tiles: Tile[]): void {
    for (let i = 0; i < tiles.length; i++) {
      let found = false;
      for (let j = 0; !found && j < this.tiles.length; j++) {
        if (this.tiles[j].shape == tiles[i].shape && this.tiles[j].color == tiles[i].color) {
          this.tiles.splice(j, 1);
          found = true;
        }
      }
    }
  }

  public drawTiles(bag: Bag): void {
    this.tiles = this.tiles.concat(bag.draw(QwirkleGame.HAND_SIZE - this.tiles.length));
  }
}
