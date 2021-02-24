import Stroke from './Stroke';

export default class Character {
  mode: string;
  symbol: string;
  strokes: Stroke[];

  constructor(mode: string, symbol: string, strokes: Stroke[]) {
    this.mode = mode;
    this.symbol = symbol;
    this.strokes = strokes;
  }
}
