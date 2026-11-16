# 独立渲染模块与 Three.js

需要场景尚未结构化的画面时，写一个独立 ESM 文件，声明为 module 资产；在 custom 节点暴露需要编辑的数值参数。不要把可执行字符串塞进 MotionSpec。图片、文字、曲线和普通分组优先使用结构化对象。

模块文件导出 `create`，返回自己的画布、逐帧绘制函数和释放函数：

```js
export async function create({ width, height, seed }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  return {
    canvas,
    async renderFrame({ frame, timeSeconds, fps, width, height, params, seed }) {
      canvas.width = Math.round(width); canvas.height = Math.round(height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#bce391';
      ctx.fillRect(params.x, 20, 40, 40);
    },
    destroy() { canvas.width = canvas.height = 0; }
  };
}
```

renderFrame 的 Promise 必须在指定帧可合成后完成；使用显式 frame/timeSeconds，不读取墙上时间、不用累加 delta 推演，也不另开 requestAnimationFrame。params 是当前帧从保存值和关键帧求出的只读快照。模块可使用 Canvas 2D 或 WebGL 画布；资源归模块拥有，并在 destroy 中释放。create 在资源准备阶段执行一次，每个 custom 对象一个实例。准备失败会清理已完成的实例；destroy 等待排队帧结束且只执行一次。

宿主 API：`await mountScene(canvas, spec, resolveAsset)`；然后 `await mounted.renderAt(frame, background)`，最后 `await mounted.destroy()`。renderAt 串行处理请求，失败传给调用方，不会把旧画面当成新帧成功返回。`renderLoopAt` 是预览循环接口。旧同步 renderFrame/renderLoop 保留给不含 custom 且没有异步帧在排队的场景；自定义模块必须走 await 接口。直接 drawFrame 不负责加载图片或执行模块。

内嵌导出用 Blob URL 加载已校验的 ESM。模块及依赖要提前打包成一个无外部导入的文件；它运行在页面权限内，**不是不可信代码沙箱**。静态检查及哈希不等于代码安全审查。不要把任意网上脚本作为模块直接执行。已有宿主可以通过 mountScene 的 `loadModule(asset, bytes)` 注入自己管理的模块注册表。

## 已运行的 Three.js 接入示例

`assets/examples/three-orbit.scene.json` 把独立的 Three.js 画面与二维文字、曲线、分组放在同一时间轴上。`params.turn` 控制绝对旋转角，`params.cameraDistance` 控制相机距离，`params.tilt` 控制倾角。预览和 PNG/MP4 使用同一个逐帧接口。

示例源文件在开发仓库的 `maintainer/modules/three-orbit.mjs`，构建为 `assets/examples/assets/three-orbit.mjs`，已经打包官方 Three.js 0.187.0；安装包用户不需要 npm install。它用自建几何、材质、灯光和透视相机，等待 shader 编译，显式设置颜色空间，并释放几何、材质与 WebGL 上下文。库按 [MIT 许可证](three-license.txt) 分发；设计没有取用竞品代码或模板。

```sh
node scripts/motion.mjs preview assets/examples/three-orbit.scene.json --out work/orbit.html
node scripts/motion.mjs render assets/examples/three-orbit.scene.json --out work/orbit.mp4
```

当前是**模块方式的 Three.js 接入**，不是完整原生三维编辑器。JSON 暴露的是模块参数，尚未提供 glTF 资产、可单独编辑的三维节点、骨骼动画或材质检查器。用户问到这些能力时明确说明边界，再按任务扩写模块或继续实现原生三维后端。重复帧测试只证明本机同浏览器/GPU 的结果，不保证不同 GPU 逐像素相同。

官方依据：[WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)、[资源释放](https://threejs.org/manual/en/cleanup.html)。
