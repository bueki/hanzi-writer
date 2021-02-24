import I18nCode from 'models/Mode';

import Character from './models/Character';
import Stroke from './models/Stroke';
import { CharacterJson } from './typings/types';

function generateStrokes({ radStrokes, strokes, medians }: CharacterJson) {
  const isInRadical = (strokeNum: number) => (radStrokes ? radStrokes.indexOf(strokeNum) : -1) >= 0;
  return strokes.map((path, index) => {
    const points = medians[index].map((pointData) => {
      const [x, y] = pointData;
      return { x, y };
    });
    return new Stroke(path, points, index, isInRadical(index));
  });
}

export default function parseCharData(mode: string, symbol: string, charJson: CharacterJson) {
  const strokes = generateStrokes(charJson);
  return new Character(mode, symbol, strokes);
}
