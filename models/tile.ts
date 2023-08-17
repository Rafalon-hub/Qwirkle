export class Tile {
  /** The tile color */
  color: string;
  /** The tile shape */
  shape: string;

  /** Horizontal position */
  x?: number;
  /** Vertical position */
  y?: number;

  /** Tells if it has just been placed */
  justPlaced: boolean;

  constructor(color: string, shape: string) {
    this.color = color;
    this.shape = shape;
    this.x = undefined;
    this.y = undefined;
    this.justPlaced = false;
  }

  /**
   * Tells if a tile can be combined with another tile
   * @param other Other tile
   * @returns True/False
   */
  public canMatch(other: Tile): boolean {
    return (this.color === other.color) !== (this.shape === other.shape);
  }
}
