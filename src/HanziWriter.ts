import Mode from 'models/Mode';

import * as characterActions from './characterActions';
import defaultOptions from './defaultOptions';
import LoadingManager from './LoadingManager';
import Character from './models/Character';
import { GenericMutation } from './Mutation';
import parseCharData from './parseCharData';
import Positioner from './Positioner';
import Quiz from './Quiz';
import canvasRenderer from './renderers/canvas';
import HanziWriterRendererBase, {
    HanziWriterRendererConstructor
} from './renderers/HanziWriterRendererBase';
import RenderTargetBase from './renderers/RenderTargetBase';
import svgRenderer from './renderers/svg';
import RenderState from './RenderState';
// Typings
import {
    ColorOptions, HanziWriterOptions, LoadingManagerOptions, OnCompleteFunction,
    ParsedHanziWriterOptions, QuizOptions, RenderTargetInitFunction
} from './typings/types';
import { colorStringToVals, trim } from './utils';

// Export type interfaces
export * from './typings/types';

export default class HanziWriter {
  _options: ParsedHanziWriterOptions;
  _loadingManager: LoadingManager;
  /** Only set when calling .setCharacter() */
  _char: string | undefined;
  /** Only set when calling .setCharacter() */
  _renderState: RenderState | undefined;
  /** Only set when calling .setCharacter() */
  _character: Character | undefined;
  /** Only set when calling .setCharacter() */
  _positioner: Positioner | undefined;
  /** Only set when calling .setCharacter() */
  _hanziWriterRenderer: HanziWriterRendererBase<HTMLElement, any> | null | undefined;
  /** Only set when calling .setCharacter() */
  _withDataPromise: Promise<void> | undefined;

  _quiz: Quiz | undefined;
  _renderer: {
    HanziWriterRenderer: HanziWriterRendererConstructor;
    createRenderTarget: RenderTargetInitFunction<any>;
  };

  target: RenderTargetBase;

  /** Main entry point */
  static create(
    element: string | HTMLElement,
    character: string,
    options?: Partial<HanziWriterOptions>,
  ) {
    const writer = new HanziWriter(element, options);
    writer.setCharacter(character);

    return writer;
  }

  /** Singleton instance of LoadingManager. Only set in `loadCharacterData` */
  static _loadingManager: LoadingManager | null = null;
  /** Singleton loading options. Only set in `loadCharacterData` */
  static _loadingOptions: Partial<HanziWriterOptions> | null = null;

  static loadCharacterData(
    character: string,
    options: Partial<LoadingManagerOptions> = {},
  ) {
    const loadingManager = (() => {
      const { _loadingManager, _loadingOptions } = HanziWriter;
      if (_loadingManager && _loadingManager._loadingChar === character && _loadingOptions === options) {
        return _loadingManager;
      }
      return new LoadingManager({ ...defaultOptions, ...options });
    })();

    HanziWriter._loadingManager = loadingManager;
    HanziWriter._loadingOptions = options;
    return loadingManager.loadCharData(character);
  }

  static getScalingTransform(
    width: number,
    height: number,
    padding = 0,
    mode: string = Mode.HANZI_WRITER_CJ,
  ) {
    const positioner = new Positioner({ mode, width, height, padding });
    switch (mode) {
      case Mode.HANZI_WRITER:
        return {
          x: positioner.xOffset,
          y: positioner.yOffset,
          scale: positioner.scale,
          transform: trim(`
        translate(${positioner.xOffset}, ${positioner.height - positioner.yOffset})
        scale(${positioner.scale}, ${-1 * positioner.scale})
      `).replace(/\s+/g, ' '),
        };
      default:
        return {
          x: positioner.xOffset,
          y: positioner.yOffset,
          scale: positioner.scale,
          transform: trim(`scale(${positioner.scale}, ${positioner.scale})`).replace(
            /\s+/g,
            ' ',
          ),
        };
    }
  }

  constructor(element: string | HTMLElement, options: Partial<HanziWriterOptions> = {}) {
    const { HanziWriterRenderer, createRenderTarget } =
      options.renderer === 'canvas' ? canvasRenderer : svgRenderer;
    const rendererOverride = options.rendererOverride || {};

    this._renderer = {
      HanziWriterRenderer: rendererOverride.HanziWriterRenderer || HanziWriterRenderer,
      createRenderTarget: rendererOverride.createRenderTarget || createRenderTarget,
    };
    // wechat miniprogram component needs direct access to the render target, so this is public
    this.target = this._renderer.createRenderTarget(
      element,
      options.width,
      options.height,
    );
    this._options = this._assignOptions(options);
    this._loadingManager = new LoadingManager(this._options);
    this._setupListeners();
  }

  showCharacter(
    options: {
      onComplete?: OnCompleteFunction;
      duration?: number;
    } = {},
  ) {
    this._options.showCharacter = true;
    return this._withData(() =>
      this._renderState && this._renderState
        .run(
          characterActions.showCharacter(
            'main',
            this._character!,
            typeof options.duration === 'number'
              ? options.duration
              : this._options.strokeFadeDuration,
          ),
        )
        .then((res) => {
          options.onComplete && options.onComplete(res);
          return res;
        }),
    );
  }

  hideCharacter(
    options: {
      onComplete?: OnCompleteFunction;
      duration?: number;
    } = {},
  ) {
    this._options.showCharacter = false;
    return this._withData(() =>
      this._renderState && this._renderState
        .run(
          characterActions.hideCharacter(
            'main',
            this._character!,
            typeof options.duration === 'number'
              ? options.duration
              : this._options.strokeFadeDuration,
          ),
        )
        .then((res) => {
          options.onComplete && options.onComplete(res);
          return res;
        }),
    );
  }

  animateCharacter(
    options: {
      onComplete?: OnCompleteFunction;
    } = {},
  ) {
    this.cancelQuiz();

    return this._withData(() =>
      this._renderState && this._renderState
        .run(
          characterActions.animateCharacter(
            'main',
            this._character!,
            this._options.strokeFadeDuration,
            this._options.strokeAnimationSpeed,
            this._options.delayBetweenStrokes,
          ),
        )
        .then((res) => {
          options.onComplete && options.onComplete(res);
          return res;
        }),
    );
  }

  animateStroke(
    strokeNum: number,
    options: {
      onComplete?: OnCompleteFunction;
    } = {},
  ) {
    this.cancelQuiz();
    return this._withData(() =>
      this._renderState && this._renderState
        .run(
          characterActions.animateSingleStroke(
            'main',
            this._character!,
            strokeNum,
            this._options.strokeAnimationSpeed,
          ),
        )
        .then((res) => {
          options.onComplete && options.onComplete(res);
          return res;
        }),
    );
  }

  highlightStroke(
    strokeNum: number,
    options: {
      onComplete?: OnCompleteFunction;
    } = {},
  ) {
    const promise = () => {
      if (!this._character || !this._renderState) {
        return;
      }

      return this._renderState
        .run(
          characterActions.highlightStroke(
            this._character.strokes[strokeNum],
            colorStringToVals(this._options.highlightColor),
            this._options.strokeHighlightSpeed,
          ),
        )
        .then((res) => {
          options.onComplete && options.onComplete(res);
          return res;
        });
    };

    return this._withData(promise);
  }

  async loopCharacterAnimation() {
    this.cancelQuiz();
    return this._withData(() =>
      this._renderState!.run(
        characterActions.animateCharacterLoop(
          'main',
          this._character!,
          this._options.strokeFadeDuration,
          this._options.strokeAnimationSpeed,
          this._options.delayBetweenStrokes,
          this._options.delayBetweenLoops,
        ),
        { loop: true },
      ),
    );
  }

  pauseAnimation() {
    return this._withData(() => this._renderState && this._renderState.pauseAll());
  }

  resumeAnimation() {
    return this._withData(() => this._renderState && this._renderState.resumeAll());
  }

  showOutline(
    options: {
      duration?: number;
      onComplete?: OnCompleteFunction;
    } = {},
  ) {
    this._options.showOutline = true;
    return this._withData(() =>
      this._renderState && this._renderState
        .run(
          characterActions.showCharacter(
            'outline',
            this._character!,
            typeof options.duration === 'number'
              ? options.duration
              : this._options.strokeFadeDuration,
          ),
        )
        .then((res) => {
          options.onComplete && options.onComplete(res);
          return res;
        }),
    );
  }

  hideOutline(
    options: {
      duration?: number;
      onComplete?: OnCompleteFunction;
    } = {},
  ) {
    this._options.showOutline = false;
    return this._withData(() =>
      this._renderState && this._renderState
        .run(
          characterActions.hideCharacter(
            'outline',
            this._character!,
            typeof options.duration === 'number'
              ? options.duration
              : this._options.strokeFadeDuration,
          ),
        )
        .then((res) => {
          options.onComplete && options.onComplete(res);
          return res;
        }),
    );
  }

  updateColor(
    colorName: keyof ColorOptions,
    colorVal: string | null,
    options: {
      duration?: number;
      onComplete?: OnCompleteFunction;
    } = {},
  ) {
    let mutations: GenericMutation[] = [];

    const fixedColorVal = (() => {
      // If we're removing radical color, tween it to the stroke color
      if (colorName === 'radicalColor' && !colorVal) {
        return this._options.strokeColor;
      }
      return colorVal;
    })();

    const mappedColor = colorStringToVals(fixedColorVal as string);

    this._options[colorName] = colorVal as any;

    const duration = options.duration ? options.duration : this._options.strokeFadeDuration;

    mutations = mutations.concat(
      characterActions.updateColor(colorName, mappedColor, duration),
    );

    // make sure to set radicalColor back to null after the transition finishes if val == null
    if (colorName === 'radicalColor' && !colorVal) {
      mutations = mutations.concat(characterActions.updateColor(colorName, null, 0));
    }

    return this._withData(() =>
      this._renderState && this._renderState.run(mutations).then((res) => {
        options.onComplete && options.onComplete(res);
        return res;
      }),
    );
  }

  quiz(quizOptions: Partial<QuizOptions> = {}) {
    return this._withData(async () => {
      if (this._character && this._renderState && this._positioner) {
        this.cancelQuiz();
        this._quiz = new Quiz(this._character, this._renderState, this._positioner);
        this._options = {
          ...this._options,
          ...quizOptions,
        };
        this._quiz.startQuiz(this._options);
      }
    });
  }

  cancelQuiz() {
    if (this._quiz) {
      this._quiz.cancel();
      this._quiz = undefined;
    }
  }

  setCharacter(char: string) {
    this.cancelQuiz();
    this._char = char;
    if (this._hanziWriterRenderer) {
      this._hanziWriterRenderer.destroy();
    }
    if (this._renderState) {
      this._renderState.cancelAll();
    }
    const mode = this._options.mode;
    this._hanziWriterRenderer = null;
    this._withDataPromise = this._loadingManager
      .loadCharData(char)
      .then((pathStrings) => {
        // if "pathStrings" isn't set, ".catch()"" was probably called and loading likely failed
        if (!pathStrings || this._loadingManager.loadingFailed) {
          return;
        }

        this._character = parseCharData(mode, char, pathStrings);
        const { width, height, padding } = this._options;
        this._positioner = new Positioner({ mode, width, height, padding });
        const hanziWriterRenderer = new this._renderer.HanziWriterRenderer(
          this._character,
          this._positioner,
        );
        this._hanziWriterRenderer = hanziWriterRenderer;
        this._renderState = new RenderState(this._character, this._options, (nextState) =>
          hanziWriterRenderer.render(nextState),
        );
        this._hanziWriterRenderer.mount(this.target);
        this._hanziWriterRenderer.render(this._renderState.state);
      });
    return this._withDataPromise;
  }

  _assignOptions(options: Partial<HanziWriterOptions>): ParsedHanziWriterOptions {
    const mergedOptions = {
      ...defaultOptions,
      ...options,
    };

    // backfill strokeAnimationSpeed if deprecated strokeAnimationDuration is provided instead
    if (options.strokeAnimationDuration && !options.strokeAnimationSpeed) {
      mergedOptions.strokeAnimationSpeed = 500 / options.strokeAnimationDuration;
    }
    if (options.strokeHighlightDuration && !options.strokeHighlightSpeed) {
      mergedOptions.strokeHighlightSpeed = 500 / mergedOptions.strokeHighlightDuration;
    }

    if (!options.highlightCompleteColor) {
      mergedOptions.highlightCompleteColor = mergedOptions.highlightColor;
    }

    return this._fillWidthAndHeight(mergedOptions);
  }

  /** returns a new options object with width and height filled in if missing */
  _fillWidthAndHeight(options: HanziWriterOptions): ParsedHanziWriterOptions {
    const filledOpts = { ...options };
    if (filledOpts.width && !filledOpts.height) {
      filledOpts.height = filledOpts.width;
    } else if (filledOpts.height && !filledOpts.width) {
      filledOpts.width = filledOpts.height;
    } else if (!filledOpts.width && !filledOpts.height) {
      const { width, height } = this.target.getBoundingClientRect();
      const minDim = Math.min(width, height);
      filledOpts.width = minDim;
      filledOpts.height = minDim;
    }
    return filledOpts as ParsedHanziWriterOptions;
  }

  _withData<T>(func: () => T) {
    // if this._loadingManager.loadingFailed, then loading failed before this method was called
    if (this._loadingManager.loadingFailed) {
      throw Error('Failed to load character data. Call setCharacter and try again.');
    }

    if (this._withDataPromise) {
      return this._withDataPromise.then(() => {
        if (!this._loadingManager.loadingFailed) {
          return func();
        }
      });
    }
    return Promise.resolve().then(func);
  }

  _setupListeners() {
    this.target.addPointerStartListener((evt) => {
      if (this._quiz) {
        evt.preventDefault();
        this._quiz.startUserStroke(evt.getPoint());
      }
    });
    this.target.addPointerMoveListener((evt) => {
      if (this._quiz) {
        evt.preventDefault();
        this._quiz.continueUserStroke(evt.getPoint());
      }
    });
    this.target.addPointerEndListener(() => {
      this._quiz && this._quiz.endUserStroke();
    });
  }
}