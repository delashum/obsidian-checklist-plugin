import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import svelte from 'rollup-plugin-svelte'
import autoPreprocess from 'svelte-preprocess'

export default {
  input: "src/main.ts",
  output: {
    file: "main.js",
    format: "cjs",
    exports: "default",
  },
  external: ["obsidian"],
  plugins: [
    svelte({ emitCss: false, preprocess: autoPreprocess() }),
    nodeResolve({ browser: true }),
    typescript(),
    commonjs(),
    json(),
  ],
}
