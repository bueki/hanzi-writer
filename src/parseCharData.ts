import I18nCode from 'models/I18nCode';

import Character from './models/Character';
import Stroke from './models/Stroke';
import { CharacterJson } from './typings/types';

function generateStrokes({ radStrokes, strokes, medians }: CharacterJson) {
  const isInRadical = (strokeNum: number) => (radStrokes?.indexOf(strokeNum) ?? -1) >= 0;
  return strokes.map((path, index) => {
    const points = medians[index].map((pointData) => {
      const [x, y] = pointData;
      return { x, y };
    });
    return new Stroke(path, points, index, isInRadical(index));
  });
}

export default function parseCharData(i18n: string, symbol: string, charJson: CharacterJson) {
  const strokes = generateStrokes(charJson);
  return new Character(i18n, symbol, strokes);
}
