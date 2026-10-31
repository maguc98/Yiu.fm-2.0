// 打包入口：用 export 暴露，由 esbuild 的 --global-name=TemperaRuntime 生成 window.TemperaRuntime。
// 不要在入口里再手动 `window.TemperaRuntime = {...}`：IIFE 外层的 `var TemperaRuntime = (...)()` 会在执行完后
// 用入口的 exports（空对象）把它覆盖掉。
export * from './createTemperaPixiRuntime';
export { compileTemperaProgram } from './temperaProgram';
export { DEFAULT_TEMPERA_TUNING } from './types';
