import path from 'path';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';

// 定义包的配置信息
const packages = [
  {
    name: 'ui',
    input: 'src/index.tsx', // ui 库的入口
    external: ['react', 'react-dom', 'tailwindcss'], // 外部化 React 依赖
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
      tailwindcss: 'tailwindcss',
    },
    plugins: [
      postcss({
        extract: true, // 提取 CSS 到单独文件
        minimize: true, // 压缩 CSS
        sourceMap: true,
      }),
    ],
  },
  {
    name: 'utils',
    input: 'src/index.ts', // utils 库的入口（TS）
    external: [], // 根据实际依赖调整，如无外部依赖则留空
    globals: {},
  },
];

export default packages.map((pkg) => ({
  input: path.resolve(__dirname, `packages/${pkg.name}/src/index`), // 入口文件路径
  output: [
    {
      file: path.resolve(__dirname, `packages/${pkg.name}/dist/esm/index.js`),
      format: 'esm',
      sourcemap: true,
    },
    {
      file: path.resolve(__dirname, `packages/${pkg.name}/dist/cjs/index.js`),
      format: 'cjs',
      sourcemap: true,
    },
  ],
  external: pkg.external,
  globals: pkg.globals,
  plugins: [
    resolve({ browser: true }), // 解析浏览器环境的依赖
    commonjs(), // 转换 CJS 模块为 ESM
    typescript({
      tsconfig: path.resolve(__dirname, `packages/${pkg.name}/tsconfig.json`),
    }),
    pkg.plugins, // 注入包专属插件（如 postcss）
    terser(), // 压缩 JS（生产环境开启）
  ],
}));
