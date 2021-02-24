import { terser } from 'rollup-plugin-terser';
import ts from '@wessberg/rollup-plugin-ts';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import pkg from './package.json';
import license from 'rollup-plugin-license';
import filesize from 'rollup-plugin-filesize';

const extensions = ['.js', '.ts'];

export default [
  {
    input: 'src/HanziWriter.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'auto',
      },
      {
        file: 'dist/hanzi-writer-cj.min.js',
        format: 'iife',
        name: 'HanziWriter',
        sourcemap: true,
        plugins: [terser()],
        exports: 'default',
      },
      {
        file: 'dist/hanzi-writer-cj.js',
        format: 'iife',
        name: 'HanziWriter',
        exports: 'default',
      },
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true,
        exports: 'default',
      },
    ],
    plugins: [
      filesize(),
      ts({
        transpiler: 'babel',
      }),
      resolve({ extensions }),
      babel({
        exclude: 'node_modules/**',
        extensions,
        babelHelpers: 'bundled',
      }),
      license({
        banner: `Hanzi Writer CJ v<%= pkg.version %> | https://github.com/bueki/hanzi-writer/tree/feature/animCJK`,
      }),
    ],
  },
];
