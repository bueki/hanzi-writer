import { getPathString } from '../../geometry';
import { ColorObject, Point } from '../../typings/types';
import SVGRenderTarget from './RenderTarget';
import * as svg from './svgUtils';

export type UserStrokeProps = {
  strokeWidth: number;
  strokeColor: ColorObject;
  opacity: number;
  points: Point[];
};

export default class UserStrokeRenderer {
  _oldProps: UserStrokeProps | undefined = undefined;
  _path: SVGElement | undefined;

  mount(target: SVGRenderTarget) {
    this._path = svg.createElm('path');
    target.svg.appendChild(this._path);
  }

  render(props: UserStrokeProps) {
    if (!this._path || props === this._oldProps) {
      return;
    }
    if (
      props.strokeColor !== (this._oldProps ? this._oldProps.strokeColor : undefined) ||
      props.strokeWidth !== (this._oldProps ? this._oldProps.strokeWidth : undefined)
    ) {
      const { r, g, b, a } = props.strokeColor;
      svg.attrs(this._path, {
        fill: 'none',
        stroke: `rgba(${r},${g},${b},${a})`,
        'stroke-width': props.strokeWidth.toString(),
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      });
    }
    if (props.opacity !== (this._oldProps ? this._oldProps.opacity : undefined)) {
      svg.attr(this._path, 'opacity', props.opacity.toString());
    }
    if (props.points !== (this._oldProps ? this._oldProps.points : undefined)) {
      svg.attr(this._path, 'd', getPathString(props.points));
    }
    this._oldProps = props;
  }

  destroy() {
    svg.removeElm(this._path);
  }
}
