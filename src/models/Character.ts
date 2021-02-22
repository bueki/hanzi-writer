import Stroke from './Stroke';

export default class Character {
  i18n: string;
  symbol: string;
  strokes: Stroke[];

  constructor(i18n: string, symbol: string, strokes: Stroke[]) {
    this.i18n = i18n;
    this.symbol = symbol;
    this.strokes = strokes;
  }
}
