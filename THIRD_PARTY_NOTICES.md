# Third-party notices

The motion engine, Stage runtime (`stage/runtime.mjs`), atom scripts, renderer, procedural SFX synthesizer, CLI and Skill documentation in this repository are released under the root MIT license. The core, Stage runtime and Canvas renderer use project code; the CLI uses Node.js built-ins.

The bundled physical 3D studio and precision CAD module `atoms/studio.mjs` (and optional developer example `assets/examples/assets/three-orbit.mjs`) bundles Three.js 0.180.0 under the MIT license. Its full copyright and permission notice is in [references/three-license.txt](references/three-license.txt). Three.js is used for original procedural geometry, physically based materials, studio lighting and post-processing, not a third-party animation template. The generated image `orbit-mark.png` is original project artwork.

`scripts/resources/OFL.txt` retains the original SIL Open Font License notice used by the standalone exporter for font assets. No font binaries are included. This notice and any user-supplied fonts keep their own terms; the repository MIT license does not relicense them.

esbuild, TypeScript and Node.js type definitions are development dependencies installed separately through npm, with their own licenses. Chromium-based browsers and FFmpeg are optional external tools discovered or installed on demand via `doctor` / `setup` and are not distributed in this repository. Referenced videos and user-supplied media are not covered by this license and are not included.
