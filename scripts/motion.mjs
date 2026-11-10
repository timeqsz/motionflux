#!/usr/bin/env node

// packages/cli/src/index.ts
import { readFile, writeFile as writeFile2, mkdir as mkdir2, mkdtemp as mkdtemp2, rm as rm3, stat } from "node:fs/promises";
import { tmpdir as tmpdir2 } from "node:os";
import { dirname as dirname2, resolve as resolve2, join as join3, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash as createHash2 } from "node:crypto";

// packages/catalog/src/index.ts
var CATALOG_VERSION = "0.4.0";
var families = {
  prop: { title: "\u5C5E\u6027", english: "Property", question: "\u53D8\u4EC0\u4E48", color: "#d4513f" },
  timing: { title: "\u8282\u594F", english: "Timing", question: "\u600E\u4E48\u53D8", color: "#c98a12" },
  loop: { title: "\u5FAA\u73AF", english: "Loop", question: "\u4E00\u76F4\u52A8", color: "#8f8f10" },
  choreo: { title: "\u7F16\u6392", english: "Choreo", question: "\u8C01\u5148\u8C01\u540E", color: "#2f8f5b" },
  transition: { title: "\u8F6C\u573A", english: "Transition", question: "\u51FA\u73B0\u6D88\u5931", color: "#1f8a8f" },
  text: { title: "\u6587\u5B57", english: "Text", question: "\u5B57\u7684\u52A8\u6CD5", color: "#3f6fc2" },
  feel: { title: "\u8D28\u611F", english: "Feel", question: "\u53E0\u5728\u4E0A\u9762", color: "#7a5bc7" },
  generate: { title: "\u751F\u6210", english: "Generate", question: "\u51ED\u7A7A\u4EA7\u751F", color: "#b4487f" }
};
var num = (title, minimum, maximum, value, unit) => ({ type: "number", title, minimum, maximum, default: value, unit });
var int = (title, minimum, maximum, value, unit) => ({ type: "number", title, minimum, maximum, default: value, unit, integer: true });
var pick = (title, options, labels, value) => ({ type: "string", title, enum: options, labels, default: value });
var color = (title, value) => ({ type: "color", title, default: value });
var mode = pick("\u65B9\u5411", ["in", "out"], ["\u51FA\u73B0", "\u6D88\u5931"], "in");
var any = ["text", "path"];
var text = ["text"];
var raster = "raster";
var ongoing = "ongoing";
var fixed = "static";
var definitions = [
  // 属性：变什么
  {
    id: "prop.move",
    symbol: "Mv",
    english: "Move",
    title: "\u4F4D\u79FB",
    role: "property",
    targets: any,
    writes: ["position"],
    description: "\u6CBF\u4E00\u4E2A\u65B9\u5411\u4ECE\u8D77\u59CB\u504F\u79FB\u79FB\u5230\u7ED3\u675F\u504F\u79FB\uFF1B\u65B9\u5411 0\xB0 \u5411\u53F3\u300190\xB0 \u5411\u4E0B\u3002",
    tags: ["\u4F4D\u79FB", "\u79FB\u52A8", "\u5165\u573A", "move", "translate"],
    params: { fromPx: num("\u8D77\u59CB\u504F\u79FB", -2e3, 2e3, -120, "px"), toPx: num("\u7ED3\u675F\u504F\u79FB", -2e3, 2e3, 120, "px"), angleDeg: num("\u79FB\u52A8\u65B9\u5411", -180, 180, 0, "deg") }
  },
  {
    id: "prop.rotate",
    symbol: "Rt",
    english: "Rotate",
    title: "\u65CB\u8F6C",
    role: "property",
    targets: any,
    writes: ["rotation"],
    description: "\u7ED5\u5BF9\u8C61\u539F\u70B9\u4ECE\u8D77\u59CB\u89D2\u8F6C\u5230\u7ED3\u675F\u89D2\uFF0C\u6B63\u89D2\u5EA6\u4E3A\u987A\u65F6\u9488\u3002",
    tags: ["\u65CB\u8F6C", "\u8F6C\u52A8", "rotate"],
    params: { fromDeg: num("\u8D77\u59CB\u89D2\u5EA6", -720, 720, 0, "deg"), toDeg: num("\u7ED3\u675F\u89D2\u5EA6", -720, 720, 180, "deg") }
  },
  {
    id: "prop.scale",
    symbol: "Sc",
    english: "Scale",
    title: "\u7F29\u653E",
    role: "property",
    targets: any,
    writes: ["scale"],
    description: "\u7ED5\u5BF9\u8C61\u539F\u70B9\u7B49\u6BD4\u7F29\u653E\u3002",
    tags: ["\u7F29\u653E", "\u653E\u5927", "\u7F29\u5C0F", "scale", "zoom"],
    params: { from: num("\u8D77\u59CB\u500D\u7387", 0, 8, 0.4, "ratio"), to: num("\u7ED3\u675F\u500D\u7387", 0, 8, 1.2, "ratio") }
  },
  {
    id: "prop.opacity",
    symbol: "Op",
    english: "Opacity",
    title: "\u900F\u660E",
    role: "property",
    targets: any,
    writes: ["opacity"],
    description: "\u6574\u4F53\u900F\u660E\u5EA6\u4ECE\u8D77\u59CB\u503C\u8FC7\u6E21\u5230\u7ED3\u675F\u503C\uFF0C\u7528\u6765\u663E\u73B0\u548C\u9690\u53BB\u3002",
    tags: ["\u900F\u660E\u5EA6", "\u6DE1\u5165", "\u6DE1\u51FA", "opacity", "fade"],
    params: { from: num("\u8D77\u59CB\u900F\u660E\u5EA6", 0, 1, 0, "ratio"), to: num("\u7ED3\u675F\u900F\u660E\u5EA6", 0, 1, 1, "ratio") }
  },
  {
    id: "prop.color",
    symbol: "Co",
    english: "Color",
    title: "\u989C\u8272",
    role: "property",
    targets: any,
    writes: ["color"],
    description: "\u989C\u8272\u4ECE\u8D77\u59CB\u8272\u8FC7\u6E21\u5230\u7ED3\u675F\u8272\uFF0C\u5728\u7EBF\u6027\u5149\u4E0B\u6DF7\u5408\uFF0C\u4E2D\u9014\u4E0D\u53D1\u7070\u3002",
    tags: ["\u989C\u8272", "\u53D8\u8272", "\u8272\u5F69", "color"],
    params: { from: color("\u8D77\u59CB\u989C\u8272", "#1d201d"), to: color("\u7ED3\u675F\u989C\u8272", "#d4513f") }
  },
  {
    id: "prop.blur",
    symbol: "Bu",
    english: "Blur",
    title: "\u6A21\u7CCA",
    role: "property",
    engine: raster,
    targets: any,
    writes: ["blur"],
    description: "\u9AD8\u65AF\u6A21\u7CCA\u534A\u5F84\u4ECE\u8D77\u59CB\u503C\u53D8\u5230\u7ED3\u675F\u503C\uFF0C\u4ECE\u865A\u5230\u5B9E\u6216\u4ECE\u5B9E\u5230\u865A\u3002",
    tags: ["\u6A21\u7CCA", "\u865A\u5316", "\u5BF9\u7126", "blur", "focus"],
    params: { fromPx: num("\u8D77\u59CB\u534A\u5F84", 0, 60, 16, "px"), toPx: num("\u7ED3\u675F\u534A\u5F84", 0, 60, 0, "px") }
  },
  {
    id: "prop.morph",
    symbol: "Mp",
    english: "Morph",
    title: "\u53D8\u5F62",
    role: "property",
    writes: ["geometry"],
    description: "\u8F6E\u5ED3\u6309\u5F27\u957F\u5BF9\u9F50\u540E\u9010\u70B9\u8FC7\u6E21\u5230\u76EE\u6807\u5F62\u72B6\uFF0C\u4E0D\u4F1A\u626D\u6210\u4E00\u56E2\u3002",
    tags: ["\u53D8\u5F62", "\u5F62\u53D8", "\u8FC7\u6E21", "morph", "shape"],
    params: { target: pick("\u76EE\u6807\u5F62\u72B6", ["circle", "triangle", "square", "star"], ["\u5706\u5F62", "\u4E09\u89D2\u5F62", "\u65B9\u5F62", "\u661F\u5F62"], "star"), amount: num("\u53D8\u5F62\u7A0B\u5EA6", 0, 1, 1, "ratio") }
  },
  {
    id: "prop.draw",
    symbol: "Dr",
    english: "Draw",
    title: "\u63CF\u7EBF",
    role: "property",
    writes: ["trim"],
    description: "\u6309\u771F\u5B9E\u5F27\u957F\u628A\u8DEF\u5F84\u4ECE\u8D77\u70B9\u753B\u5230\u7EC8\u70B9\uFF1B\u62D6\u5C3E\u5927\u4E8E 0 \u65F6\u53EA\u7559\u4E00\u6BB5\u5728\u8DEF\u5F84\u4E0A\u8DD1\u3002",
    tags: ["\u63CF\u7EBF", "\u63CF\u8FB9", "\u8DEF\u5F84", "\u624B\u5199", "draw", "trim", "stroke"],
    params: { from: num("\u8D77\u59CB\u6BD4\u4F8B", 0, 1, 0, "ratio"), to: num("\u7ED3\u675F\u6BD4\u4F8B", 0, 1, 1, "ratio"), trailRatio: num("\u62D6\u5C3E\u957F\u5EA6", 0, 1, 0, "ratio") }
  },
  {
    id: "prop.crop",
    symbol: "Cp",
    english: "Crop",
    title: "\u88C1\u5207",
    role: "property",
    targets: any,
    writes: ["mask"],
    description: "\u53EF\u89C1\u8303\u56F4\u4ECE\u4E00\u4FA7\u6216\u4E2D\u5FC3\u5411\u5916\u5C55\u5F00\uFF0C\u5BF9\u8C61\u672C\u8EAB\u4E0D\u52A8\u3002",
    tags: ["\u88C1\u5207", "\u906E\u7F69", "\u5C55\u5F00", "crop", "mask"],
    params: {
      from: num("\u8D77\u59CB\u53EF\u89C1", 0, 1, 0, "ratio"),
      to: num("\u7ED3\u675F\u53EF\u89C1", 0, 1, 1, "ratio"),
      origin: pick("\u5C55\u5F00\u8D77\u70B9", ["center", "left", "right", "top", "bottom"], ["\u4E2D\u5FC3", "\u5DE6\u4FA7", "\u53F3\u4FA7", "\u9876\u90E8", "\u5E95\u90E8"], "center")
    }
  },
  // 节奏：怎么变
  {
    id: "timing.ease",
    symbol: "Es",
    english: "Ease",
    title: "\u7F13\u52A8",
    role: "timing",
    time: fixed,
    targets: any,
    writes: ["curve"],
    description: "\u52A0\u901F\u3001\u51CF\u901F\u6216\u4E24\u5934\u6162\u4E2D\u95F4\u5FEB\u3002\u4F5C\u7528\u5728\u540C\u4E00\u5BF9\u8C61\u3001\u5728\u5B83\u8303\u56F4\u5185\u5F00\u59CB\u7684\u5C5E\u6027\u52A8\u753B\u4E0A\u3002",
    tags: ["\u7F13\u52A8", "\u52A0\u901F", "\u51CF\u901F", "ease", "easing"],
    params: { mode: pick("\u7C7B\u578B", ["in", "out", "inOut"], ["\u6E10\u5FEB", "\u6E10\u6162", "\u5148\u5FEB\u540E\u6162"], "out"), power: num("\u529B\u5EA6", 1, 6, 3, "number") }
  },
  {
    id: "timing.spring",
    symbol: "Sp",
    english: "Spring",
    title: "\u5F39\u7C27",
    role: "timing",
    time: fixed,
    targets: any,
    writes: ["curve"],
    description: "\u50CF\u6302\u5728\u5F39\u7C27\u4E0A\uFF0C\u51B2\u8FC7\u7EC8\u70B9\u540E\u6765\u56DE\u6643\u51E0\u4E0B\u518D\u505C\u7A33\uFF1B\u7247\u6BB5\u7ED3\u675F\u65F6\u6B63\u597D\u505C\u5728\u7EC8\u503C\u3002",
    tags: ["\u5F39\u7C27", "\u5F39\u6027", "\u6643\u52A8", "spring"],
    params: { oscillations: num("\u6643\u52A8\u6B21\u6570", 0.5, 8, 2.5, "cycle"), damping: num("\u963B\u5C3C", 0, 12, 4, "number") }
  },
  {
    id: "timing.bounce",
    symbol: "Bn",
    english: "Bounce",
    title: "\u56DE\u5F39",
    role: "timing",
    time: fixed,
    targets: any,
    writes: ["curve"],
    description: "\u50CF\u7403\u843D\u5730\uFF1A\u5230\u8FBE\u7EC8\u70B9\u540E\u53CD\u5F39\u51E0\u6B21\uFF0C\u6BCF\u6B21\u66F4\u4F4E\u3002",
    tags: ["\u56DE\u5F39", "\u5F39\u8DF3", "\u843D\u5730", "bounce"],
    params: { bounces: int("\u5F39\u8DF3\u6B21\u6570", 1, 6, 3, "count"), decay: num("\u8870\u51CF", 0.1, 0.8, 0.4, "ratio") }
  },
  {
    id: "timing.overshoot",
    symbol: "Ov",
    english: "Overshoot",
    title: "\u8FC7\u51B2",
    role: "timing",
    time: fixed,
    targets: any,
    writes: ["curve"],
    description: "\u51B2\u8FC7\u7EC8\u70B9\u4E00\u70B9\u518D\u6536\u56DE\u6765\uFF0C\u53EA\u56DE\u4E00\u6B21\u3002",
    tags: ["\u8FC7\u51B2", "\u56DE\u6536", "\u5F39\u51FA", "overshoot", "back"],
    params: { tension: num("\u8FC7\u51B2\u529B\u5EA6", 0, 6, 1.8, "number") }
  },
  {
    id: "timing.anticipate",
    symbol: "Ac",
    english: "Anticipate",
    title: "\u9884\u5907",
    role: "timing",
    time: fixed,
    targets: any,
    writes: ["curve"],
    description: "\u5148\u5F80\u53CD\u65B9\u5411\u9000\u4E00\u70B9\u84C4\u529B\uFF0C\u518D\u52A0\u901F\u51FA\u53D1\u3001\u51CF\u901F\u5230\u8FBE\u3002",
    tags: ["\u9884\u5907", "\u84C4\u529B", "\u53CD\u5411", "anticipate"],
    params: { amount: num("\u540E\u9000\u5E45\u5EA6", 0, 1, 0.3, "ratio") }
  },
  {
    id: "timing.steps",
    symbol: "St",
    english: "Steps",
    title: "\u6B65\u8FDB",
    role: "timing",
    time: fixed,
    targets: any,
    writes: ["curve"],
    description: "\u4E0D\u8FDE\u7EED\u5730\u53D8\u5316\uFF0C\u4E00\u683C\u4E00\u683C\u8DF3\u5230\u7EC8\u70B9\uFF0C\u50CF\u79D2\u9488\u6216\u9010\u5E27\u52A8\u753B\u3002",
    tags: ["\u6B65\u8FDB", "\u9010\u5E27", "\u8DF3\u683C", "steps"],
    params: { steps: int("\u683C\u6570", 2, 30, 6, "count") }
  },
  // 循环：一直动
  {
    id: "loop.breathe",
    symbol: "Pu",
    english: "Breathe",
    title: "\u547C\u5438",
    role: "loop",
    time: ongoing,
    targets: any,
    writes: ["scale"],
    description: "\u7F13\u6162\u5730\u653E\u5927\u7F29\u5C0F\uFF0C\u50CF\u5728\u547C\u5438\u3002",
    tags: ["\u547C\u5438", "\u8109\u52A8", "\u6DA8\u7F29", "breathe", "pulse"],
    params: { amount: num("\u6DA8\u7F29\u5E45\u5EA6", 0, 1, 0.12, "ratio"), periodS: num("\u5468\u671F", 0.2, 10, 2, "s") }
  },
  {
    id: "loop.swing",
    symbol: "Sw",
    english: "Swing",
    title: "\u6446\u52A8",
    role: "loop",
    time: ongoing,
    targets: any,
    writes: ["rotation", "position"],
    description: "\u89C4\u5F8B\u5730\u6765\u56DE\uFF1A\u7ED5\u539F\u70B9\u6446\u52A8\uFF0C\u6216\u6CBF\u6C34\u5E73\u3001\u7AD6\u76F4\u65B9\u5411\u5F80\u590D\u3002",
    tags: ["\u6446\u52A8", "\u949F\u6446", "\u5F80\u590D", "swing", "sine"],
    params: { axis: pick("\u6446\u52A8\u65B9\u5F0F", ["rotate", "x", "y"], ["\u7ED5\u539F\u70B9\u6446", "\u5DE6\u53F3", "\u4E0A\u4E0B"], "rotate"), amount: num("\u5E45\u5EA6\uFF08\u5EA6\u6216 px\uFF09", 0, 360, 24, "deg|px"), periodS: num("\u5468\u671F", 0.2, 10, 1.6, "s") }
  },
  {
    id: "loop.float",
    symbol: "Fl",
    english: "Float",
    title: "\u6F02\u6D6E",
    role: "loop",
    time: ongoing,
    targets: any,
    writes: ["position", "rotation"],
    description: "\u7528\u5E73\u6ED1\u566A\u58F0\u4E0D\u89C4\u5219\u5730\u6E38\u79FB\u548C\u5FAE\u5FAE\u8F6C\u52A8\uFF0C\u4E0D\u4F1A\u6709\u89C4\u5F8B\u7684\u91CD\u590D\u611F\u3002",
    tags: ["\u6F02\u6D6E", "\u6E38\u79FB", "\u566A\u58F0", "float", "wiggle", "noise"],
    params: { amplitudePx: num("\u6E38\u79FB\u5E45\u5EA6", 0, 300, 40, "px"), rotateDeg: num("\u8F6C\u52A8\u5E45\u5EA6", 0, 180, 10, "deg"), frequencyHz: num("\u53D8\u5316\u9891\u7387", 0, 6, 0.5, "Hz") }
  },
  {
    id: "loop.spin",
    symbol: "Sn",
    english: "Spin",
    title: "\u81EA\u8F6C",
    role: "loop",
    time: ongoing,
    targets: any,
    writes: ["rotation"],
    description: "\u5300\u901F\u6301\u7EED\u65CB\u8F6C\uFF0C\u8D1F\u503C\u9006\u65F6\u9488\u3002",
    tags: ["\u81EA\u8F6C", "\u65CB\u8F6C", "\u52A0\u8F7D", "spin", "loading"],
    params: { turnsPerSecond: num("\u8F6C\u901F", -4, 4, 0.25, "turn/s") }
  },
  {
    id: "loop.flicker",
    symbol: "Fk",
    english: "Flicker",
    title: "\u95EA\u70C1",
    role: "loop",
    time: ongoing,
    targets: any,
    writes: ["opacity"],
    description: "\u4EAE\u5EA6\u5728\u4EAE\u548C\u6697\u4E4B\u95F4\u968F\u673A\u8DF3\u53D8\uFF0C\u50CF\u63A5\u89E6\u4E0D\u826F\u7684\u706F\u3002",
    tags: ["\u95EA\u70C1", "\u9891\u95EA", "\u8DF3\u53D8", "flicker", "blink"],
    params: { rateHz: num("\u8DF3\u53D8\u9891\u7387", 0.5, 30, 10, "Hz"), low: num("\u6697\u65F6\u900F\u660E\u5EA6", 0, 1, 0.15, "ratio"), chance: num("\u53D8\u6697\u6982\u7387", 0, 1, 0.35, "ratio") }
  },
  {
    id: "loop.wave",
    symbol: "Wv",
    english: "Wave",
    title: "\u6CE2\u52A8",
    role: "loop",
    time: ongoing,
    targets: any,
    writes: ["position"],
    description: "\u4E00\u6392\u526F\u672C\u4F9D\u6B21\u4E0A\u4E0B\u8D77\u4F0F\uFF0C\u6CE2\u5CF0\u4ECE\u4E00\u7AEF\u4F20\u5230\u53E6\u4E00\u7AEF\uFF1B\u5355\u4E2A\u5BF9\u8C61\u5219\u53EA\u662F\u4E0A\u4E0B\u6D6E\u52A8\u3002",
    tags: ["\u6CE2\u52A8", "\u8D77\u4F0F", "\u6CE2\u6D6A", "wave"],
    params: { amplitudePx: num("\u8D77\u4F0F\u5E45\u5EA6", 0, 200, 24, "px"), periodS: num("\u5468\u671F", 0.2, 10, 1.4, "s"), phaseDeg: num("\u76F8\u90BB\u76F8\u4F4D\u5DEE", 0, 360, 45, "deg") }
  },
  // 编排：谁先谁后
  {
    id: "choreo.stagger",
    symbol: "Sg",
    english: "Stagger",
    title: "\u9519\u5F00",
    role: "order",
    time: fixed,
    targets: any,
    writes: ["delay"],
    description: "\u8BA9\u526F\u672C\u4E00\u4E2A\u63A5\u4E00\u4E2A\u5F00\u59CB\uFF0C\u6BCF\u4E2A\u6BD4\u524D\u4E00\u4E2A\u665A\u56FA\u5B9A\u5E27\u6570\u3002",
    tags: ["\u9519\u5F00", "\u4F9D\u6B21", "\u5EF6\u8FDF", "stagger", "delay"],
    params: { stepFrames: num("\u6BCF\u4E2A\u95F4\u9694", 0, 60, 5, "frame"), order: pick("\u987A\u5E8F", ["forward", "reverse", "center", "edges"], ["\u4ECE\u5934\u5230\u5C3E", "\u4ECE\u5C3E\u5230\u5934", "\u4ECE\u4E2D\u95F4\u5411\u4E24\u7AEF", "\u4ECE\u4E24\u7AEF\u5411\u4E2D\u95F4"], "forward") }
  },
  {
    id: "choreo.cascade",
    symbol: "Cs",
    english: "Cascade",
    title: "\u6269\u6563",
    role: "order",
    time: fixed,
    targets: any,
    writes: ["delay"],
    description: "\u79BB\u8D77\u70B9\u8D8A\u8FDC\u7684\u526F\u672C\u5F00\u59CB\u5F97\u8D8A\u665A\uFF0C\u52A8\u4F5C\u50CF\u6C34\u6CE2\u4E00\u6837\u4ECE\u4E00\u70B9\u4F20\u5F00\u3002",
    tags: ["\u6269\u6563", "\u4F20\u64AD", "\u6CE2\u53CA", "cascade", "ripple"],
    params: { framesPer100Px: num("\u6BCF 100px \u5EF6\u8FDF", 0, 60, 6, "frame"), originX: num("\u8D77\u70B9 X", -2e3, 2e3, 0, "px"), originY: num("\u8D77\u70B9 Y", -2e3, 2e3, 0, "px") }
  },
  {
    id: "choreo.follow",
    symbol: "Fo",
    english: "Follow",
    title: "\u8DDF\u968F",
    role: "layout",
    time: fixed,
    targets: any,
    writes: ["copies"],
    description: "\u590D\u5236\u51FA\u51E0\u4E2A\u8DDF\u968F\u8005\uFF0C\u6BCF\u4E2A\u6BD4\u524D\u4E00\u4E2A\u665A\u51E0\u5E27\u8D70\u540C\u6837\u7684\u8DEF\u7EBF\uFF0C\u8D8A\u5F80\u540E\u8D8A\u5C0F\u8D8A\u6DE1\u3002",
    tags: ["\u8DDF\u968F", "\u5C3E\u968F", "\u8FFD\u8D76", "follow", "delay"],
    params: { count: int("\u8DDF\u968F\u6570\u91CF", 1, 16, 5, "count"), lagFrames: num("\u6BCF\u4E2A\u843D\u540E", 0, 60, 5, "frame"), falloff: num("\u9010\u4E2A\u8870\u51CF", 0, 0.5, 0.12, "ratio") }
  },
  {
    id: "choreo.mirror",
    symbol: "Mi",
    english: "Mirror",
    title: "\u955C\u50CF",
    role: "layout",
    time: fixed,
    targets: any,
    writes: ["copies"],
    description: "\u5728\u5BF9\u79F0\u4F4D\u7F6E\u653E\u4E00\u4E2A\u955C\u50CF\u526F\u672C\uFF0C\u5B83\u7684\u52A8\u4F5C\u4E5F\u5DE6\u53F3\u6216\u4E0A\u4E0B\u76F8\u53CD\u3002",
    tags: ["\u955C\u50CF", "\u5BF9\u79F0", "\u7FFB\u8F6C", "mirror", "symmetry"],
    params: { axis: pick("\u5BF9\u79F0\u8F74", ["x", "y", "both"], ["\u5DE6\u53F3\u5BF9\u79F0", "\u4E0A\u4E0B\u5BF9\u79F0", "\u56DB\u5411\u5BF9\u79F0"], "x"), distancePx: num("\u4E24\u4FA7\u95F4\u8DDD", 0, 2e3, 200, "px") }
  },
  {
    id: "choreo.array",
    symbol: "Ar",
    english: "Array",
    title: "\u9635\u5217",
    role: "layout",
    time: fixed,
    targets: any,
    writes: ["copies"],
    description: "\u6CBF\u4E00\u6761\u76F4\u7EBF\u7B49\u8DDD\u590D\u5236\u6210\u4E00\u6392\uFF0C\u4EE5\u539F\u4F4D\u7F6E\u4E3A\u4E2D\u5FC3\u3002",
    tags: ["\u9635\u5217", "\u590D\u5236", "\u4E00\u6392", "array", "repeat"],
    params: { count: int("\u6570\u91CF", 1, 32, 5, "count"), gapPx: num("\u95F4\u8DDD", 0, 1e3, 80, "px"), angleDeg: num("\u6392\u5217\u65B9\u5411", -180, 180, 0, "deg") }
  },
  {
    id: "choreo.ring",
    symbol: "Rg",
    english: "Ring",
    title: "\u73AF\u5F62",
    role: "layout",
    time: fixed,
    targets: any,
    writes: ["copies"],
    description: "\u56F4\u7ED5\u539F\u4F4D\u7F6E\u590D\u5236\u6210\u4E00\u5708\uFF1B\u53EF\u4EE5\u8BA9\u6BCF\u4E2A\u526F\u672C\u671D\u5916\u3002",
    tags: ["\u73AF\u5F62", "\u5706\u5468", "\u4E00\u5708", "ring", "radial"],
    params: { count: int("\u6570\u91CF", 1, 48, 8, "count"), radiusPx: num("\u534A\u5F84", 0, 1e3, 120, "px"), orient: pick("\u671D\u5411", ["keep", "outward"], ["\u4FDD\u6301\u539F\u671D\u5411", "\u671D\u5916"], "outward") }
  },
  {
    id: "choreo.grid",
    symbol: "Gd",
    english: "Grid",
    title: "\u7F51\u683C",
    role: "layout",
    time: fixed,
    targets: any,
    writes: ["copies"],
    description: "\u590D\u5236\u6210\u884C\u5217\u6574\u9F50\u7684\u77E9\u9635\uFF0C\u4EE5\u539F\u4F4D\u7F6E\u4E3A\u4E2D\u5FC3\u3002",
    tags: ["\u7F51\u683C", "\u77E9\u9635", "\u5E73\u94FA", "grid", "tile"],
    params: { columns: int("\u5217\u6570", 1, 24, 6, "count"), rows: int("\u884C\u6570", 1, 24, 4, "count"), gapPx: num("\u95F4\u8DDD", 0, 1e3, 64, "px") }
  },
  {
    id: "choreo.random",
    symbol: "Rd",
    english: "Shuffle",
    title: "\u4E71\u5E8F",
    role: "order",
    time: fixed,
    targets: any,
    writes: ["delay"],
    description: "\u7ED9\u6BCF\u4E2A\u526F\u672C\u4E00\u4E2A\u56FA\u5B9A\u79CD\u5B50\u4E0B\u7684\u968F\u673A\u5EF6\u8FDF\uFF0C\u5148\u540E\u6CA1\u6709\u89C4\u5F8B\u3002",
    tags: ["\u4E71\u5E8F", "\u968F\u673A", "\u5148\u540E", "random", "shuffle"],
    params: { spreadFrames: num("\u6700\u5927\u5EF6\u8FDF", 0, 120, 24, "frame") }
  },
  // 转场：出现消失
  {
    id: "transition.wipe",
    symbol: "Wp",
    english: "Wipe",
    title: "\u64E6\u9664",
    role: "property",
    targets: any,
    writes: ["mask"],
    description: "\u4E00\u6761\u76F4\u8FB9\u626B\u8FC7\u5BF9\u8C61\uFF0C\u626B\u8FC7\u7684\u90E8\u5206\u51FA\u73B0\u6216\u6D88\u5931\u3002",
    tags: ["\u64E6\u9664", "\u5212\u5165", "\u906E\u7F69", "wipe"],
    params: { mode, angleDeg: num("\u626B\u52A8\u65B9\u5411", -180, 180, 0, "deg") }
  },
  {
    id: "transition.iris",
    symbol: "Ir",
    english: "Iris",
    title: "\u5706\u5F62\u5C55\u5F00",
    role: "property",
    targets: any,
    writes: ["mask"],
    description: "\u4ECE\u4E00\u70B9\u5F00\u59CB\u5706\u5F62\u5F20\u5F00\u6216\u6536\u62E2\u3002",
    tags: ["\u5706\u5F62", "\u5C55\u5F00", "\u5149\u5708", "iris", "circle"],
    params: { mode, centerX: num("\u5706\u5FC3 X\uFF08\u6BD4\u4F8B\uFF09", 0, 1, 0.5, "ratio"), centerY: num("\u5706\u5FC3 Y\uFF08\u6BD4\u4F8B\uFF09", 0, 1, 0.5, "ratio") }
  },
  {
    id: "transition.slices",
    symbol: "Sl",
    english: "Slices",
    title: "\u5206\u6761",
    role: "property",
    targets: any,
    writes: ["mask"],
    description: "\u5207\u6210\u51E0\u6761\uFF0C\u76F8\u90BB\u6761\u4ECE\u76F8\u53CD\u65B9\u5411\u9519\u4F4D\u6ED1\u5165\u6216\u6ED1\u51FA\u3002",
    tags: ["\u5206\u6761", "\u6761\u7247", "\u9519\u4F4D", "slices", "strips"],
    params: { mode, count: int("\u6761\u6570", 2, 24, 5, "count"), distancePx: num("\u6ED1\u52A8\u8DDD\u79BB", 0, 2e3, 160, "px"), staggerRatio: num("\u9519\u5F00\u6BD4\u4F8B", 0, 0.9, 0.35, "ratio") }
  },
  {
    id: "transition.blinds",
    symbol: "Bl",
    english: "Blinds",
    title: "\u767E\u53F6",
    role: "property",
    targets: any,
    writes: ["mask"],
    description: "\u50CF\u767E\u53F6\u7A97\uFF0C\u4E00\u7247\u7247\u540C\u65F6\u6253\u5F00\u6216\u5408\u4E0A\u3002",
    tags: ["\u767E\u53F6\u7A97", "\u53F6\u7247", "\u6761\u7EB9", "blinds"],
    params: { mode, count: int("\u53F6\u7247\u6570", 2, 40, 8, "count"), angleDeg: num("\u53F6\u7247\u65B9\u5411", -90, 90, 0, "deg") }
  },
  {
    id: "transition.flip",
    symbol: "Fp",
    english: "Flip",
    title: "\u7FFB\u8F6C",
    role: "property",
    targets: any,
    writes: ["stretch"],
    description: "\u50CF\u5361\u7247\u4E00\u6837\u7ED5\u7AD6\u8F74\u6216\u6A2A\u8F74\u7FFB\u8FC7\u6765\uFF0C\u4FA7\u9762\u671D\u524D\u65F6\u6700\u7A84\u3002",
    tags: ["\u7FFB\u8F6C", "\u7FFB\u9762", "\u5361\u7247", "flip", "card"],
    params: { mode, axis: pick("\u7FFB\u8F6C\u8F74", ["y", "x"], ["\u7ED5\u7AD6\u8F74", "\u7ED5\u6A2A\u8F74"], "y"), turns: num("\u7FFB\u8F6C\u5708\u6570", 0.25, 4, 0.25, "turn") }
  },
  {
    id: "transition.push",
    symbol: "Ps",
    english: "Push",
    title: "\u63A8\u5165",
    role: "property",
    targets: any,
    writes: ["mask"],
    description: "\u5185\u5BB9\u5728\u81EA\u5DF1\u7684\u8303\u56F4\u91CC\u6ED1\u8FDB\u6216\u6ED1\u51FA\uFF0C\u8303\u56F4\u5916\u4E0D\u53EF\u89C1\uFF1B\u4E24\u4E2A\u5BF9\u8C61\u4E00\u8FDB\u4E00\u51FA\u5C31\u662F\u63A8\u8D70\u3002",
    tags: ["\u63A8\u5165", "\u63A8\u51FA", "\u6ED1\u5165", "push", "slide"],
    params: { mode, angleDeg: num("\u63A8\u52A8\u65B9\u5411", -180, 180, 0, "deg") }
  },
  {
    id: "transition.dissolve",
    symbol: "Ds",
    english: "Dissolve",
    title: "\u6EB6\u89E3",
    role: "property",
    engine: raster,
    targets: any,
    writes: ["dissolve"],
    description: "\u4E00\u9897\u9897\u968F\u673A\u9897\u7C92\u9010\u6E10\u51FA\u73B0\u6216\u6D88\u5931\u3002",
    tags: ["\u6EB6\u89E3", "\u9897\u7C92", "\u6D88\u6563", "dissolve"],
    params: { mode, grainPx: num("\u9897\u7C92\u5927\u5C0F", 1, 40, 6, "px") }
  },
  // 文字：字的动法
  {
    id: "text.chars",
    symbol: "Ch",
    english: "Per Character",
    title: "\u9010\u5B57",
    role: "property",
    targets: text,
    writes: ["chars"],
    description: "\u6BCF\u4E2A\u5B57\u4F9D\u6B21\u5347\u8D77\u5E76\u663E\u73B0\uFF1B\u7247\u6BB5\u65F6\u957F\u5305\u542B\u9519\u5F00\u7684\u65F6\u95F4\u3002",
    tags: ["\u9010\u5B57", "\u6587\u5B57", "\u6807\u9898", "\u5165\u573A", "characters"],
    params: { stepFrames: num("\u6BCF\u5B57\u95F4\u9694", 0, 30, 3, "frame"), distancePx: num("\u5347\u8D77\u8DDD\u79BB", -300, 300, 36, "px") }
  },
  {
    id: "text.lines",
    symbol: "Ln",
    english: "Per Line",
    title: "\u9010\u884C",
    role: "property",
    targets: text,
    writes: ["lines"],
    description: "\u6309\u6362\u884C\u4E00\u884C\u4E00\u884C\u79FB\u52A8\u5E76\u6DE1\u5165\uFF1B\u7247\u6BB5\u65F6\u957F\u5305\u542B\u9519\u5F00\u7684\u65F6\u95F4\u3002",
    tags: ["\u9010\u884C", "\u6587\u5B57", "\u5B57\u5E55", "lines"],
    params: { stepFrames: int("\u6BCF\u884C\u95F4\u9694", 0, 120, 8, "frame"), distancePx: num("\u79FB\u52A8\u8DDD\u79BB", -300, 300, 40, "px") }
  },
  {
    id: "text.decode",
    symbol: "Dc",
    english: "Decode",
    title: "\u89E3\u7801",
    role: "property",
    targets: text,
    writes: ["text"],
    description: "\u5B57\u7B26\u5148\u968F\u673A\u4E71\u8DF3\uFF0C\u518D\u4ECE\u5DE6\u5230\u53F3\u4F9D\u6B21\u5B9A\u683C\u6210\u6B63\u6587\u3002",
    tags: ["\u89E3\u7801", "\u4E71\u7801", "\u9ED1\u5BA2", "decode", "scramble"],
    params: { rateHz: num("\u4E71\u8DF3\u9891\u7387", 1, 60, 20, "Hz"), charset: pick("\u4E71\u7801\u5B57\u7B26", ["own", "symbols", "binary"], ["\u7528\u6B63\u6587\u7684\u5B57", "\u7B26\u53F7", "0 \u548C 1"], "symbols") }
  },
  {
    id: "text.type",
    symbol: "Ty",
    english: "Typewriter",
    title: "\u6253\u5B57",
    role: "property",
    targets: text,
    writes: ["text"],
    description: "\u5B57\u4E00\u4E2A\u4E2A\u6253\u51FA\u6765\uFF0C\u5149\u6807\u8DDF\u5728\u540E\u9762\u95EA\u3002",
    tags: ["\u6253\u5B57", "\u6253\u5B57\u673A", "\u5149\u6807", "typewriter", "typing"],
    params: { cursor: pick("\u5149\u6807", ["bar", "block", "none"], ["\u7AD6\u7EBF", "\u65B9\u5757", "\u4E0D\u663E\u793A"], "bar"), blinkHz: num("\u5149\u6807\u95EA\u70C1", 0, 6, 2, "Hz") }
  },
  {
    id: "text.count",
    symbol: "Ct",
    english: "Count",
    title: "\u8BA1\u6570",
    role: "property",
    targets: text,
    writes: ["text"],
    description: "\u6570\u5B57\u4ECE\u8D77\u59CB\u503C\u6EDA\u5230\u76EE\u6807\u503C\uFF1B\u6587\u5B57\u4E2D\u7684 # \u4F1A\u88AB\u66FF\u6362\u6210\u6570\u5B57\u3002",
    tags: ["\u8BA1\u6570", "\u6570\u5B57", "\u6570\u636E", "count", "number"],
    params: {
      from: num("\u8D77\u59CB\u503C", -1e9, 1e9, 0, "number"),
      to: num("\u76EE\u6807\u503C", -1e9, 1e9, 2026, "number"),
      decimals: int("\u5C0F\u6570\u4F4D", 0, 4, 0, "count"),
      grouping: pick("\u5343\u5206\u4F4D", ["none", "comma"], ["\u4E0D\u5206\u7EC4", "\u9017\u53F7\u5206\u7EC4"], "none")
    }
  },
  {
    id: "text.tracking",
    symbol: "Tk",
    english: "Tracking",
    title: "\u5B57\u8DDD",
    role: "property",
    targets: text,
    writes: ["chars"],
    description: "\u5B57\u4E0E\u5B57\u7684\u95F4\u8DDD\u4ECE\u6563\u5F00\u6536\u62E2\u5230\u6B63\u5E38\uFF0C\u6216\u53CD\u8FC7\u6765\u3002",
    tags: ["\u5B57\u8DDD", "\u6563\u5F00", "\u6536\u62E2", "tracking", "letter spacing"],
    params: { fromPx: num("\u8D77\u59CB\u989D\u5916\u5B57\u8DDD", -100, 400, 60, "px"), toPx: num("\u7ED3\u675F\u989D\u5916\u5B57\u8DDD", -100, 400, 0, "px"), anchor: pick("\u5BF9\u9F50\u70B9", ["center", "left"], ["\u4E2D\u5FC3\u4E0D\u52A8", "\u5DE6\u4FA7\u4E0D\u52A8"], "center") }
  },
  // 质感：叠在上面
  {
    id: "feel.trail",
    symbol: "Tl",
    english: "Trail",
    title: "\u62D6\u5F71",
    role: "layout",
    time: fixed,
    targets: any,
    writes: ["copies"],
    description: "\u5728\u8EAB\u540E\u7559\u4E0B\u51E0\u4E2A\u521A\u521A\u7ECF\u8FC7\u4F4D\u7F6E\u7684\u6B8B\u5F71\uFF0C\u8D8A\u65E7\u8D8A\u6DE1\u3002",
    tags: ["\u62D6\u5F71", "\u6B8B\u5F71", "\u4F59\u50CF", "trail", "echo"],
    params: { count: int("\u6B8B\u5F71\u6570\u91CF", 1, 16, 6, "count"), gapFrames: num("\u6B8B\u5F71\u95F4\u9694", 0.25, 10, 1.5, "frame"), strength: num("\u6B8B\u5F71\u5F3A\u5EA6", 0, 1, 0.5, "ratio") }
  },
  {
    id: "feel.motion-blur",
    symbol: "Mb",
    english: "Motion Blur",
    title: "\u8FD0\u52A8\u6A21\u7CCA",
    role: "feel",
    engine: raster,
    time: fixed,
    targets: any,
    writes: ["blur"],
    description: "\u6309\u771F\u5B9E\u901F\u5EA6\u6CBF\u8FD0\u52A8\u65B9\u5411\u62C9\u865A\uFF0C\u5FEB\u7684\u65F6\u5019\u865A\u3001\u505C\u4E0B\u5C31\u6E05\u695A\u3002",
    tags: ["\u8FD0\u52A8\u6A21\u7CCA", "\u901F\u5EA6", "\u62D6\u5C3E", "motion blur"],
    params: { shutterDeg: num("\u5FEB\u95E8\u89D2\u5EA6", 0, 720, 180, "deg") }
  },
  {
    id: "feel.glow",
    symbol: "Gl",
    english: "Glow",
    title: "\u8F89\u5149",
    role: "feel",
    engine: raster,
    time: fixed,
    targets: any,
    writes: ["glow"],
    description: "\u628A\u5BF9\u8C61\u81EA\u8EAB\u6A21\u7CCA\u540E\u53E0\u56DE\u53BB\uFF0C\u5468\u56F4\u6CDB\u51FA\u540C\u8272\u7684\u5149\u3002",
    tags: ["\u8F89\u5149", "\u53D1\u5149", "\u9713\u8679", "glow", "neon"],
    params: { radiusPx: num("\u5149\u6655\u534A\u5F84", 0, 80, 14, "px"), strength: num("\u5F3A\u5EA6", 0, 4, 1.2, "ratio") }
  },
  {
    id: "feel.grain",
    symbol: "Gn",
    english: "Grain",
    title: "\u9897\u7C92",
    role: "feel",
    engine: raster,
    time: ongoing,
    targets: any,
    writes: ["grain"],
    description: "\u80F6\u7247\u4F3C\u7684\u968F\u673A\u9897\u7C92\uFF0C\u6309\u8BBE\u5B9A\u9891\u7387\u5237\u65B0\u3002",
    tags: ["\u9897\u7C92", "\u566A\u70B9", "\u80F6\u7247", "grain", "film"],
    params: { amount: num("\u5F3A\u5EA6", 0, 1, 0.55, "ratio"), sizePx: num("\u9897\u7C92\u5927\u5C0F", 1, 12, 2, "px"), rateHz: num("\u5237\u65B0\u9891\u7387", 1, 60, 12, "Hz") }
  },
  {
    id: "feel.glitch",
    symbol: "Gt",
    english: "Glitch",
    title: "\u6545\u969C",
    role: "feel",
    engine: raster,
    time: ongoing,
    targets: any,
    writes: ["glitch"],
    description: "\u968F\u673A\u51E0\u6761\u6A2A\u5E26\u7A81\u7136\u9519\u4F4D\u6495\u88C2\uFF0C\u518D\u8DF3\u56DE\u539F\u4F4D\u3002",
    tags: ["\u6545\u969C", "\u6495\u88C2", "\u9519\u4F4D", "glitch"],
    params: { offsetPx: num("\u6700\u5927\u9519\u4F4D", 0, 200, 28, "px"), bandPx: num("\u6A2A\u5E26\u9AD8\u5EA6", 2, 120, 14, "px"), chance: num("\u51FA\u73B0\u9891\u7387", 0, 1, 0.35, "ratio"), rateHz: num("\u5237\u65B0\u9891\u7387", 1, 30, 8, "Hz") }
  },
  {
    id: "feel.chroma",
    symbol: "Ca",
    english: "Chromatic",
    title: "\u8272\u6563",
    role: "feel",
    engine: raster,
    time: fixed,
    targets: any,
    writes: ["chroma"],
    description: "\u5728\u4E24\u4FA7\u9519\u5F00\u4E00\u7EA2\u4E00\u9752\u4E24\u5C42\uFF0C\u8FB9\u7F18\u51FA\u73B0\u5F69\u8272\u5206\u79BB\u3002",
    tags: ["\u8272\u6563", "RGB \u5206\u79BB", "\u8272\u5DEE", "chromatic aberration", "rgb split"],
    params: { offsetPx: num("\u5206\u79BB\u8DDD\u79BB", 0, 60, 6, "px"), angleDeg: num("\u5206\u79BB\u65B9\u5411", -180, 180, 0, "deg") }
  },
  // 生成：凭空产生
  {
    id: "gen.particles",
    symbol: "Pa",
    english: "Particles",
    title: "\u7C92\u5B50",
    role: "property",
    time: ongoing,
    writes: ["geometry"],
    description: "\u4ECE\u539F\u70B9\u6301\u7EED\u55B7\u51FA\u7C92\u5B50\uFF0C\u53D7\u91CD\u529B\u4E0B\u843D\u5E76\u9010\u6E10\u53D8\u5C0F\u6D88\u5931\uFF1B\u6BCF\u4E2A\u7C92\u5B50\u7684\u8F68\u8FF9\u90FD\u53EF\u76F4\u63A5\u6309\u65F6\u95F4\u6C42\u503C\u3002",
    tags: ["\u7C92\u5B50", "\u55B7\u53D1", "\u706B\u82B1", "particles", "emitter"],
    params: {
      count: int("\u540C\u65F6\u5728\u98DE", 1, 300, 48, "count"),
      speedPx: num("\u901F\u5EA6", 0, 2e3, 260, "px/s"),
      spreadDeg: num("\u6269\u6563\u89D2", 0, 360, 80, "deg"),
      gravityPx: num("\u91CD\u529B", -2e3, 4e3, 420, "px/s\xB2"),
      lifeFrames: int("\u5BFF\u547D", 2, 600, 40, "frame"),
      sizePx: num("\u5927\u5C0F", 0.5, 60, 7, "px")
    }
  },
  {
    id: "gen.shatter",
    symbol: "Sh",
    english: "Shatter",
    title: "\u788E\u88C2",
    role: "property",
    writes: ["geometry"],
    description: "\u628A\u8F6E\u5ED3\u5207\u6210\u4E09\u89D2\u788E\u7247\uFF0C\u4ECE\u4E2D\u5FC3\u5411\u5916\u4F9D\u6B21\u70B8\u5F00\u3001\u65CB\u8F6C\u3001\u4E0B\u843D\u5E76\u6DE1\u51FA\u3002",
    tags: ["\u788E\u88C2", "\u7206\u70B8", "\u788E\u7247", "shatter", "break"],
    params: {
      pieces: int("\u5207\u5206\u5BC6\u5EA6", 2, 16, 6, "count"),
      forcePx: num("\u98DE\u6563\u8DDD\u79BB", 0, 2e3, 180, "px"),
      spinDeg: num("\u788E\u7247\u65CB\u8F6C", 0, 1440, 240, "deg"),
      gravityPx: num("\u4E0B\u843D\u8DDD\u79BB", 0, 2e3, 120, "px"),
      delayRatio: num("\u7531\u5185\u5411\u5916\u5EF6\u8FDF", 0, 0.9, 0.3, "ratio")
    }
  },
  {
    id: "gen.ripple",
    symbol: "Rp",
    english: "Ripple",
    title: "\u6CE2\u7EB9",
    role: "property",
    time: ongoing,
    writes: ["geometry"],
    description: "\u5BF9\u8C61\u7684\u8F6E\u5ED3\u4E00\u5708\u5708\u5411\u5916\u653E\u5927\u5E76\u6DE1\u51FA\uFF0C\u50CF\u6C34\u9762\u8361\u5F00\u3002",
    tags: ["\u6CE2\u7EB9", "\u6D9F\u6F2A", "\u6269\u6563", "ripple", "pulse ring"],
    params: { rings: int("\u540C\u65F6\u5708\u6570", 1, 12, 3, "count"), growth: num("\u653E\u5927\u500D\u7387", 1, 12, 3.2, "ratio"), periodS: num("\u6BCF\u5708\u65F6\u957F", 0.2, 10, 1.8, "s") }
  },
  {
    id: "gen.trace",
    symbol: "Tr",
    english: "Trace",
    title: "\u8F68\u8FF9",
    role: "overlay",
    time: fixed,
    targets: any,
    writes: ["overlay"],
    description: "\u753B\u51FA\u5BF9\u8C61\uFF08\u548C\u6BCF\u4E2A\u526F\u672C\uFF09\u539F\u70B9\u521A\u521A\u8D70\u8FC7\u7684\u8DEF\u7EBF\uFF0C\u8D8A\u65E7\u8D8A\u6DE1\u3002",
    tags: ["\u8F68\u8FF9", "\u8DEF\u7EBF", "\u8FD0\u52A8\u8DEF\u5F84", "trace", "path"],
    params: { lengthFrames: num("\u8F68\u8FF9\u957F\u5EA6", 1, 240, 30, "frame"), widthPx: num("\u7EBF\u5BBD", 0.5, 40, 3, "px") }
  },
  {
    id: "gen.link",
    symbol: "Lk",
    english: "Link",
    title: "\u8FDE\u7EBF",
    role: "overlay",
    time: fixed,
    targets: any,
    writes: ["overlay"],
    description: "\u7528\u7EBF\u628A\u526F\u672C\u6309\u987A\u5E8F\u6216\u6309\u8DDD\u79BB\u8FDE\u8D77\u6765\uFF0C\u526F\u672C\u79FB\u52A8\u65F6\u7EBF\u8DDF\u7740\u8D70\u3002",
    tags: ["\u8FDE\u7EBF", "\u7F51\u7EDC", "\u8282\u70B9", "link", "network"],
    params: { mode: pick("\u8FDE\u6CD5", ["chain", "near"], ["\u6309\u987A\u5E8F\u9996\u5C3E\u76F8\u8FDE", "\u8FDE\u63A5\u8DDD\u79BB\u5185\u7684"], "near"), maxDistancePx: num("\u6700\u8FDC\u8FDE\u63A5\u8DDD\u79BB", 0, 2e3, 120, "px"), widthPx: num("\u7EBF\u5BBD", 0.5, 20, 1.5, "px") }
  }
];
var tableRows = 5;
var table = [
  ["prop", ["prop.move", "prop.rotate", "prop.scale", "prop.opacity", "prop.color"]],
  ["prop", ["prop.blur", "prop.morph", "prop.draw", "prop.crop"]],
  ["timing", ["timing.ease", "timing.spring", "timing.bounce"]],
  ["timing", ["timing.overshoot", "timing.anticipate", "timing.steps"]],
  ["loop", ["loop.breathe", "loop.swing", "loop.float"]],
  ["loop", ["loop.spin", "loop.flicker", "loop.wave"]],
  ["text", ["text.chars", "text.lines", "text.decode"]],
  ["text", ["text.type", "text.count", "text.tracking"]],
  ["feel", ["feel.trail", "feel.motion-blur", "feel.glow"]],
  ["feel", ["feel.grain", "feel.glitch", "feel.chroma"]],
  ["transition", ["transition.wipe", "transition.iris", "transition.slices"]],
  ["transition", ["transition.blinds", "transition.flip", "transition.push", "transition.dissolve"]],
  ["choreo", ["choreo.stagger", "choreo.cascade", "choreo.follow", "choreo.random"]],
  ["choreo", ["choreo.array", "choreo.ring", "choreo.grid", "choreo.mirror"]],
  ["generate", ["gen.particles", "gen.shatter", "gen.ripple", "gen.trace", "gen.link"]]
];
var placement = /* @__PURE__ */ new Map();
table.forEach(([family, ids], column) => ids.forEach((id2, index) => placement.set(id2, { family, cell: [tableRows - ids.length + index + 1, column + 1] })));
var capabilities = definitions.map((definition) => {
  const placed = placement.get(definition.id);
  if (!placed) throw new Error(`Capability ${definition.id} has no cell in the periodic table.`);
  const entry = definition;
  return { version: "0.1.0", targets: ["path"], backend: { js: "implemented" }, engine: "vector", time: "finite", ...entry, id: definition.id, ...placed };
});
function getCapability(id2) {
  return capabilities.find((entry) => entry.id === id2);
}
function defaultParams(id2) {
  return Object.fromEntries(Object.entries(getCapability(id2).params).map(([key, parameter]) => [key, parameter.default]));
}
function searchCapabilities(query) {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return capabilities.filter((entry) => terms.every((term) => [entry.id, entry.title, entry.english, entry.symbol, entry.description, families[entry.family].title, families[entry.family].english, ...entry.tags].join(" ").toLowerCase().includes(term)));
}

// packages/core/src/math.ts
var clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
var lerp = (a, b, t) => a + (b - a) * t;
var smooth = (t) => {
  const u = clamp(t);
  return u * u * (3 - 2 * u);
};
function hashId(seed, id2) {
  let value = seed >>> 0;
  for (let i = 0; i < id2.length; i++) value = Math.imul(value ^ id2.charCodeAt(i), 16777619) >>> 0;
  return value;
}
function sample(seed, index) {
  let value = (seed ^ Math.imul(index, 2654435761)) >>> 0;
  value = Math.imul(value ^ value >>> 16, 569420461);
  value = Math.imul(value ^ value >>> 15, 1935289751);
  return ((value ^ value >>> 15) >>> 0) / 4294967295 * 2 - 1;
}
function noise(seed, time) {
  const index = Math.floor(time);
  return lerp(sample(seed, index), sample(seed, index + 1), smooth(time - index));
}
var TAU = Math.PI * 2;
var fract = (value) => value - Math.floor(value);
function rand(seed, a = 0, b = 0, c = 0) {
  let value = (seed ^ Math.imul(a | 0, 2654435761) ^ Math.imul(b | 0, 2246822507) ^ Math.imul(c | 0, 3266489909)) >>> 0;
  value = Math.imul(value ^ value >>> 16, 569420461);
  value = Math.imul(value ^ value >>> 15, 1935289751);
  return ((value ^ value >>> 15) >>> 0) / 4294967296;
}
function cubicBezier(x1, y1, x2, y2, t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const axis = (a, b, u) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2;
    if (axis(x1, x2, middle) < t) low = middle;
    else high = middle;
  }
  return axis(y1, y2, (low + high) / 2);
}
function mixColor(from, to, t) {
  const linear = (hex, i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const encode = (v) => Math.round(clamp(v <= 31308e-7 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255).toString(16).padStart(2, "0");
  const u = clamp(t);
  return `#${[1, 3, 5].map((i) => encode(lerp(linear(from, i), linear(to, i), u))).join("")}`;
}

// packages/core/src/geometry.ts
var polygon = (radius, sides, rotationDeg = -90, cx = 0, cy = 0) => Array.from({ length: sides }, (_, i) => {
  const angle = rotationDeg * Math.PI / 180 + i / sides * TAU;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
});
var circle = (radius, cx = 0, cy = 0, segments = 48) => polygon(radius, segments, 0, cx, cy);
var rect = (width, height, cx = 0, cy = 0) => [[cx - width / 2, cy - height / 2], [cx + width / 2, cy - height / 2], [cx + width / 2, cy + height / 2], [cx - width / 2, cy + height / 2]];
function place(path2, { x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = scaleX, ox = 0, oy = 0 }) {
  const cos = Math.cos(rotation * Math.PI / 180);
  const sin = Math.sin(rotation * Math.PI / 180);
  return path2.map(([px, py]) => {
    const dx = (px - ox) * scaleX;
    const dy = (py - oy) * scaleY;
    return [ox + dx * cos - dy * sin + x, oy + dx * sin + dy * cos + y];
  });
}
function bounds(paths) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path2 of paths) for (const [x, y] of path2) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (minX === Infinity) minX = minY = maxX = maxY = 0;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}
var ring = (path2, closed) => closed && path2.length > 1 ? [...path2, path2[0]] : path2;
function lengths(points) {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  return cumulative;
}
function locate(points, cumulative, distance) {
  let i = 1;
  while (i < points.length - 1 && cumulative[i] < distance) i++;
  const a = points[i - 1];
  const b = points[i];
  const span = cumulative[i] - cumulative[i - 1];
  const t = span > 0 ? clamp((distance - cumulative[i - 1]) / span) : 0;
  return { point: [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}
function slice(path2, closed, start, end) {
  const points = ring(path2, closed);
  const cumulative = lengths(points);
  const total2 = cumulative.at(-1) ?? 0;
  if (points.length < 2 || total2 === 0 || end <= start) return [];
  let from = start;
  let to = end;
  if (closed) {
    const shift2 = Math.floor(from);
    from -= shift2;
    to = Math.min(to - shift2, from + 1);
  } else {
    from = clamp(from);
    to = clamp(to);
    if (to <= from) return [];
  }
  const result = [locate(points, cumulative, from * total2).point];
  for (let lap = 0; lap <= (closed ? 1 : 0); lap++) for (let i = 1; i < points.length; i++) {
    const distance = cumulative[i] / total2 + lap;
    if (distance > from && distance < to) result.push([...points[i]]);
  }
  const last = to > 1 ? to - 1 : to;
  result.push(locate(points, cumulative, last * total2).point);
  return result;
}
function resample(path2, closed, count) {
  const points = ring(path2, closed);
  const cumulative = lengths(points);
  const total2 = cumulative.at(-1) ?? 0;
  if (points.length < 2 || total2 === 0) return path2.map((point2) => [...point2]);
  return Array.from({ length: count }, (_, i) => locate(points, cumulative, (closed ? i / count : i / Math.max(1, count - 1)) * total2).point);
}

// packages/catalog/src/examples.ts
var palettes = {
  light: { paper: "#fbfbf8", ink: "#1d201d" },
  dark: { paper: "#16181b", ink: "#eef0ea" }
};
var blend = (a, b, t) => `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("")}`;
var inks = (theme, id2) => {
  const { paper, ink } = palettes[theme];
  const accent = families[getCapability(id2).family].color;
  return { ink, accent, guide: blend(paper, accent, 0.55), ghost: blend(paper, ink, 0.16) };
};
var W = 640;
var H = 400;
var CX = W / 2;
var CY = H / 2;
var star = (points, outer, inner) => polygon(outer, points * 2, -90).map(([x, y], i) => i % 2 ? [x * inner / outer, y * inner / outer] : [x, y]);
var arc = (radius, fromDeg, toDeg, steps = 48) => Array.from({ length: steps + 1 }, (_, i) => {
  const angle = (fromDeg + (toDeg - fromDeg) * i / steps) * Math.PI / 180;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
});
var path = (id2, position, color3, points, options = {}) => ({ id: id2, type: "path", position, color: color3, points, strokeWidth: 2, ...options });
var subjectPath = (points, options = {}) => ({ points, closed: true, strokeWidth: 5, ...options });
var square = subjectPath(rect(72, 72));
var dot = (radius) => subjectPath(circle(radius), { fill: true });
var card = subjectPath([[-130, 80], [-130, -20], [-80, -62], [-46, -30], [6, -80], [62, -14], [92, -40], [130, -6], [130, 80]], { fill: true });
var cardOutline = (_, ink, at) => [path("guide-frame", at, ink.ghost, rect(260, 160), { closed: true })];
var row = subjectPath(rect(220, 30), { strokeWidth: 4 });
var timingDemo = {
  // The track stays inside the part of the sheet a table cell shows, even when a curve overshoots.
  subject: subjectPath(rect(56, 56)),
  position: [190, 200],
  frames: 84,
  carriers: [{ recipe: "prop.move", params: { fromPx: 0, toPx: 260, angleDeg: 0 }, start: 6, duration: 54 }],
  guides: (_, ink) => [path("guide-track", [190, 200], ink.ghost, [[0, 0], [260, 0]])]
};
var demos = {
  // 属性
  "prop.move": {
    subject: square,
    duration: 54,
    frames: 76,
    guides: (p, ink, at) => {
      const a = Number(p.angleDeg) * Math.PI / 180;
      const along = (d) => [d * Math.cos(a), d * Math.sin(a)];
      return [path("guide-track", at, ink.guide, [along(Number(p.fromPx)), along(Number(p.toPx))]), path("guide-start", [at[0] + along(Number(p.fromPx))[0], at[1] + along(Number(p.fromPx))[1]], ink.ghost, rect(72, 72), { closed: true, strokeWidth: 3 })];
    }
  },
  "prop.rotate": {
    subject: subjectPath(rect(120, 120)),
    duration: 54,
    frames: 76,
    guides: (p, ink, at) => [path("guide-arc", at, ink.guide, arc(110, Number(p.fromDeg) - 90, Number(p.toDeg) - 90)), path("guide-start", at, ink.ghost, rect(120, 120), { closed: true, strokeWidth: 3 })]
  },
  "prop.scale": {
    subject: square,
    duration: 54,
    frames: 76,
    guides: (p, ink, at) => [path("guide-from", at, ink.ghost, rect(72 * Number(p.from), 72 * Number(p.from)), { closed: true }), path("guide-to", at, ink.guide, rect(72 * Number(p.to), 72 * Number(p.to)), { closed: true })]
  },
  "prop.opacity": {
    subject: subjectPath(rect(140, 140), { fill: true }),
    duration: 54,
    frames: 76,
    guides: (_, ink, at) => [path("guide-outline", at, ink.ghost, rect(140, 140), { closed: true, strokeWidth: 3 })]
  },
  "prop.color": { subject: subjectPath(circle(80), { fill: true }), duration: 54, frames: 76 },
  "prop.blur": {
    subject: subjectPath(circle(70), { fill: true }),
    duration: 54,
    frames: 76,
    guides: (_, ink, at) => [path("guide-outline", at, ink.ghost, circle(70), { closed: true })]
  },
  "prop.morph": {
    subject: subjectPath(circle(90)),
    duration: 54,
    frames: 76,
    guides: (_, ink, at) => [path("guide-start", at, ink.ghost, circle(90), { closed: true })]
  },
  "prop.draw": {
    subject: { points: Array.from({ length: 61 }, (_, i) => {
      const t = i / 60;
      return [-200 + 400 * t, -70 * Math.sin(t * Math.PI * 3) * (1 - t * 0.4)];
    }), strokeWidth: 7 },
    duration: 54,
    frames: 76,
    guides: (_, ink, at) => [path("guide-path", at, ink.ghost, Array.from({ length: 61 }, (_2, i) => {
      const t = i / 60;
      return [-200 + 400 * t, -70 * Math.sin(t * Math.PI * 3) * (1 - t * 0.4)];
    }), { strokeWidth: 3 })]
  },
  "prop.crop": { subject: card, duration: 54, frames: 76, guides: cardOutline },
  // 节奏：同一个方块沿同一条轨道移动，只有曲线不同
  "timing.ease": timingDemo,
  "timing.spring": timingDemo,
  "timing.bounce": timingDemo,
  "timing.overshoot": timingDemo,
  "timing.anticipate": timingDemo,
  "timing.steps": timingDemo,
  // 循环
  "loop.breathe": {
    subject: subjectPath(circle(80), { fill: true }),
    params: { amount: 0.18 },
    guides: (p, ink, at) => [path("guide-max", at, ink.guide, circle(80 * (1 + Number(p.amount))), { closed: true }), path("guide-min", at, ink.ghost, circle(80 * (1 - Number(p.amount))), { closed: true })]
  },
  "loop.swing": {
    subject: { points: [[0, 0], [0, 150], ...circle(22, 0, 172).slice(12), ...circle(22, 0, 172).slice(0, 13)], strokeWidth: 5 },
    position: [CX, 70],
    guides: (p, ink, at) => [path("guide-arc", at, ink.guide, arc(172, 90 - Number(p.amount), 90 + Number(p.amount))), path("guide-rest", at, ink.ghost, [[0, 0], [0, 194]])]
  },
  "loop.float": { subject: square, params: { amplitudePx: 120 }, guides: (_, ink, at) => [path("guide-cross", at, ink.ghost, [[-20, 0], [20, 0], [0, 0], [0, -20], [0, 20]])] },
  "loop.spin": {
    subject: { points: arc(70, -90, 180), strokeWidth: 10 },
    params: { turnsPerSecond: 0.6 },
    guides: (_, ink, at) => [path("guide-ring", at, ink.ghost, circle(70), { closed: true, strokeWidth: 10 })]
  },
  "loop.flicker": { subject: subjectPath(star(5, 90, 38), { fill: true }), params: { rateHz: 8 } },
  "loop.wave": {
    subject: dot(12),
    carriers: [{ recipe: "choreo.array", params: { count: 9, gapPx: 56, angleDeg: 0 } }],
    guides: (_, ink, at) => [path("guide-axis", at, ink.ghost, [[-250, 0], [250, 0]])]
  },
  // 编排
  "choreo.stagger": {
    subject: row,
    frames: 80,
    carriers: [
      { recipe: "choreo.array", params: { count: 5, gapPx: 54, angleDeg: 90 } },
      { recipe: "timing.overshoot" },
      { recipe: "prop.move", params: { fromPx: -440, toPx: 0, angleDeg: 0 }, start: 4, duration: 30 },
      { recipe: "prop.opacity", params: { from: 0, to: 1 }, start: 4, duration: 30 }
    ]
  },
  "choreo.cascade": {
    subject: dot(12),
    frames: 84,
    carriers: [
      { recipe: "choreo.grid", params: { columns: 9, rows: 5, gapPx: 58 } },
      { recipe: "timing.overshoot" },
      { recipe: "prop.scale", params: { from: 0, to: 1 }, start: 2, duration: 24 }
    ],
    guides: (_, ink, at) => [path("guide-cross", at, ink.guide, [[-24, 0], [24, 0], [0, 0], [0, -24], [0, 24]])]
  },
  "choreo.follow": { subject: dot(16), params: { count: 7, lagFrames: 6, falloff: 0.11 }, carriers: [{ recipe: "loop.float", params: { amplitudePx: 260, rotateDeg: 0, frequencyHz: 0.7 } }] },
  "choreo.random": {
    subject: subjectPath(rect(40, 40), { fill: true }),
    frames: 84,
    carriers: [
      { recipe: "choreo.grid", params: { columns: 8, rows: 4, gapPx: 62 } },
      { recipe: "timing.overshoot" },
      { recipe: "prop.scale", params: { from: 0, to: 1 }, start: 2, duration: 22 },
      { recipe: "prop.opacity", params: { from: 0, to: 1 }, start: 2, duration: 22 }
    ]
  },
  "choreo.array": {
    subject: subjectPath(rect(46, 46)),
    carriers: [{ recipe: "loop.spin", params: { turnsPerSecond: 0.3 } }],
    guides: (p, ink, at) => {
      const a = Number(p.angleDeg) * Math.PI / 180;
      const half = (Number(p.count) - 1) / 2 * Number(p.gapPx) + 40;
      return [path("guide-line", at, ink.guide, [[-half * Math.cos(a), -half * Math.sin(a)], [half * Math.cos(a), half * Math.sin(a)]])];
    }
  },
  "choreo.ring": {
    subject: subjectPath([[-5, -22], [5, -22], [5, 22], [-5, 22]], { fill: true }),
    params: { count: 12, radiusPx: 110 },
    carriers: [{ recipe: "choreo.stagger", params: { stepFrames: 3, order: "forward" } }, { recipe: "loop.breathe", params: { amount: 0.45, periodS: 1.2 } }],
    guides: (p, ink, at) => [path("guide-ring", at, ink.guide, circle(Number(p.radiusPx)), { closed: true })]
  },
  "choreo.grid": { subject: dot(9), params: { columns: 9, rows: 5, gapPx: 56 }, carriers: [{ recipe: "loop.wave", params: { amplitudePx: 14, periodS: 1.6, phaseDeg: 22 } }] },
  "choreo.mirror": {
    subject: subjectPath([[-30, -26], [34, 0], [-30, 26], [-14, 0]], { fill: true }),
    params: { axis: "x", distancePx: 60 },
    frames: 80,
    carriers: [{ recipe: "prop.move", params: { fromPx: 0, toPx: 170, angleDeg: -20 }, start: 6, duration: 54 }, { recipe: "prop.rotate", params: { fromDeg: 0, toDeg: 90 }, start: 6, duration: 54 }],
    guides: (_, ink, at) => [path("guide-axis", at, ink.guide, [[0, -170], [0, 170]])]
  },
  // 转场：一张卡片
  "transition.wipe": { subject: card, duration: 48, frames: 72, guides: cardOutline },
  "transition.iris": { subject: card, duration: 48, frames: 72, guides: cardOutline },
  "transition.slices": { subject: card, duration: 54, frames: 78, guides: cardOutline },
  "transition.blinds": { subject: card, duration: 48, frames: 72, guides: cardOutline },
  "transition.flip": {
    subject: card,
    duration: 48,
    frames: 72,
    carriers: [{ recipe: "timing.overshoot", params: { tension: 1.2 } }],
    guides: (p, ink, at) => [path("guide-axis", at, ink.guide, p.axis === "x" ? [[-170, 0], [170, 0]] : [[0, -120], [0, 120]])]
  },
  "transition.push": { subject: card, duration: 48, frames: 72, guides: cardOutline },
  "transition.dissolve": { subject: card, duration: 54, frames: 78, guides: cardOutline },
  // 文字
  "text.chars": { text: { text: "MOTION", fontSize: 104, position: [136, 240] }, duration: 40, frames: 70 },
  "text.lines": { text: { text: "\u8BA9\u6587\u5B57\n\u4E00\u884C\u4E00\u884C\u51FA\u73B0", fontSize: 58, lineHeight: 80, position: [148, 180] }, duration: 44, frames: 72 },
  "text.decode": { text: { text: "SYSTEM\nONLINE", fontSize: 64, lineHeight: 82, mono: true, position: [200, 180] }, duration: 54, frames: 80 },
  "text.type": { text: { text: "Hello,\nmotion.", fontSize: 64, lineHeight: 82, mono: true, position: [200, 180] }, duration: 54, frames: 96 },
  "text.count": { text: { text: "#", fontSize: 120, position: [180, 240] }, duration: 54, frames: 78 },
  "text.tracking": { text: { text: "TRACKING", fontSize: 72, position: [168, 226] }, duration: 54, frames: 78 },
  // 质感
  "feel.trail": {
    subject: subjectPath(rect(56, 56), { fill: true }),
    params: { count: 7, gapFrames: 1.5, strength: 0.6 },
    carriers: [{ recipe: "loop.swing", params: { axis: "x", amount: 200, periodS: 1.6 } }, { recipe: "loop.spin", params: { turnsPerSecond: 0.4 } }]
  },
  "feel.motion-blur": {
    subject: subjectPath(rect(56, 56), { fill: true }),
    params: { shutterDeg: 360 },
    carriers: [{ recipe: "loop.swing", params: { axis: "x", amount: 210, periodS: 1.4 } }],
    guides: (_, ink, at) => [path("guide-track", at, ink.ghost, [[-240, 0], [240, 0]])]
  },
  "feel.glow": {
    subject: subjectPath(star(5, 100, 42), { strokeWidth: 6 }),
    params: { radiusPx: 12, strength: 1.4 },
    carriers: [{ recipe: "prop.draw", params: { from: 0, to: 1, trailRatio: 0 }, start: 0, duration: 54 }],
    frames: 80
  },
  "feel.grain": { subject: subjectPath(circle(110), { fill: true }) },
  "feel.glitch": { text: { text: "GLITCH", fontSize: 108, position: [138, 238] }, params: { offsetPx: 34, chance: 0.4 } },
  "feel.chroma": { text: { text: "RGB", fontSize: 150, position: [186, 254] }, params: { offsetPx: 8 }, carriers: [{ recipe: "loop.swing", params: { axis: "x", amount: 24, periodS: 2 } }] },
  // 生成
  "gen.particles": {
    subject: { points: [[-1, 0], [1, 0]], strokeWidth: 2 },
    position: [CX, 290],
    guides: (_, ink, at) => [path("guide-ground", at, ink.ghost, [[-200, 0], [200, 0]])]
  },
  "gen.shatter": { subject: subjectPath(polygon(90, 6), { fill: true }), duration: 60, frames: 84, guides: (_, ink, at) => [path("guide-outline", at, ink.ghost, polygon(90, 6), { closed: true })] },
  "gen.ripple": { subject: subjectPath(circle(34), { strokeWidth: 4 }) },
  "gen.trace": {
    subject: dot(10),
    params: { lengthFrames: 36 },
    carriers: [{ recipe: "loop.swing", params: { axis: "x", amount: 200, periodS: 2.4 } }, { recipe: "loop.swing", params: { axis: "y", amount: 120, periodS: 1.6 } }]
  },
  "gen.link": {
    subject: dot(7),
    params: { mode: "near", maxDistancePx: 130 },
    carriers: [{ recipe: "choreo.grid", params: { columns: 6, rows: 4, gapPx: 96 } }, { recipe: "loop.float", params: { amplitudePx: 90, rotateDeg: 0, frequencyHz: 0.4 } }]
  }
};
function createExampleScene(id2, font, theme = "light") {
  const entry = getCapability(id2);
  const demo = demos[id2];
  const ink = inks(theme, id2);
  const ongoing2 = [id2, ...(demo.carriers ?? []).map((carrier) => carrier.recipe)].every((recipe) => getCapability(recipe).time !== "finite");
  const frames = demo.frames ?? (ongoing2 ? 240 : 80);
  const at = demo.text ? demo.text.position : demo.position ?? [CX, CY];
  const params = { ...defaultParams(id2), ...demo.params };
  let subject;
  if (demo.text) {
    subject = {
      id: "subject",
      type: "text",
      position: demo.text.position,
      color: ink.ink,
      text: demo.text.text,
      font: demo.text.mono ? "mono" : font ? "demoFont" : "system",
      fontSize: demo.text.fontSize,
      lineHeight: demo.text.lineHeight ?? demo.text.fontSize
    };
  } else {
    const shape2 = demo.subject ?? square;
    subject = {
      id: "subject",
      type: "path",
      position: at,
      color: ink.ink,
      points: shape2.points,
      strokeWidth: shape2.strokeWidth ?? 5,
      ...shape2.closed ? { closed: true } : {},
      ...shape2.fill ? { fill: true } : {}
    };
  }
  const clip = (clipId, recipe, values, start, duration) => ({ id: clipId, target: "subject", recipe, startFrame: start, durationFrames: Math.min(duration, frames - start), fillAfter: "hold", params: values });
  const featuredStart = demo.start ?? 0;
  const featuredLength = demo.duration ?? frames;
  const clips = [clip("effect", id2, params, featuredStart, entry.time === "finite" ? featuredLength : frames - featuredStart)];
  (demo.carriers ?? []).forEach((carrier, i) => {
    const time = getCapability(carrier.recipe).time;
    clips.push(clip(`carrier-${i + 1}`, carrier.recipe, { ...defaultParams(carrier.recipe), ...carrier.params }, carrier.start ?? 0, time === "finite" ? carrier.duration ?? frames : frames));
  });
  const scene = {
    specVersion: "0.1",
    seed: 42,
    canvas: { width: W, height: H, background: palettes[theme].paper },
    fps: { numerator: 30, denominator: 1 },
    durationFrames: frames,
    assets: {},
    nodes: [...demo.guides?.(params, ink, at) ?? [], subject],
    clips
  };
  if (subject.type === "text" && subject.font === "demoFont" && font) scene.assets = { demoFont: structuredClone(font) };
  if (id2 === "prop.color") {
    scene.clips[0].params.from = ink.ink;
    scene.clips[0].params.to = ink.accent;
  }
  if (id2 === "feel.glow") subject.color = ink.accent;
  return scene;
}
var previewKind = (id2) => demos[id2].text ? "text" : "geometry";

// packages/core/src/schema.ts
var number = (minimum, maximum) => ({ type: "number", minimum, maximum });
var integer = (minimum, maximum) => ({ type: "integer", minimum, maximum });
var string = (maxLength, pattern) => ({ type: "string", minLength: 1, maxLength, ...pattern ? { pattern } : {} });
var object = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
var id = string(64, "^[a-zA-Z][a-zA-Z0-9_-]*$");
var color2 = string(7, "^#[0-9a-fA-F]{6}$");
var point = { type: "array", items: number(-32768, 32768), minItems: 2, maxItems: 2 };
var baseNode = { id, position: point, color: color2 };
var textNode = object({
  ...baseNode,
  type: { const: "text" },
  text: string(2e3),
  font: { ...id, description: "system and mono use the device sans-serif or monospace font without a download; otherwise reference a declared font asset." },
  fontSize: number(1, 512),
  lineHeight: number(1, 1024)
});
var pathFields = { ...baseNode, type: { const: "path" }, points: { type: "array", items: point, minItems: 2, maxItems: 1e3 }, strokeWidth: number(0.1, 100) };
var pathNode = { ...object(pathFields), properties: { ...pathFields, closed: { type: "boolean" }, fill: { type: "boolean" } } };
var motionSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:motionflux:spec:0.1",
  ...object({
    specVersion: { const: "0.1" },
    seed: integer(0, 4294967295),
    canvas: object({ width: integer(16, 4096), height: integer(16, 4096), background: color2 }),
    fps: object({ numerator: integer(1, 12e4), denominator: integer(1, 1e4) }),
    durationFrames: integer(1, 18e3),
    assets: { type: "object", additionalProperties: object({
      type: { const: "font" },
      src: string(200, "^assets/[a-zA-Z0-9_-]+\\.(otf|ttf|woff2)$"),
      sha256: string(64, "^[0-9a-f]{64}$"),
      family: string(64, "^[a-zA-Z][a-zA-Z0-9_-]*$"),
      postscriptName: string(100)
    }) },
    nodes: { type: "array", items: { oneOf: [textNode, pathNode] }, minItems: 1, maxItems: 100 },
    clips: { type: "array", maxItems: 300, items: { oneOf: capabilities.map((entry) => object({
      id,
      target: id,
      recipe: { const: entry.id },
      startFrame: integer(0, 17999),
      durationFrames: integer(1, 18e3),
      fillAfter: { const: "hold" },
      params: object(Object.fromEntries(Object.entries(entry.params).map(([key, parameter]) => [
        key,
        parameter.type === "number" ? { type: parameter.integer ? "integer" : "number", minimum: parameter.minimum, maximum: parameter.maximum, description: `${parameter.title} (${parameter.unit})` } : parameter.type === "color" ? { ...color2, description: parameter.title } : { type: "string", enum: parameter.enum }
      ])))
    })) } }
  })
};

// packages/core/src/validate.ts
function check(value, schema, path2, issues) {
  const issue = (message) => {
    issues.push({ path: path2, code: "SCHEMA", message });
  };
  if (schema.oneOf) {
    const results = schema.oneOf.map((variant) => {
      const errors = [];
      check(value, variant, path2, errors);
      return errors;
    });
    if (results.filter((errors) => !errors.length).length === 1) return;
    const object3 = value && typeof value === "object" ? value : {};
    const selected = schema.oneOf.findIndex((variant) => Object.entries(variant.properties ?? {}).some(([key, field]) => field.const !== void 0 && object3[key] === field.const));
    if (selected >= 0) issues.push(...results[selected]);
    else issue("Unsupported node type or recipe. Use a catalog entry supported by this version.");
    return;
  }
  if (schema.const !== void 0 && value !== schema.const) issue(`Expected ${JSON.stringify(schema.const)}.`);
  if (schema.enum && !schema.enum.includes(value)) issue(`Choose one of ${schema.enum.join(", ")}.`);
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      issue("Expected a plain object.");
      return;
    }
    const record = value;
    for (const key of schema.required ?? []) if (!Object.hasOwn(record, key)) issues.push({ path: `${path2}.${key}`, code: "REQUIRED", message: "Required field is missing." });
    for (const [key, child] of Object.entries(record)) {
      const field = Object.hasOwn(schema.properties ?? {}, key) ? schema.properties[key] : void 0;
      if (field) check(child, field, `${path2}.${key}`, issues);
      else if (schema.additionalProperties === false) issues.push({ path: `${path2}.${key}`, code: "UNKNOWN_FIELD", message: "Unsupported field; remove it or use a supported schema version." });
      else if (typeof schema.additionalProperties === "object") check(child, schema.additionalProperties, `${path2}.${key}`, issues);
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) {
      issue("Expected an array.");
      return;
    }
    if (schema.minItems !== void 0 && value.length < schema.minItems) issue(`Requires at least ${schema.minItems} items.`);
    if (schema.maxItems !== void 0 && value.length > schema.maxItems) {
      issue(`Allows at most ${schema.maxItems} items.`);
      return;
    }
    if (schema.items) value.forEach((child, i) => check(child, schema.items, `${path2}[${i}]`, issues));
  } else if (schema.type === "string") {
    if (typeof value !== "string") {
      issue("Expected a string.");
      return;
    }
    if (schema.minLength !== void 0 && value.length < schema.minLength) issue("String must not be empty.");
    if (schema.maxLength !== void 0 && value.length > schema.maxLength) issue(`Maximum string length is ${schema.maxLength}.`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) issue("Value does not match the required format.");
  } else if (schema.type === "boolean") {
    if (typeof value !== "boolean") issue("Expected true or false.");
  } else if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issue("Expected a finite number.");
      return;
    }
    if (schema.type === "integer" && !Number.isInteger(value)) issue("Expected an integer.");
    if (schema.minimum !== void 0 && value < schema.minimum) issue(`Minimum is ${schema.minimum}.`);
    if (schema.maximum !== void 0 && value > schema.maximum) issue(`Maximum is ${schema.maximum}.`);
  }
}
function validateScene(value) {
  const issues = [];
  check(value, motionSchema, "$", issues);
  if (issues.length) return issues;
  const scene = value;
  const add = (path2, code, message) => issues.push({ path: path2, code, message });
  const rate = scene.fps.numerator / scene.fps.denominator;
  if (rate < 1 || rate > 120) add("$.fps", "FPS_RANGE", "Effective frame rate must be 1\u2013120 fps.");
  const ids = /* @__PURE__ */ new Set();
  scene.nodes.forEach((node, i) => {
    if (ids.has(node.id)) add(`$.nodes[${i}].id`, "DUPLICATE_ID", "Node ID must be unique.");
    ids.add(node.id);
    if (node.type === "text") {
      if (node.font !== "system" && node.font !== "mono" && !Object.hasOwn(scene.assets, node.font)) add(`$.nodes[${i}].font`, "MISSING_FONT", "Use system or mono, or declare this font asset and include the matching file.");
      if (node.text.includes("\r") || node.text.includes("	")) add(`$.nodes[${i}].text`, "TEXT_LAYOUT", "Use explicit LF newlines and spaces, not CR or tabs.");
      if (node.text.split("\n").length > 20) add(`$.nodes[${i}].text`, "TEXT_LAYOUT", "At most 20 explicit lines are supported.");
    }
  });
  const assetFamilies = /* @__PURE__ */ new Set();
  for (const [id2, asset] of Object.entries(scene.assets)) {
    if (id2 === "system" || id2 === "mono") add(`$.assets.${id2}`, "ASSET_ID", `${id2} is reserved for a device font; choose another asset ID.`);
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id2)) add(`$.assets.${id2}`, "ASSET_ID", "Use a stable alphanumeric asset ID.");
    if (assetFamilies.has(asset.family)) add(`$.assets.${id2}.family`, "FONT_FAMILY", "Each font asset must have a unique family.");
    assetFamilies.add(asset.family);
  }
  const clipIds = /* @__PURE__ */ new Set();
  const writers = /* @__PURE__ */ new Map();
  scene.clips.forEach((clip, i) => {
    const path2 = `$.clips[${i}]`;
    if (clipIds.has(clip.id)) add(`${path2}.id`, "DUPLICATE_ID", "Clip ID must be unique.");
    clipIds.add(clip.id);
    const node = scene.nodes.find((node2) => node2.id === clip.target);
    const capability = getCapability(clip.recipe);
    if (!node) add(`${path2}.target`, "MISSING_TARGET", "Reference an existing node ID.");
    else if (!capability.targets.includes(node.type)) add(`${path2}.target`, "TARGET_TYPE", `${clip.recipe} cannot target ${node.type}.`);
    if (clip.startFrame + clip.durationFrames > scene.durationFrames) add(`${path2}.durationFrames`, "CLIP_BOUNDS", "Clip must fit inside the scene.");
    if (capability.role === "property") for (const property of capability.writes) {
      const key = `${clip.target}:${property}`;
      const span = { start: clip.startFrame, end: clip.startFrame + clip.durationFrames };
      const spans = writers.get(key) ?? [];
      if (spans.some((other) => span.start < other.end && other.start < span.end)) add(path2, "PROPERTY_CONFLICT", `Clips overlap on ${key}. Clips that write the same property must not share any frame; let one end before the next starts.`);
      writers.set(key, [...spans, span]);
    }
    if (node?.type === "text" && clip.recipe === "text.lines" && (node.text.split("\n").length - 1) * Number(clip.params.stepFrames) >= clip.durationFrames)
      add(`${path2}.params.stepFrames`, "STAGGER_BOUNDS", "Leave positive animation time for every line within the clip.");
    if (node?.type === "text" && clip.recipe === "text.chars" && ([...node.text].filter((character) => character.trim()).length - 1) * Number(clip.params.stepFrames) >= clip.durationFrames)
      add(`${path2}.params.stepFrames`, "STAGGER_BOUNDS", "Leave positive animation time for every character within the clip.");
  });
  return issues;
}
var SceneValidationError = class extends Error {
  constructor(issues) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.issues = issues;
  }
  code = "INVALID_SCENE";
};
function assertScene(value) {
  const issues = validateScene(value);
  if (issues.length) throw new SceneValidationError(issues);
}

// packages/core/src/recipes/context.ts
var pathNode2 = (c) => c.node;
var base = (c) => pathNode2(c).points.map((point2) => [point2[0], point2[1]]);
var strokeOf = (c) => pathNode2(c).strokeWidth;
function shape(c, paths, options = {}) {
  const node = pathNode2(c);
  const result = {
    paths,
    closed: options.closed ?? Boolean(node.closed),
    fill: options.fill ?? Boolean(node.fill),
    strokeWidth: options.strokeWidth ?? node.strokeWidth,
    opacity: options.opacity ?? 1
  };
  if (options.clip) result.clip = options.clip;
  return result;
}
function emit(c, shapes, filters = [], blend2 = "normal") {
  (c.state.layers ??= []).push({ shapes, filters, blend: blend2 });
}
var filter = (type, values) => ({ type, radius: 0, amount: 0, scale: 1, angle: 0, phase: 0, seed: 0, ...values });
var staggered = (progress, index, count, stagger) => count > 1 ? Math.min(1, Math.max(0, (progress - stagger * index / (count - 1)) / (1 - stagger))) : progress;
var shown = (c) => {
  const value = c.ease(c.progress);
  return c.s("mode") === "out" ? 1 - value : value;
};
var single = () => ({ slot: 0, slots: 1, offset: [0, 0], rotation: 0, scale: 1, flip: [1, 1], delay: 0, opacity: 1, ghost: 0 });

// packages/core/src/recipes/prop.ts
var polystar = (sides, radius, inner, rotationDeg = 0) => Array.from({ length: sides * 2 }, (_, i) => {
  const r = i % 2 ? radius * inner * Math.cos(Math.PI / sides) : radius;
  const angle = (rotationDeg - 90) * Math.PI / 180 + i * Math.PI / sides;
  return [r * Math.cos(angle), r * Math.sin(angle)];
});
var signedArea = (points) => points.reduce((sum, [x, y], i) => {
  const next = points[(i + 1) % points.length];
  return sum + x * next[1] - next[0] * y;
}, 0);
var propMove = (c) => {
  const offset = lerp(c.n("fromPx"), c.n("toPx"), c.ease(c.progress));
  const angle = c.n("angleDeg") * Math.PI / 180;
  c.state.position[0] += offset * Math.cos(angle);
  c.state.position[1] += offset * Math.sin(angle);
};
var propRotate = (c) => {
  c.state.rotation += lerp(c.n("fromDeg"), c.n("toDeg"), c.ease(c.progress));
};
var propScale = (c) => {
  c.state.scale *= Math.max(0, lerp(c.n("from"), c.n("to"), c.ease(c.progress)));
};
var propOpacity = (c) => {
  c.state.opacity *= clamp(lerp(c.n("from"), c.n("to"), c.ease(c.progress)));
};
var propColor = (c) => {
  c.state.color = mixColor(c.s("from"), c.s("to"), c.ease(c.progress));
};
var propBlur = (c) => {
  const radius = Math.max(0, lerp(c.n("fromPx"), c.n("toPx"), c.ease(c.progress)));
  if (radius > 0.05) c.state.filters.push(filter("blur", { radius }));
};
var propMorph = (c) => {
  const outline = base(c);
  const box = bounds([outline]);
  const radius = Math.max(box.width, box.height) / 2;
  const samples = 96;
  const source = resample(outline, true, samples);
  const goal = {
    circle: circle(radius, box.cx, box.cy),
    triangle: polygon(radius * 1.15, 3, -90, box.cx, box.cy),
    square: polygon(radius * 1.2, 4, -45, box.cx, box.cy),
    star: polystar(5, radius * 1.15, 0.45).map(([x, y]) => [x + box.cx, y + box.cy])
  }[c.s("target")];
  let target = resample(goal, true, samples);
  if (Math.sign(signedArea(source)) !== Math.sign(signedArea(target))) target = target.reverse();
  let best = 0;
  let bestCost = Infinity;
  for (let shift2 = 0; shift2 < samples; shift2++) {
    let cost = 0;
    for (let i = 0; i < samples && cost < bestCost; i++) {
      const a = source[i];
      const b = target[(i + shift2) % samples];
      cost += (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = shift2;
    }
  }
  const amount = c.n("amount") * c.ease(c.progress);
  emit(c, [shape(c, [source.map(([x, y], i) => {
    const to = target[(i + best) % samples];
    return [lerp(x, to[0], amount), lerp(y, to[1], amount)];
  })], { closed: true })]);
};
var propDraw = (c) => {
  const end = clamp(lerp(c.n("from"), c.n("to"), c.ease(c.progress)));
  c.state.trim = end;
  c.state.trimStart = c.n("trailRatio") > 0 ? Math.max(0, end - c.n("trailRatio")) : 0;
};
var propCrop = (c) => {
  const visible2 = clamp(lerp(c.n("from"), c.n("to"), c.ease(c.progress)));
  const hidden = 1 - visible2;
  if (visible2 >= 1) {
    c.state.pieces = void 0;
    return;
  }
  const inset = { left: 0, top: 0, right: 0, bottom: 0 };
  const origin = c.s("origin");
  if (origin === "center") {
    inset.left = inset.right = inset.top = inset.bottom = hidden / 2;
  } else inset[{ left: "right", right: "left", top: "bottom", bottom: "top" }[origin]] = hidden;
  const region = { kind: "inset", ...inset };
  c.state.pieces = visible2 <= 0 ? [] : [{ regions: [region], offset: [0, 0], opacity: 1 }];
};
var prop = {
  "prop.move": propMove,
  "prop.rotate": propRotate,
  "prop.scale": propScale,
  "prop.opacity": propOpacity,
  "prop.color": propColor,
  "prop.blur": propBlur,
  "prop.morph": propMorph,
  "prop.draw": propDraw,
  "prop.crop": propCrop
};

// packages/core/src/recipes/timing.ts
var finish = (curve) => (t) => t <= 0 ? 0 : t >= 1 ? 1 : curve(t);
var timingEase = (c) => {
  const power = c.n("power");
  const mode2 = c.s("mode");
  c.setCurve(finish(mode2 === "in" ? (t) => t ** power : mode2 === "out" ? (t) => 1 - (1 - t) ** power : (t) => t < 0.5 ? 2 ** (power - 1) * t ** power : 1 - (2 - 2 * t) ** power / 2));
};
var timingSpring = (c) => {
  const oscillations = c.n("oscillations");
  const damping = c.n("damping");
  c.setCurve(finish((t) => 1 - (1 - t) ** 2 * Math.exp(-damping * t) * Math.cos(t * oscillations * Math.PI * 2)));
};
var timingBounce = (c) => {
  const heights = Array.from({ length: c.n("bounces") }, (_, k) => c.n("decay") ** (k + 1));
  const total2 = 1 + heights.reduce((sum, height) => sum + 2 * Math.sqrt(height), 0);
  c.setCurve(finish((t) => {
    let time = t * total2;
    if (time < 1) return time * time;
    time -= 1;
    for (const height of heights) {
      const half = Math.sqrt(height);
      if (time < 2 * half) return 1 - height + (time - half) ** 2;
      time -= 2 * half;
    }
    return 1;
  }));
};
var timingOvershoot = (c) => {
  const tension = c.n("tension");
  c.setCurve(finish((t) => 1 + (tension + 1) * (t - 1) ** 3 + tension * (t - 1) ** 2));
};
var timingAnticipate = (c) => {
  const amount = c.n("amount");
  c.setCurve(finish((t) => cubicBezier(0.45, -2.2 * amount, 0.25, 1, t)));
};
var timingSteps = (c) => {
  const steps = c.n("steps");
  c.setCurve(finish((t) => Math.floor(t * steps) / steps));
};
var timing = {
  "timing.ease": timingEase,
  "timing.spring": timingSpring,
  "timing.bounce": timingBounce,
  "timing.overshoot": timingOvershoot,
  "timing.anticipate": timingAnticipate,
  "timing.steps": timingSteps
};

// packages/core/src/recipes/loop.ts
var loopBreathe = (c) => {
  c.state.scale *= 1 + c.n("amount") * Math.sin(TAU * c.seconds / c.n("periodS"));
};
var loopSwing = (c) => {
  const value = c.n("amount") * Math.sin(TAU * c.seconds / c.n("periodS"));
  const axis = c.s("axis");
  if (axis === "rotate") c.state.rotation += value;
  else c.state.position[axis === "x" ? 0 : 1] += value;
};
var loopFloat = (c) => {
  const time = c.seconds * c.n("frequencyHz");
  for (const axis of [0, 1]) {
    const seed2 = hashId(c.scene.seed, `${c.node.id}:${c.clip.id}:${c.copy.slot}:${axis}`);
    c.state.position[axis] += (noise(seed2, time) - noise(seed2, 0)) * c.n("amplitudePx") / 2;
  }
  const seed = hashId(c.scene.seed, `${c.node.id}:${c.clip.id}:${c.copy.slot}:r`);
  c.state.rotation += (noise(seed, time * 0.8) - noise(seed, 0)) * c.n("rotateDeg") / 2;
};
var loopSpin = (c) => {
  c.state.rotation += 360 * c.n("turnsPerSecond") * c.seconds;
};
var loopFlicker = (c) => {
  const step = Math.floor(c.seconds * c.n("rateHz"));
  if (step > 0 && rand(c.seed, step, c.copy.slot) < c.n("chance")) c.state.opacity *= c.n("low");
};
var loopWave = (c) => {
  c.state.position[1] -= c.n("amplitudePx") * Math.sin(TAU * c.seconds / c.n("periodS") - c.copy.slot * c.n("phaseDeg") * Math.PI / 180);
};
var loop = { "loop.breathe": loopBreathe, "loop.swing": loopSwing, "loop.float": loopFloat, "loop.spin": loopSpin, "loop.flicker": loopFlicker, "loop.wave": loopWave };

// packages/core/src/recipes/choreo.ts
function relayout(c, count, place2) {
  const next = [];
  for (const copy of c.copies) for (let i = 0; i < count; i++)
    next.push({ ...copy, slot: copy.slot * count + i, slots: copy.slots * count, ...place2(copy, i) });
  c.copies.splice(0, c.copies.length, ...next);
}
var shift = (copy, x, y) => [copy.offset[0] + x, copy.offset[1] + y];
function ghosts(c, count, lag, fade) {
  const next = [];
  for (const copy of c.copies) {
    next.push(copy);
    for (let k = 1; k <= count; k++) {
      const { opacity, scale } = fade(k);
      next.push({ ...copy, delay: copy.delay + k * lag, opacity: copy.opacity * opacity, scale: copy.scale * scale, ghost: copy.ghost + k });
    }
  }
  c.copies.splice(0, c.copies.length, ...next);
}
var choreoArray = (c) => {
  const count = c.n("count");
  const angle = c.n("angleDeg") * Math.PI / 180;
  const gap = c.n("gapPx");
  relayout(c, count, (copy, i) => {
    const along = (i - (count - 1) / 2) * gap;
    return { offset: shift(copy, along * Math.cos(angle), along * Math.sin(angle)) };
  });
};
var choreoRing = (c) => {
  const count = c.n("count");
  const radius = c.n("radiusPx");
  const outward = c.s("orient") === "outward";
  relayout(c, count, (copy, i) => {
    const angle = i / count * TAU - Math.PI / 2;
    return { offset: shift(copy, radius * Math.cos(angle), radius * Math.sin(angle)), rotation: copy.rotation + (outward ? angle * 180 / Math.PI + 90 : 0) };
  });
};
var choreoGrid = (c) => {
  const columns = c.n("columns");
  const rows = c.n("rows");
  const gap = c.n("gapPx");
  relayout(c, columns * rows, (copy, i) => ({ offset: shift(copy, (i % columns - (columns - 1) / 2) * gap, (Math.floor(i / columns) - (rows - 1) / 2) * gap) }));
};
var choreoMirror = (c) => {
  const axis = c.s("axis");
  const half = c.n("distancePx") / 2;
  const sides = axis === "x" ? [[1, 1], [-1, 1]] : axis === "y" ? [[1, 1], [1, -1]] : [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  relayout(c, sides.length, (copy, i) => {
    const [fx, fy] = sides[i];
    const x = axis === "y" ? copy.offset[0] : fx * (copy.offset[0] - half);
    const y = axis === "x" ? copy.offset[1] : fy * (copy.offset[1] - half);
    return { offset: [x, y], flip: [copy.flip[0] * fx, copy.flip[1] * fy], rotation: copy.rotation * fx * fy };
  });
};
var choreoFollow = (c) => {
  const falloff = c.n("falloff");
  ghosts(c, c.n("count"), c.n("lagFrames"), (k) => {
    const keep = Math.max(0.05, 1 - falloff * k);
    return { opacity: keep, scale: keep };
  });
};
function rank(slot, slots, order2) {
  const middle = (slots - 1) / 2;
  return order2 === "reverse" ? slots - 1 - slot : order2 === "center" ? Math.abs(slot - middle) : order2 === "edges" ? middle - Math.abs(slot - middle) : slot;
}
var choreoStagger = (c) => {
  for (const copy of c.copies) copy.delay += rank(copy.slot, copy.slots, c.s("order")) * c.n("stepFrames");
};
var choreoCascade = (c) => {
  for (const copy of c.copies) copy.delay += Math.hypot(copy.offset[0] - c.n("originX"), copy.offset[1] - c.n("originY")) / 100 * c.n("framesPer100Px");
};
var choreoRandom = (c) => {
  for (const copy of c.copies) copy.delay += rand(c.seed, copy.slot) * c.n("spreadFrames");
};
var choreo = {
  "choreo.array": choreoArray,
  "choreo.ring": choreoRing,
  "choreo.grid": choreoGrid,
  "choreo.mirror": choreoMirror,
  "choreo.follow": choreoFollow,
  "choreo.stagger": choreoStagger,
  "choreo.cascade": choreoCascade,
  "choreo.random": choreoRandom
};

// packages/core/src/recipes/transition.ts
var through = (regions, extra = {}) => ({ regions, offset: [0, 0], opacity: 1, ...extra });
var transitionWipe = (c) => {
  const value = shown(c);
  c.state.pieces = value >= 1 ? void 0 : value <= 0 ? [] : [through([{ kind: "half", angle: c.n("angleDeg"), at: value }])];
};
var transitionIris = (c) => {
  const value = shown(c);
  c.state.pieces = value >= 1 ? void 0 : value <= 0 ? [] : [through([{ kind: "circle", cx: c.n("centerX"), cy: c.n("centerY"), r: value }])];
};
var transitionSlices = (c) => {
  const count = c.n("count");
  const out = c.s("mode") === "out";
  const pieces = [];
  for (let j = 0; j < count; j++) {
    const eased = c.ease(staggered(c.progress, j, count, c.n("staggerRatio")));
    const value = out ? 1 - eased : eased;
    const travel = (out ? eased : 1 - eased) * c.n("distancePx") * (j % 2 ? 1 : -1) * (out ? -1 : 1);
    if (value > 1e-3) pieces.push(through([{ kind: "band", angle: 90, from: j / count, to: (j + 1) / count }], { offset: [travel, 0], opacity: clamp(value) }));
  }
  c.state.pieces = pieces;
};
var transitionBlinds = (c) => {
  const open = clamp(shown(c));
  const count = c.n("count");
  const angle = c.n("angleDeg") + 90;
  c.state.pieces = open >= 1 ? void 0 : open <= 0 ? [] : [through(Array.from({ length: count }, (_, j) => ({ kind: "band", angle, from: (j + 0.5 - open / 2) / count, to: (j + 0.5 + open / 2) / count })))];
};
var transitionFlip = (c) => {
  const turn = (1 - shown(c)) * c.n("turns") * Math.PI * 2;
  c.state.stretch[c.s("axis") === "y" ? 0 : 1] *= Math.cos(turn);
};
var transitionPush = (c) => {
  const eased = c.ease(c.progress);
  const angle = c.n("angleDeg") * Math.PI / 180;
  const along = c.s("mode") === "out" ? eased : eased - 1;
  c.state.pieces = along === 0 ? void 0 : [{ regions: [{ kind: "box" }], offset: [0, 0], shift: [Math.cos(angle) * along + 0, Math.sin(angle) * along + 0], opacity: 1 }];
};
var transitionDissolve = (c) => {
  const value = shown(c);
  if (value <= 0) c.state.pieces = [];
  else if (value < 1) c.state.filters.push(filter("dissolve", { amount: value, scale: c.n("grainPx"), seed: c.seed }));
};
var transition = {
  "transition.wipe": transitionWipe,
  "transition.iris": transitionIris,
  "transition.slices": transitionSlices,
  "transition.blinds": transitionBlinds,
  "transition.flip": transitionFlip,
  "transition.push": transitionPush,
  "transition.dissolve": transitionDissolve
};

// packages/core/src/recipes/text.ts
function glyphs(line) {
  const count = [...line.text].length;
  line.glyphs ??= [];
  while (line.glyphs.length < count) line.glyphs.push({ dx: 0, dy: 0, opacity: 1, scale: 1 });
  return line.glyphs;
}
var visible = (character) => character.trim() !== "";
var total = (c) => c.state.lines.reduce((sum, line) => sum + [...line.text].filter(visible).length, 0);
var textChars = (c) => {
  const count = total(c);
  const step = c.n("stepFrames");
  const active = Math.max(1, c.duration - (count - 1) * step);
  let index = 0;
  for (const line of c.state.lines) {
    const states = glyphs(line);
    [...line.text].forEach((character, i) => {
      if (!visible(character)) return;
      const value = c.ease(clamp((c.elapsed - index++ * step) / active));
      states[i].opacity *= clamp(value);
      states[i].dy += c.n("distancePx") * (1 - value);
    });
  }
};
var textLines = (c) => {
  const step = c.n("stepFrames");
  const active = Math.max(1, c.duration - (c.state.lines.length - 1) * step);
  c.state.lines.forEach((line, i) => {
    const value = c.ease(clamp((c.elapsed - i * step) / active));
    line.opacity *= clamp(value);
    line.y += c.n("distancePx") * (1 - value);
  });
};
var charsets = { symbols: "!<>-_\\/[]{}=+*^?#%&@$", binary: "01" };
var textDecode = (c) => {
  const pool = c.s("charset") === "own" ? [...new Set(c.state.lines.flatMap((line) => [...line.text]).filter(visible))] : [...charsets[c.s("charset")]];
  const count = total(c);
  const tick = Math.floor(c.seconds * c.n("rateHz"));
  const settled = c.ease(c.progress) * count;
  let index = 0;
  for (const line of c.state.lines) line.text = [...line.text].map((character) => {
    if (!visible(character)) return character;
    const i = index++;
    return i < Math.floor(settled + 1e-9) || pool.length < 2 ? character : pool[Math.floor(rand(c.seed, i, tick) * pool.length)];
  }).join("");
};
var textType = (c) => {
  const count = total(c);
  let left = Math.floor(clamp(c.progress) * count + 1e-9);
  let cursorLine = 0;
  c.state.lines.forEach((line, i) => {
    const characters = [...line.text];
    let keep = 0;
    while (keep < characters.length && (left > 0 || !visible(characters[keep]))) {
      if (visible(characters[keep])) left--;
      keep++;
    }
    if (keep > 0 || i === 0) cursorLine = i;
    line.text = characters.slice(0, keep).join("");
    if (keep < characters.length) left = 0;
  });
  const typing = c.progress < 1;
  const blink = c.n("blinkHz");
  const on = typing || blink === 0 || Math.floor(c.seconds * blink * 2) % 2 === 0;
  if (c.s("cursor") !== "none" && on) c.state.lines[cursorLine].text += c.s("cursor") === "block" ? "\u2588" : "|";
};
var textCount = (c) => {
  const value = lerp(c.n("from"), c.n("to"), c.ease(c.progress));
  const decimals = c.n("decimals");
  let number2 = Math.abs(value).toFixed(decimals);
  if (c.s("grouping") === "comma") number2 = number2.replace(/^\d+/u, (digits) => digits.replace(/\B(?=(\d{3})+$)/gu, ","));
  if (value < 0 && Number(number2.replace(/,/gu, "")) !== 0) number2 = `-${number2}`;
  if (c.state.lines.some((line) => line.text.includes("#"))) for (const line of c.state.lines) line.text = line.text.replace("#", number2);
  else c.state.lines.splice(0, c.state.lines.length, { text: number2, y: 0, opacity: 1 });
};
var textTracking = (c) => {
  const spacing = lerp(c.n("fromPx"), c.n("toPx"), c.ease(c.progress));
  const centred = c.s("anchor") === "center";
  for (const line of c.state.lines) {
    const states = glyphs(line);
    const count = [...line.text].length;
    states.forEach((state, i) => {
      if (i < count) state.dx += spacing * (centred ? i - (count - 1) / 2 : i);
    });
  }
};
var text2 = { "text.chars": textChars, "text.lines": textLines, "text.decode": textDecode, "text.type": textType, "text.count": textCount, "text.tracking": textTracking };

// packages/core/src/recipes/feel.ts
var feelTrail = (c) => {
  const count = c.n("count");
  const strength = c.n("strength");
  ghosts(c, count, c.n("gapFrames"), (k) => ({ opacity: strength * (1 - k / (count + 1)), scale: 1 }));
};
var feelMotionBlur = (c) => {
  const shutter = c.n("shutterDeg") / 360;
  const now = c.pastPosition(0);
  const before = c.pastPosition(shutter);
  const dx = now[0] - before[0];
  const dy = now[1] - before[1];
  const length = Math.hypot(dx, dy);
  if (length > 0.5) c.state.filters.push(filter("directional", { radius: length, angle: Math.atan2(dy, dx) * 180 / Math.PI }));
};
var feelGlow = (c) => {
  c.state.filters.push(filter("glow", { radius: c.n("radiusPx"), amount: c.n("strength") }));
};
var feelGrain = (c) => {
  c.state.filters.push(filter("grain", { amount: c.n("amount"), scale: c.n("sizePx"), phase: Math.floor(c.seconds * c.n("rateHz")), seed: c.seed }));
};
var feelGlitch = (c) => {
  c.state.filters.push(filter("glitch", { radius: c.n("offsetPx"), scale: c.n("bandPx"), amount: c.n("chance"), phase: Math.floor(c.seconds * c.n("rateHz")), seed: c.seed }));
};
var feelChroma = (c) => {
  c.state.filters.push(filter("split", { radius: c.n("offsetPx"), angle: c.n("angleDeg") }));
};
var feel = { "feel.trail": feelTrail, "feel.motion-blur": feelMotionBlur, "feel.glow": feelGlow, "feel.grain": feelGrain, "feel.glitch": feelGlitch, "feel.chroma": feelChroma };

// packages/core/src/recipes/generate.ts
var genParticles = (c) => {
  const secondsPerFrame = c.scene.fps.denominator / c.scene.fps.numerator;
  const life = c.n("lifeFrames");
  const shapes = [];
  for (let i = 0; i < c.n("count"); i++) {
    const since = c.elapsed - rand(c.seed, i, 0) * life;
    if (since < 0) continue;
    const cycle = Math.floor(since / life);
    const age = since - cycle * life;
    const time = age * secondsPerFrame;
    const spent = age / life;
    const angle = (-90 + (rand(c.seed, i, cycle, 1) - 0.5) * c.n("spreadDeg")) * Math.PI / 180;
    const speed = c.n("speedPx") * (0.35 + 0.65 * rand(c.seed, i, cycle, 2));
    shapes.push(shape(c, [polygon(
      c.n("sizePx") * (1 - spent) * (0.6 + 0.4 * rand(c.seed, i, cycle, 3)),
      8,
      0,
      speed * Math.cos(angle) * time,
      speed * Math.sin(angle) * time + c.n("gravityPx") * time * time / 2
    )], { closed: true, fill: true, opacity: 1 - spent }));
  }
  emit(c, shapes);
};
var genShatter = (c) => {
  const outline = base(c);
  if (c.progress <= 0) {
    emit(c, [shape(c, [outline])]);
    return;
  }
  const count = c.n("pieces");
  const box = bounds([outline]);
  const pad = strokeOf(c);
  const corner = (i, j) => {
    const jitter = i === 0 || j === 0 || i === count || j === count ? 0 : 0.6;
    return [
      box.minX - pad + (i + (rand(c.seed, i, j, 0) - 0.5) * jitter) / count * (box.width + 2 * pad),
      box.minY - pad + (j + (rand(c.seed, i, j, 1) - 0.5) * jitter) / count * (box.height + 2 * pad)
    ];
  };
  const far = Math.hypot(box.width, box.height) / 2 + pad || 1;
  const shapes = [];
  for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) {
    [[corner(i, j), corner(i + 1, j), corner(i + 1, j + 1)], [corner(i, j), corner(i + 1, j + 1), corner(i, j + 1)]].forEach((triangle, half) => {
      const centre = [(triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3, (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3];
      const away = [centre[0] - box.cx, centre[1] - box.cy];
      const distance = Math.hypot(...away);
      const local = clamp((c.progress - c.n("delayRatio") * distance / far) / (1 - c.n("delayRatio")));
      const id2 = (i * count + j) * 2 + half;
      const push = c.n("forcePx") * (1 - (1 - local) ** 2) * (0.6 + 0.8 * rand(c.seed, id2, 2));
      const pose = {
        x: (distance ? away[0] / distance : 0) * push,
        y: (distance ? away[1] / distance : -1) * push + c.n("gravityPx") * local * local,
        rotation: c.n("spinDeg") * local * (rand(c.seed, id2, 3) - 0.5) * 2,
        ox: centre[0],
        oy: centre[1]
      };
      const opacity = 1 - smooth((local - 0.55) / 0.45);
      if (opacity > 0) shapes.push(shape(c, [place(outline, pose)], { opacity, clip: [place(triangle, pose)] }));
    });
  }
  emit(c, shapes);
};
var genRipple = (c) => {
  const outline = base(c);
  const rings = c.n("rings");
  const shapes = [];
  for (let k = 0; k < rings; k++) {
    const age = fract(c.seconds / c.n("periodS") + k / rings);
    shapes.push(shape(c, [place(outline, { scaleX: 1 + (c.n("growth") - 1) * (1 - (1 - age) ** 2) })], { fill: false, opacity: (1 - age) ** 1.5 }));
  }
  emit(c, [...shapes, shape(c, [outline])]);
};
function fading(c, points, width) {
  const steps = Math.min(8, points.length - 1);
  const shapes = [];
  for (let k = 0; k < steps; k++) {
    const from = Math.floor(k * (points.length - 1) / steps);
    const to = Math.floor((k + 1) * (points.length - 1) / steps);
    shapes.push({ paths: [points.slice(from, to + 1)], closed: false, fill: false, strokeWidth: width, opacity: (k + 1) / steps });
  }
  return shapes;
}
var genTrace = (c) => {
  const samples = Math.max(2, Math.min(120, Math.ceil(c.n("lengthFrames")) + 1));
  emit(c, c.history(c.n("lengthFrames"), samples).flatMap((track) => track.length > 1 ? fading(c, track, c.n("widthPx")) : []));
};
var genLink = (c) => {
  const points = c.history(0, 1).map((track) => track.at(-1));
  const width = c.n("widthPx");
  const shapes = [];
  if (c.s("mode") === "chain") {
    if (points.length > 1) shapes.push({ paths: [points], closed: false, fill: false, strokeWidth: width, opacity: 1 });
  } else {
    const limit = c.n("maxDistancePx");
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const distance = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
      if (distance < limit) shapes.push({ paths: [[points[i], points[j]]], closed: false, fill: false, strokeWidth: width, opacity: 1 - distance / limit });
    }
  }
  emit(c, shapes);
};
var generate = { "gen.particles": genParticles, "gen.shatter": genShatter, "gen.ripple": genRipple, "gen.trace": genTrace, "gen.link": genLink };

// packages/core/src/recipes/index.ts
var recipes = { ...prop, ...timing, ...loop, ...choreo, ...transition, ...text2, ...feel, ...generate };

// packages/core/src/playback.ts
function canContinueScene(scene) {
  const kinds = scene.clips.map((clip) => getCapability(clip.recipe).time);
  return kinds.includes("ongoing") && !kinds.includes("finite");
}

// packages/core/src/index.ts
var ENGINE_VERSION = "0.4.0";
var ALGORITHM_VERSION = "value-noise-fnv-mix-v1";
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
var noCopies = [];
var freshState = (node) => ({
  position: [0, 0],
  rotation: 0,
  scale: 1,
  opacity: 1,
  stretch: [1, 1],
  color: node.color,
  trimStart: 0,
  trim: 1,
  filters: [],
  lines: node.type === "text" ? node.text.split("\n").map((text3, i) => ({ text: text3, y: i * node.lineHeight, opacity: 1 })) : []
});
function placeOf(node, copy, state) {
  const angle = copy.rotation * Math.PI / 180;
  const x = copy.flip[0] * state.position[0];
  const y = copy.flip[1] * state.position[1];
  return [node.position[0] + copy.offset[0] + x * Math.cos(angle) - y * Math.sin(angle), node.position[1] + copy.offset[1] + x * Math.sin(angle) + y * Math.cos(angle)];
}
function finishFrame(node, copy, index, state) {
  const common = {
    position: placeOf(node, copy, state),
    rotation: copy.rotation + copy.flip[0] * copy.flip[1] * state.rotation,
    scale: copy.scale * state.scale,
    stretch: [state.stretch[0] * copy.flip[0], state.stretch[1] * copy.flip[1]],
    opacity: clamp(copy.opacity * state.opacity),
    color: state.color,
    filters: state.filters,
    copy: index,
    ...state.pieces ? { pieces: state.pieces } : {}
  };
  if (node.type === "text") return { ...node, ...common, lines: state.lines };
  const whole = state.trimStart <= 0 && state.trim >= 1;
  const visiblePoints = whole ? node.points.map((point2) => [...point2]) : slice(node.points, Boolean(node.closed), state.trimStart, state.trim);
  const layers = state.layers ?? [{ blend: "normal", filters: [], shapes: visiblePoints.length >= 2 ? [{ paths: [visiblePoints], closed: Boolean(node.closed) && whole, fill: Boolean(node.fill) && whole, strokeWidth: node.strokeWidth, opacity: 1 }] : [] }];
  return { ...node, ...common, points: node.points.map((point2) => [...point2]), visiblePoints, layers };
}
function compileScene(input) {
  assertScene(input);
  const scene = freeze(structuredClone(input));
  const secondsPerFrame = scene.fps.denominator / scene.fps.numerator;
  const plans = /* @__PURE__ */ new Map();
  for (const clip of scene.clips) {
    const entry = getCapability(clip.recipe);
    const rivals = entry.role !== "property" ? [] : scene.clips.filter((other) => other !== clip && other.target === clip.target && getCapability(other.recipe).role === "property" && getCapability(other.recipe).writes.some((property) => entry.writes.includes(property)));
    plans.set(clip.target, [...plans.get(clip.target) ?? [], { clip, recipe: recipes[clip.recipe], role: entry.role, rivals }]);
  }
  const contextFor = (node, continuous) => (plan, at, state, copy, extra = {}) => {
    const { clip } = plan;
    const duration = clip.durationFrames;
    const elapsed = continuous ? Math.max(0, at - clip.startFrame) : clamp(at - clip.startFrame, 0, duration);
    return {
      scene,
      node,
      clip,
      state,
      elapsed,
      local: at - clip.startFrame,
      progress: elapsed / duration,
      seconds: elapsed * secondsPerFrame,
      duration,
      seed: hashId(scene.seed, `${node.id}:${clip.id}`),
      n: (key) => Number(clip.params[key]),
      s: (key) => String(clip.params[key]),
      ease: smooth,
      copy,
      copies: noCopies,
      setCurve: () => {
      },
      pastPosition: () => placeOf(node, copy, state),
      history: () => [],
      ...extra
    };
  };
  function arrange(node, time, context) {
    const copies = [single()];
    for (const role of ["layout", "order"]) for (const plan of plans.get(node.id) ?? []) if (plan.role === role) plan.recipe(context(plan, time, freshState(node), copies[0], { copies }));
    return copies.sort((a, b) => b.ghost - a.ghost);
  }
  function evaluateNode(node, time, continuous) {
    const nodePlans = plans.get(node.id) ?? [];
    const context = contextFor(node, continuous);
    const copies = arrange(node, time, context);
    const curves = nodePlans.filter((plan) => plan.role === "timing").map((plan) => {
      let curve = smooth;
      plan.recipe(context(plan, time, freshState(node), single(), { setCurve: (next) => {
        curve = next;
      } }));
      return { start: plan.clip.startFrame, end: plan.clip.startFrame + plan.clip.durationFrames, curve };
    });
    const ease = (clip) => curves.find((entry) => clip.startFrame >= entry.start && clip.startFrame < entry.end)?.curve ?? smooth;
    const stateAt = (copy, at, withFeel) => {
      const state = freshState(node);
      for (const plan of nodePlans) {
        if (plan.role !== "property" && plan.role !== "loop" && !(withFeel && plan.role === "feel")) continue;
        const started = plan.clip.startFrame <= at;
        if (plan.rivals.some((other) => started ? other.startFrame <= at && other.startFrame > plan.clip.startFrame : other.startFrame < plan.clip.startFrame)) continue;
        plan.recipe(context(plan, at, state, copy, { ease: ease(plan.clip), pastPosition: (frames2) => placeOf(node, copy, stateAt(copy, at - frames2, false)) }));
      }
      return state;
    };
    const frames = [];
    for (const plan of nodePlans) {
      if (plan.role !== "overlay") continue;
      const state = freshState(node);
      plan.recipe(context(plan, time, state, single(), { history: (length, samples) => copies.filter((copy) => copy.ghost === 0).map((copy) => Array.from({ length: samples }, (_, i) => placeOf(node, copy, stateAt(copy, time - copy.delay - length * (samples > 1 ? 1 - i / (samples - 1) : 0), false)))) }));
      frames.push({ type: "overlay", id: `${node.id}:${plan.clip.id}`, color: node.color, layers: state.layers ?? [] });
    }
    copies.forEach((copy, index) => frames.push(finishFrame(node, copy, index, stateAt(copy, time - copy.delay, true))));
    return frames;
  }
  return Object.freeze({
    spec: scene,
    evaluate(frame, options) {
      if (!Number.isFinite(frame)) throw new RangeError("Frame must be finite.");
      const continuous = Boolean(options?.continuous);
      if (continuous && !canContinueScene(scene)) throw new RangeError("Continuous time requires a scene made only of ongoing and timeless recipes.");
      const sampled = continuous ? Math.max(0, frame) : clamp(frame, 0, scene.durationFrames);
      return { frame: sampled, timeSeconds: sampled * scene.fps.denominator / scene.fps.numerator, nodes: scene.nodes.flatMap((node) => evaluateNode(node, sampled, continuous)) };
    },
    copies(nodeId) {
      const node = scene.nodes.find((item) => item.id === nodeId);
      if (!node) throw new RangeError(`No node ${nodeId}.`);
      return arrange(node, 0, contextFor(node, false)).map((copy) => ({ ...copy, offset: [...copy.offset], flip: [...copy.flip] }));
    }
  });
}

// packages/core/src/export.ts
function versionLock(scene) {
  return {
    schema: scene.specVersion,
    engine: ENGINE_VERSION,
    catalog: CATALOG_VERSION,
    renderer: "canvas2d-v0.3.0",
    algorithm: ALGORITHM_VERSION,
    assets: Object.fromEntries(Object.entries(scene.assets).map(([id2, asset]) => [id2, { src: asset.src, sha256: asset.sha256 }])),
    ...scene.nodes.some((node) => node.type === "text" && node.font === "system") ? { systemFont: "device sans-serif; appearance varies by operating system" } : {}
  };
}
var inlineJson = (value) => JSON.stringify(value).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
function createStandaloneHtml(input, runtime, assets, license, playback = {}) {
  assertScene(input);
  for (const asset of Object.values(input.assets)) if (!assets[asset.src]) throw new Error(`Missing embedded asset ${asset.src}`);
  const safeLicense = license.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
  return `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MotionFlux \xB7 \u72EC\u7ACB\u573A\u666F</title>
<style>body{margin:0;background:#101411;color:#edf2eb;font:15px system-ui;padding:24px}main{max-width:1100px;margin:auto}canvas{width:100%;height:auto;display:block;border:1px solid #38413b}nav{display:flex;align-items:center;gap:16px;padding:20px 0}input{flex:1}button{padding:9px 24px;cursor:pointer}pre{white-space:pre-wrap;font-size:12px;color:#a9b5aa}summary{cursor:pointer}h1{font-size:20px}</style>
<main><h1>MotionFlux / \u72EC\u7ACB\u573A\u666F</h1><canvas aria-label="\u573A\u666F\u753B\u9762"></canvas><nav><button>\u64AD\u653E</button><input aria-label="\u5E27\u4F4D\u7F6E" type="range" min="0" value="0" step="1"><span id="status" role="status">\u51C6\u5907\u9884\u89C8\u2026</span></nav>
<p>\u5DF2\u5185\u5D4C\u5F53\u524D\u53C2\u6570\u4E0E\u81EA\u6709\u8FD0\u884C\u4EE3\u7801\uFF0C\u53EF\u79BB\u7EBF\u6253\u5F00\u3002${Object.keys(input.assets).length ? "\u6240\u9700\u56FA\u5B9A\u5B57\u4F53\u5DF2\u5185\u5D4C\u3002" : "\u6587\u5B57\u4F7F\u7528\u8BBE\u5907\u7CFB\u7EDF\u5B57\u4F53\uFF0C\u65E0\u9700\u4E0B\u8F7D\u5B57\u5E93\u3002"}${playback.loop ? "\u64AD\u653E\u65F6\u8FDE\u7EED\u5FAA\u73AF\u3002" : ""}</p>
${safeLicense ? `<details><summary>\u5B57\u4F53\u8BB8\u53EF\u4E0E\u8D44\u6E90\u8BF4\u660E</summary><pre>${safeLicense}</pre></details>` : ""}</main>
<script id="scene-data" type="application/json">${inlineJson(input)}</script>
<script id="asset-data" type="application/json">${inlineJson(assets)}</script>
<script id="playback-data" type="application/json">${inlineJson(playback)}</script>
<script id="version-lock" type="application/json">${inlineJson(versionLock(input))}</script>
<script>${runtime.replace(/<\/script/giu, "<\\/script")}</script></html>`;
}

// packages/cli/src/capture.ts
import { spawn, spawnSync } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
var candidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
async function findBrowser(explicit) {
  for (const path2 of [explicit, process.env.MOTIONFLUX_BROWSER_PATH, ...candidates]) {
    if (path2 && await access(path2).then(() => true, () => false)) return path2;
  }
  return void 0;
}
var ffmpegPath = () => process.env.MOTIONFLUX_FFMPEG_PATH ?? "ffmpeg";
function toolVersion(command, flag = "-version") {
  const result = spawnSync(command, [flag], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.split("\n")[0].trim() : void 0;
}
async function launch(browser) {
  const profile = await mkdtemp(join(tmpdir(), "motionflux-browser-"));
  const child = spawn(browser, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
    "--mute-audio",
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const cleanup = async () => {
    child.kill();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };
  try {
    const endpoint = await new Promise((resolveEndpoint, reject) => {
      let log = "";
      const timer = setTimeout(() => reject(new Error(`BROWSER_START: ${browser} did not open a DevTools endpoint within 20 s.`)), 2e4);
      child.stderr.on("data", (chunk) => {
        log += chunk;
        const match = log.match(/DevTools listening on (ws:\/\/\S+)/u);
        if (match) {
          clearTimeout(timer);
          resolveEndpoint(match[1]);
        }
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(new Error(`BROWSER_START: ${error.message}`));
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`BROWSER_START: ${browser} exited with code ${code} before it was ready.`));
      });
    });
    const socket = new WebSocket(endpoint);
    await new Promise((opened, reject) => {
      socket.onopen = () => opened();
      socket.onerror = () => reject(new Error("BROWSER_START: Could not connect to the DevTools endpoint."));
    });
    const pending = /* @__PURE__ */ new Map();
    let nextId = 0;
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      const waiting = message.id === void 0 ? void 0 : pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id);
      if (message.error) waiting.reject(new Error(`BROWSER_PROTOCOL: ${message.error.message}`));
      else waiting.resolve(message.result ?? {});
    };
    socket.onclose = () => {
      for (const waiting of pending.values()) waiting.reject(new Error("BROWSER_PROTOCOL: The browser closed the connection."));
      pending.clear();
    };
    return {
      send: (method, params = {}, sessionId) => new Promise((resolveCall, reject) => {
        const id2 = ++nextId;
        pending.set(id2, { resolve: resolveCall, reject });
        socket.send(JSON.stringify({ id: id2, method, params, ...sessionId ? { sessionId } : {} }));
      }),
      close: async () => {
        socket.onclose = null;
        socket.close();
        await cleanup();
      }
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
async function captureFrames(htmlPath, frames, browser, transparent, onFrame) {
  const session = await launch(browser);
  try {
    const { targetId } = await session.send("Target.createTarget", { url: pathToFileURL(htmlPath).href });
    const { sessionId } = await session.send("Target.attachToTarget", { targetId, flatten: true });
    const evaluate = async (expression) => {
      const reply = await session.send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
      if (reply.exceptionDetails) throw new Error(`RENDER_FAILED: ${reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text}`);
      return reply.result.value;
    };
    const deadline = Date.now() + 6e4;
    for (; ; ) {
      const state = await evaluate(`window.motionFlux ? 'ready' : (document.getElementById('status')?.textContent ?? '')`);
      if (state === "ready") break;
      if (/error|ASSET_HASH|Missing/iu.test(state)) throw new Error(`RENDER_FAILED: ${state}`);
      if (Date.now() > deadline) throw new Error("RENDER_FAILED: The scene did not become ready within 60 s.");
      await new Promise((wait) => setTimeout(wait, 50));
    }
    for (const frame of frames) {
      const encoded = await evaluate(`(() => { window.motionFlux.renderFrame(${frame}, ${!transparent}); return document.querySelector('canvas').toDataURL('image/png').slice(22); })()`);
      await onFrame(frame, Buffer.from(encoded, "base64"));
    }
  } finally {
    await session.close();
  }
}
var videoFormats = {
  mp4: { alpha: false, evenSize: true, encoder: () => ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart"] },
  mov: { alpha: true, evenSize: false, encoder: (transparent) => ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", transparent ? "yuva444p10le" : "yuv444p10le"] },
  webm: { alpha: true, evenSize: true, encoder: (transparent) => ["-c:v", "libvpx-vp9", "-pix_fmt", transparent ? "yuva420p" : "yuv420p", "-b:v", "0", "-crf", "24"] },
  // GIF has 256 colours per frame, so encoding has to build a palette; that quantization is the only processing.
  gif: { alpha: false, evenSize: false, encoder: () => ["-filter_complex", "split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle", "-loop", "0"] }
};
async function encodeVideo(out, format, transparent, fps, feed) {
  const child = spawn(ffmpegPath(), [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "image2pipe",
    "-framerate",
    `${fps.numerator}/${fps.denominator}`,
    "-i",
    "-",
    ...videoFormats[format].encoder(transparent),
    out
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let log = "";
  child.stderr.on("data", (chunk) => {
    log += chunk;
  });
  const finished = new Promise((done, reject) => {
    child.once("error", (error) => reject(new Error(error.code === "ENOENT" ? "FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH; use the frames command for a PNG sequence instead." : `ENCODE_FAILED: ${error.message}`)));
    child.once("close", (code) => code === 0 ? done() : reject(new Error(`ENCODE_FAILED: ffmpeg exited with code ${code}. ${log.trim().split("\n").slice(-3).join(" ")}`)));
  });
  child.stdin.on("error", () => {
  });
  try {
    await feed((png) => new Promise((written, reject) => {
      child.stdin.write(png, (error) => error ? reject(new Error(`ENCODE_FAILED: ${error.message}`)) : written());
    }));
  } catch (error) {
    child.kill();
    await finished.catch(() => void 0);
    throw error;
  }
  child.stdin.end();
  await finished;
}
function probeVideo(path2) {
  const probe = (process.env.MOTIONFLUX_FFMPEG_PATH ?? "ffmpeg").replace(/ffmpeg(\.exe)?$/u, "ffprobe$1");
  const result = spawnSync(probe, [
    "-v",
    "error",
    "-count_frames",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=codec_name,pix_fmt,width,height,nb_read_frames,r_frame_rate:stream_tags=alpha_mode:format=duration",
    "-of",
    "json",
    path2
  ], { encoding: "utf8" });
  if (result.status !== 0) return void 0;
  const data = JSON.parse(result.stdout);
  const stream = data.streams[0];
  return stream ? { codec: stream.codec_name, pixelFormat: stream.pix_fmt, alpha: /^(yuva|rgba|bgra|argb|abgr|gbrap|ya)/u.test(stream.pix_fmt) || (stream.tags?.alpha_mode ?? stream.tags?.ALPHA_MODE) === "1", width: stream.width, height: stream.height, frames: Number(stream.nb_read_frames), durationSeconds: Number(data.format.duration), frameRate: stream.r_frame_rate } : void 0;
}

// packages/cli/src/delivery.ts
import { createHash } from "node:crypto";
import { mkdir, rm as rm2, writeFile } from "node:fs/promises";
import { dirname, join as join2, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
var hash = (data) => createHash("sha256").update(data).digest("hex");
var sceneHash = (scene) => hash(JSON.stringify(scene));
var object2 = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function changesBetween(before, after) {
  const changes = [];
  function compare(a, b, location) {
    if (isDeepStrictEqual(a, b)) return;
    if (object2(a) && object2(b)) {
      for (const key of [.../* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
        compare(a[key], b[key], { ...location, field: location.field ? `${location.field}.${key}` : key });
      }
    } else changes.push({ ...location, ...a !== void 0 ? { before: a } : {}, ...b !== void 0 ? { after: b } : {} });
  }
  const { nodes: beforeNodes, clips: beforeClips, assets: beforeAssets, ...beforeSettings } = before;
  const { nodes: afterNodes, clips: afterClips, assets: afterAssets, ...afterSettings } = after;
  compare(beforeSettings, afterSettings, { collection: "scene", field: "" });
  for (const [collection, a, b] of [["nodes", beforeNodes, afterNodes], ["clips", beforeClips, afterClips]]) {
    compare(a.map((item) => item.id), b.map((item) => item.id), { collection: "scene", field: `${collection}Order` });
    const oldById = new Map(a.map((item) => [item.id, item]));
    const newById = new Map(b.map((item) => [item.id, item]));
    for (const id2 of [.../* @__PURE__ */ new Set([...oldById.keys(), ...newById.keys()])].sort()) {
      compare(oldById.get(id2), newById.get(id2), { collection, id: id2, field: "" });
    }
  }
  for (const id2 of [.../* @__PURE__ */ new Set([...Object.keys(beforeAssets), ...Object.keys(afterAssets)])].sort()) {
    compare(beforeAssets[id2], afterAssets[id2], { collection: "assets", id: id2, field: "" });
  }
  return changes;
}
function finite(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (value && typeof value === "object") return Object.values(value).every(finite);
  return true;
}
function sampleChecks(scene) {
  const last = scene.durationFrames - 1;
  const frames = [.../* @__PURE__ */ new Set([0, Math.floor(last / 2), last, ...scene.clips.flatMap((clip) => [clip.startFrame, clip.startFrame + clip.durationFrames - 1, clip.startFrame + clip.durationFrames].map((frame) => Math.min(last, frame)))])].sort((a, b) => a - b);
  const compiled = compileScene(scene);
  const states = frames.map((frame) => {
    const state = compiled.evaluate(frame);
    if (!finite(state)) throw new Error("EVALUATION_FAILED: Non-finite values at sampled frames.");
    return hash(JSON.stringify(state));
  });
  for (let i = frames.length - 1; i >= 0; i--) {
    if (states[i] !== hash(JSON.stringify(compiled.evaluate(frames[i])))) throw new Error("EVALUATION_FAILED: Frame evaluation depends on call order.");
  }
  return { frames, finite: true, repeatable: true };
}
async function writeDelivery(input) {
  const { scene, previous, assets, html } = input;
  const samples = sampleChecks(scene);
  const directory = resolve(input.out);
  const files = new Map([
    ["scene.json", Buffer.from(`${JSON.stringify(scene, null, 2)}
`)],
    ["preview.html", Buffer.from(html)],
    ...Object.entries(assets).map(([path2, data]) => [path2, Buffer.from(data, "base64")])
  ]);
  const report = {
    format: "motionflux-delivery/v1",
    sourceSceneHash: sceneHash(scene),
    lock: versionLock(scene),
    canvas: scene.canvas,
    fps: scene.fps,
    durationSeconds: scene.durationFrames * scene.fps.denominator / scene.fps.numerator,
    atoms: [...new Set(scene.clips.map((clip) => clip.recipe))].map((id2) => {
      const atom = getCapability(id2);
      return { id: id2, version: atom.version, writes: atom.writes };
    }),
    checks: {
      schema: "passed",
      assetsVerified: Object.keys(scene.assets).length,
      samples,
      visualReview: "not-performed",
      browserPlayback: "not-performed",
      assetLicenses: "not-verified"
    },
    videoDelivered: false,
    ...previous ? { revision: { previousSceneHash: sceneHash(previous), changes: changesBetween(previous, scene) } } : {},
    files: [...files].map(([path2, data]) => ({ path: path2, bytes: data.length, sha256: hash(data) }))
  };
  await mkdir(dirname(directory), { recursive: true });
  try {
    await mkdir(directory);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("OUTPUT_EXISTS: Choose a new delivery directory; earlier revisions are never overwritten.");
    throw error;
  }
  try {
    for (const [path2, data] of files) {
      const destination = join2(directory, path2);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, data);
    }
    await writeFile(join2(directory, "delivery.json"), `${JSON.stringify(report, null, 2)}
`);
  } catch (error) {
    await rm2(directory, { recursive: true, force: true });
    throw error;
  }
  return {
    directory,
    preview: join2(directory, "preview.html"),
    scene: join2(directory, "scene.json"),
    report: join2(directory, "delivery.json"),
    files: files.size + 1,
    changes: report.revision?.changes.length ?? 0,
    videoDelivered: false,
    visualReview: "not-performed"
  };
}

// packages/cli/src/breakdown.ts
var order = table.flatMap(([, ids]) => ids);
var colors = {
  "prop.move": "#67c8ff",
  "prop.opacity": "#ffa452",
  "timing.spring": "#c7a0ff",
  "choreo.stagger": "#60d9a8",
  "text.type": "#ffe06b",
  "transition.wipe": "#ff7eaf",
  "prop.scale": "#8f9dff",
  "text.count": "#bae568",
  "prop.draw": "#ff9587",
  "prop.crop": "#95dfdd"
};
var colorOf = (id2) => colors[id2] ?? `hsl(${(order.indexOf(id2) * 137.508 % 360).toFixed(3)} 75% 72%)`;
function actionTracks(actions) {
  const tracks = /* @__PURE__ */ new Map();
  for (const action of actions) {
    const entry = getCapability(action.atom);
    let track = tracks.get(action.atom);
    if (!track) {
      track = { symbol: entry.symbol, name: entry.title, color: colorOf(entry.id), blocks: [] };
      tracks.set(action.atom, track);
    }
    track.blocks.push({ name: action.name, from: action.from, to: action.to });
  }
  for (const track of tracks.values()) track.blocks.sort((a, b) => a.from - b.from || a.to - b.to);
  return [...tracks].sort(([a, first], [b, second]) => first.blocks[0].from - second.blocks[0].from || order.indexOf(a) - order.indexOf(b)).map(([, track]) => track);
}
function breakdownPlan(scene, options) {
  const actions = [];
  const compiled = compileScene(scene);
  const lag = new Map(scene.nodes.map((node) => [node.id, Math.max(...compiled.copies(node.id).map((copy) => copy.delay))]));
  const moving = (target) => scene.clips.filter((clip) => clip.target === target && getCapability(clip.recipe).time !== "static");
  for (const clip of scene.clips) {
    const entry = getCapability(clip.recipe);
    const arranged = ["layout", "order"].includes(entry.role) ? moving(clip.target) : [];
    for (const action of arranged.length ? arranged : [clip]) {
      const start = action.startFrame;
      const end = start + action.durationFrames;
      const name = `${clip.target} \xB7 ${entry.title} \xB7 ${clip.id}${action === clip ? "" : ` / ${action.id}`}`;
      actions.push({ atom: entry.id, name, from: start, to: Math.min(scene.durationFrames, end + lag.get(clip.target)) });
    }
  }
  return {
    width: options.width,
    ...options.title ? { title: options.title } : {},
    durationFrames: scene.durationFrames,
    fps: scene.fps.numerator / scene.fps.denominator,
    tracks: actionTracks(actions)
  };
}
function readVideoBreakdown(value) {
  const fail = (message) => {
    throw new Error(`INVALID_BREAKDOWN: ${message}`);
  };
  const data = value;
  if (!data || typeof data !== "object" || !data.source || typeof data.source !== "object") fail("Expected { source: { video, from, to }, tracks: [...] }.");
  const { video, from, to } = data.source;
  if (typeof video !== "string" || !video) fail("source.video must be a path to the video file, relative to the breakdown file.");
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from) fail("source.from and source.to are seconds in the source, with from < to.");
  if (to - from > 30) fail("A breakdown covers one passage; keep it to 30 s or less.");
  if (data.title !== void 0 && typeof data.title !== "string") fail("title must be text.");
  if (!Array.isArray(data.tracks) || !data.tracks.length) fail("tracks must list at least one atom.");
  data.tracks.forEach((track, i) => {
    if (!getCapability(String(track?.atom))) fail(`tracks[${i}].atom ${String(track?.atom)} is not an atom; use an ID from the catalog.`);
    if (track.name !== void 0 && (typeof track.name !== "string" || !track.name.trim())) fail(`tracks[${i}].name must be non-empty text describing the subject and action.`);
    if (!Array.isArray(track.spans) || !track.spans.length) fail(`tracks[${i}].spans must list [start, end] pairs in source seconds.`);
    track.spans.forEach((span, j) => {
      if (!Array.isArray(span) || span.length !== 2 || !span.every(Number.isFinite) || span[1] <= span[0]) fail(`tracks[${i}].spans[${j}] must be [start, end] with start < end.`);
      if (span[0] < from - 1e-6 || span[1] > to + 1e-6) fail(`tracks[${i}].spans[${j}] lies outside source.from\u2013source.to.`);
    });
  });
  return data;
}
function videoBreakdownPlan(breakdown, options) {
  const actions = breakdown.tracks.flatMap((track, trackIndex) => {
    const entry = getCapability(track.atom);
    return track.spans.map(([a, b], spanIndex) => {
      const first = (a - breakdown.source.from) * options.fps;
      const name = track.name ?? `${entry.title} \xB7 \u52A8\u4F5C ${trackIndex + 1}`;
      return {
        atom: entry.id,
        name: track.spans.length > 1 ? `${name} \xB7 ${spanIndex + 1}` : name,
        from: first,
        to: (b - breakdown.source.from) * options.fps
      };
    });
  });
  return {
    width: options.width,
    ...breakdown.title ? { title: breakdown.title } : {},
    durationFrames: options.frames,
    fps: options.fps,
    sourceStartSeconds: breakdown.source.from,
    tracks: actionTracks(actions)
  };
}

// packages/renderer-browser/src/breakdown.ts
var unitOf = (plan) => plan.width / 640;
var header = 46;
var blockHeight = 22;
var laneGap = 4;
var trackGap = 12;
var footer = 18;
function layout(plan) {
  let top = header;
  const tracks = plan.tracks.map((track) => {
    const ends = [];
    const blocks = [...track.blocks].sort((a, b) => a.from - b.from || a.to - b.to).map((block) => {
      let lane = ends.findIndex((end) => end <= block.from);
      if (lane < 0) lane = ends.length;
      ends[lane] = block.to;
      return { ...block, lane };
    });
    const height = Math.max(1, ends.length) * (blockHeight + laneGap) - laneGap;
    const result = { track, blocks, top, height };
    top += height + trackGap;
    return result;
  });
  return { tracks, height: top + footer };
}
function panelHeight(plan) {
  return Math.ceil(layout(plan).height * unitOf(plan));
}
function breakdownSize(plan, scene) {
  const sceneHeight = Math.round(scene.height * plan.width / scene.width);
  const height = sceneHeight + panelHeight(plan);
  return { width: plan.width + plan.width % 2, height: height + height % 2, sceneHeight };
}

// packages/cli/src/index.ts
import { spawn as spawn2, spawnSync as spawnSync2 } from "node:child_process";
var resourceRoot = join3(dirname2(fileURLToPath(import.meta.url)), "resources");
async function readScene(path2) {
  if (!path2) throw new Error("USAGE: Supply a scene JSON path.");
  const scene = JSON.parse(await readFile(resolve2(path2), "utf8"));
  assertScene(scene);
  return scene;
}
async function assetBytes(scene, scenePath) {
  const encoded = {};
  for (const asset of Object.values(scene.assets)) {
    const data = await readFile(resolve2(dirname2(scenePath), asset.src));
    if (createHash2("sha256").update(data).digest("hex") !== asset.sha256) throw new Error(`ASSET_HASH: ${asset.src} differs from the scene lock.`);
    encoded[asset.src] = data.toString("base64");
  }
  return encoded;
}
async function save(path2, data) {
  await mkdir2(dirname2(resolve2(path2)), { recursive: true });
  await writeFile2(resolve2(path2), data);
}
function parseFrames(list, total2) {
  if (list === void 0) return Array.from({ length: total2 }, (_, i) => i);
  const frames = list.split(",").flatMap((part) => {
    const range = part.trim().match(/^(\d+)(?:-(\d+))?$/u);
    if (!range) throw new Error(`USAGE: --frames expects whole frame numbers such as 0,30,60 or 0-90; got "${part}".`);
    const from = Number(range[1]);
    const to = Number(range[2] ?? range[1]);
    if (to < from) throw new Error(`USAGE: --frames range ${part} runs backwards.`);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });
  const outside = frames.find((frame) => frame >= total2);
  if (outside !== void 0) throw new Error(`USAGE: frame ${outside} is outside the scene; valid frames are 0\u2013${total2 - 1}.`);
  return frames;
}
var numeric = ["frame", "width", "height", "duration", "fps"];
var textual = ["out", "previous", "backend", "frames", "browser", "text", "color", "background", "title"];
function parseArgs(args) {
  const command = args.shift() ?? "help";
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const key = arg.slice(2);
    if (arg === "--json") continue;
    if (arg === "--transparent") {
      options.transparent = true;
      continue;
    }
    const isNumber = numeric.includes(key);
    if (arg.startsWith("--") && (isNumber || textual.includes(key))) {
      const value = args[++i];
      if (value === void 0 || value.startsWith("--")) throw new Error(`USAGE: ${arg} requires a value.`);
      if (isNumber) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) throw new Error(`USAGE: ${arg} requires a finite number.`);
        options[key] = parsed;
      } else options[key] = value;
    } else if (arg.startsWith("--")) throw new Error(`USAGE: Unknown option ${arg}.`);
    else positional.push(arg);
  }
  const supported = {
    help: [],
    search: [],
    describe: [],
    validate: [],
    sample: ["frame"],
    preview: ["out"],
    "export-html": ["out"],
    deliver: ["out", "previous"],
    scaffold: ["out", "width", "height", "duration", "fps", "text", "color", "background"],
    frames: ["out", "frames", "browser", "transparent"],
    render: ["out", "browser", "transparent"],
    breakdown: ["out", "browser", "title", "width", "fps"],
    doctor: ["backend", "browser"]
  };
  if (!supported[command]) throw new Error(`UNSUPPORTED_COMMAND: ${command}. Use help to see implemented commands.`);
  for (const key of Object.keys(options)) if (!supported[command].includes(key)) throw new Error(`USAGE: --${key} is not supported by ${command}.`);
  if (command !== "search" && positional.length > (["help", "doctor"].includes(command) ? 0 : 1)) throw new Error("USAGE: Too many positional arguments.");
  return { command, positional, ...options };
}
async function scaffold(id2, options) {
  const capability = getCapability(id2 ?? "");
  if (!capability) throw new Error(`UNKNOWN_CAPABILITY: ${id2 ?? "(missing id)"}. Use search.`);
  if (!options.out) throw new Error("USAGE: Supply --out <scene.json>.");
  if (options.text !== void 0 && previewKind(capability.id) !== "text") throw new Error(`USAGE: --text only applies to atoms whose example animates text; ${capability.id} does not.`);
  for (const key of ["color", "background"]) if (options[key] !== void 0 && !/^#[0-9a-fA-F]{6}$/u.test(options[key])) throw new Error(`USAGE: --${key} expects an opaque #RRGGBB colour.`);
  const scene = createExampleScene(capability.id);
  const width = options.width ?? 1280;
  const height = options.height ?? 720;
  const fps = options.fps ?? 30;
  const duration = options.duration ?? Math.round(scene.durationFrames * fps / 30);
  const space = Math.min(width / scene.canvas.width, height / scene.canvas.height);
  const time = duration / scene.durationFrames;
  const round = (value) => Math.round(value * 100) / 100;
  for (const node of scene.nodes) {
    node.position = [round((node.position[0] - scene.canvas.width / 2) * space + width / 2), round((node.position[1] - scene.canvas.height / 2) * space + height / 2)];
    if (node.type === "path") {
      node.points = node.points.map(([x, y]) => [round(x * space), round(y * space)]);
      node.strokeWidth = Math.max(0.1, round(node.strokeWidth * space));
    } else {
      node.fontSize = round(node.fontSize * space);
      node.lineHeight = round(node.lineHeight * space);
      if (options.text !== void 0 && node.id === "subject") {
        node.text = options.text.replaceAll("\\n", "\n");
        const lines = node.text.split("\n");
        const widest = Math.max(...lines.map((line) => [...line].reduce((sum, character) => sum + (character.codePointAt(0) > 11903 ? 1 : 0.55), 0)));
        node.position = [round(width / 2 - widest * node.fontSize / 2), round(height / 2 + node.fontSize * 0.35 - (lines.length - 1) * node.lineHeight / 2)];
      }
    }
    if (options.color && node.id === "subject") node.color = options.color;
  }
  for (const clip of scene.clips) {
    clip.startFrame = Math.round(clip.startFrame * time);
    clip.durationFrames = Math.max(1, Math.min(duration - clip.startFrame, Math.round(clip.durationFrames * time)));
    for (const [key, parameter] of Object.entries(getCapability(clip.recipe).params)) {
      if (parameter.type !== "number") continue;
      const factor = parameter.unit.startsWith("px") ? space : parameter.unit === "frame" ? time : 1;
      const scaled = Math.min(parameter.maximum, Math.max(parameter.minimum, Number(clip.params[key]) * factor));
      clip.params[key] = parameter.integer ? Math.round(scaled) : round(scaled);
    }
  }
  scene.canvas = { width, height, background: options.background ?? scene.canvas.background };
  scene.fps = { numerator: fps, denominator: 1 };
  scene.durationFrames = duration;
  assertScene(scene);
  const out = resolve2(options.out);
  await save(out, `${JSON.stringify(scene, null, 2)}
`);
  return {
    path: out,
    atom: capability.id,
    title: capability.title,
    canvas: scene.canvas,
    fps: scene.fps,
    durationFrames: duration,
    subject: scene.nodes.find((node) => node.id === "subject"),
    clip: scene.clips[0],
    staticNodes: scene.nodes.filter((node) => node.id !== "subject").map((node) => node.id),
    fontCopied: Object.keys(scene.assets).length > 0
  };
}
async function renderBreakdown(scene, html, plan, args) {
  const format = extname(args.out).slice(1).toLowerCase();
  if (!["gif", "mp4", "webm"].includes(format)) throw new Error("USAGE: breakdown writes .gif, .mp4 or .webm.");
  const sceneFps = scene.fps.numerator / scene.fps.denominator;
  const fps = args.fps ?? (format === "gif" ? 25 : sceneFps);
  if (!(fps >= 1 && fps <= 60)) throw new Error("USAGE: --fps must be 1\u201360.");
  if (format === "gif" && !Number.isInteger(100 / fps)) throw new Error("USAGE: GIF frame delays are whole hundredths of a second; use --fps 10, 20, 25 or 50.");
  if (!toolVersion(ffmpegPath())) throw new Error("FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH.");
  const browser = await findBrowser(args.browser);
  if (!browser) throw new Error("BROWSER_MISSING: breakdown draws in a Chrome, Chromium or Edge you already have. None was found; pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.");
  const seconds = scene.durationFrames / sceneFps;
  const count = Math.max(1, Math.floor(seconds * fps + 1e-9));
  const frames = Array.from({ length: count }, (_, k) => k * sceneFps / fps);
  const size = breakdownSize(plan, scene.canvas);
  const work = await mkdtemp2(join3(tmpdir2(), "motionflux-breakdown-"));
  const page = join3(work, "breakdown.html");
  const out = resolve2(args.out);
  try {
    await writeFile2(page, html);
    await mkdir2(dirname2(out), { recursive: true });
    await encodeVideo(out, format, false, { numerator: fps, denominator: 1 }, (write) => captureFrames(page, frames, browser, false, (_frame, png) => write(png)));
  } finally {
    await rm3(work, { recursive: true, force: true });
  }
  const written = probeVideo(out);
  const expectedSeconds = count / fps;
  return {
    path: out,
    type: format === "gif" ? "image/gif" : `video/${format}`,
    bytes: (await stat(out)).size,
    fps,
    expected: { frames: count, durationSeconds: expectedSeconds, width: size.width, height: size.height },
    written: written ?? "ffprobe not available; the file was not read back",
    verified: Boolean(written && written.frames === count && written.width === size.width && written.height === size.height && Math.abs(written.durationSeconds - expectedSeconds) <= 1 / fps + 0.01),
    tracks: plan.tracks.map((track) => ({
      atom: track.symbol,
      name: track.name,
      seconds: track.blocks.map(({ from, to }) => [Math.round(from / sceneFps * 100) / 100, Math.round(to / sceneFps * 100) / 100]),
      blocks: track.blocks.map(({ name, from, to }) => ({ name, seconds: [Math.round(from / sceneFps * 100) / 100, Math.round(to / sceneFps * 100) / 100] }))
    })),
    audio: false,
    videoDelivered: true,
    browser,
    lock: versionLock(scene)
  };
}
async function renderVideoBreakdown(file, args) {
  const breakdown = readVideoBreakdown(JSON.parse(await readFile(file, "utf8")));
  if (args.title) breakdown.title = args.title;
  const format = extname(args.out ?? "").slice(1).toLowerCase();
  if (!args.out || !["gif", "mp4", "webm"].includes(format)) throw new Error("USAGE: breakdown writes --out <file>.gif, .mp4 or .webm.");
  const fps = args.fps ?? (format === "gif" ? 25 : 30);
  if (!(fps >= 1 && fps <= 60)) throw new Error("USAGE: --fps must be 1\u201360.");
  if (format === "gif" && !Number.isInteger(100 / fps)) throw new Error("USAGE: GIF frame delays are whole hundredths of a second; use --fps 10, 20, 25 or 50.");
  if (!toolVersion(ffmpegPath())) throw new Error("FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH.");
  const video = resolve2(dirname2(file), breakdown.source.video);
  await stat(video).catch(() => {
    throw new Error(`SOURCE_MISSING: ${video} does not exist. source.video is relative to the breakdown file.`);
  });
  const probe = ffmpegPath().replace(/ffmpeg(\.exe)?$/u, "ffprobe$1");
  const probed = spawnSync2(probe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", video], { encoding: "utf8" });
  if (probed.status !== 0) throw new Error(`SOURCE_UNREADABLE: ffprobe could not read ${video}.`);
  const meta = JSON.parse(probed.stdout);
  const source = meta.streams[0];
  const length = Number(meta.format.duration);
  if (!source) throw new Error(`SOURCE_UNREADABLE: ${video} has no video stream.`);
  if (breakdown.source.to > length + 0.05) throw new Error(`USAGE: source.to ${breakdown.source.to} s is past the end of the video (${length.toFixed(2)} s).`);
  const even = (value) => Math.round(value / 2) * 2;
  const width = even(args.width ?? Math.min(format === "gif" ? 640 : 960, source.width));
  if (width < 160 || width > 3840) throw new Error("USAGE: --width must be 160\u20133840 px.");
  const pictureHeight = even(source.height * width / source.width);
  const seconds = breakdown.source.to - breakdown.source.from;
  const count = Math.max(1, Math.floor(seconds * fps + 1e-9));
  const plan = videoBreakdownPlan(breakdown, { width, fps, frames: count });
  const panel = panelHeight(plan) + panelHeight(plan) % 2;
  const browser = await findBrowser(args.browser);
  if (!browser) throw new Error("BROWSER_MISSING: breakdown draws the timeline in a Chrome, Chromium or Edge you already have. None was found; pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.");
  const work = await mkdtemp2(join3(tmpdir2(), "motionflux-breakdown-"));
  const out = resolve2(args.out);
  try {
    const script = await readFile(join3(resourceRoot, "breakdown-panel.js"), "utf8");
    const page = join3(work, "panel.html");
    await writeFile2(page, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0f1114"><canvas></canvas><script id="plan-data" type="application/json">${JSON.stringify(plan).replace(/</gu, "\\u003c")}</script><script>${script.replace(/<\/script/giu, "<\\/script")}</script>`);
    await mkdir2(join3(work, "panel"));
    await captureFrames(page, Array.from({ length: count }, (_, i) => i), browser, false, (frame, png) => writeFile2(join3(work, "panel", `${String(frame).padStart(6, "0")}.png`), png));
    await mkdir2(dirname2(out), { recursive: true });
    const stack = `[0:v]fps=${fps},scale=${width}:${pictureHeight}:flags=lanczos,setsar=1[clip];[clip][1:v]vstack=inputs=2`;
    const encode = format === "gif" ? ["-filter_complex", `${stack},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`, "-loop", "0"] : format === "mp4" ? ["-filter_complex", `${stack},format=yuv420p`, "-c:v", "libx264", "-crf", "18", "-movflags", "+faststart"] : ["-filter_complex", `${stack},format=yuv420p`, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "28"];
    const result = await new Promise((done) => {
      const child = spawn2(ffmpegPath(), [
        "-y",
        "-v",
        "error",
        "-ss",
        String(breakdown.source.from),
        "-t",
        String(seconds),
        "-i",
        video,
        "-framerate",
        String(fps),
        "-i",
        join3(work, "panel", "%06d.png"),
        ...encode,
        "-an",
        "-frames:v",
        String(count),
        out
      ], { stdio: ["ignore", "ignore", "pipe"] });
      let log = "";
      child.stderr.on("data", (chunk) => {
        log += chunk;
      });
      child.once("close", (code) => done({ code, log }));
    });
    if (result.code !== 0) throw new Error(`ENCODE_FAILED: ffmpeg exited with code ${result.code}. ${result.log.trim().split("\n").slice(-3).join(" ")}`);
  } finally {
    await rm3(work, { recursive: true, force: true });
  }
  const written = probeVideo(out);
  const height = pictureHeight + panel;
  return {
    path: out,
    type: format === "gif" ? "image/gif" : `video/${format}`,
    bytes: (await stat(out)).size,
    fps,
    source: { video, from: breakdown.source.from, to: breakdown.source.to, width: source.width, height: source.height },
    expected: { frames: count, durationSeconds: count / fps, width, height },
    written: written ?? "ffprobe not available; the file was not read back",
    verified: Boolean(written && written.frames === count && written.width === width && written.height === height && Math.abs(written.durationSeconds - count / fps) <= 1 / fps + 0.01),
    tracks: plan.tracks.map((track) => ({
      atom: track.symbol,
      name: track.name,
      seconds: track.blocks.map(({ from, to }) => [Math.round((breakdown.source.from + from / fps) * 100) / 100, Math.round((breakdown.source.from + to / fps) * 100) / 100]),
      blocks: track.blocks.map(({ name, from, to }) => ({ name, seconds: [Math.round((breakdown.source.from + from / fps) * 100) / 100, Math.round((breakdown.source.from + to / fps) * 100) / 100] }))
    })),
    audio: false,
    videoDelivered: true,
    browser
  };
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const path2 = args.positional[0];
  switch (args.command) {
    case "help":
      return { version: ENGINE_VERSION, commands: [
        "search <query> --json",
        "describe <id> --json",
        "scaffold <id> --out scene.json [--width --height --duration --fps --text --color --background]",
        "validate <scene.json>",
        "sample <scene.json> --frame 30",
        "preview <scene.json> --out preview.html",
        "deliver <scene.json> --out <new-directory> [--previous <scene.json>]",
        "export-html <scene.json> --out scene.html",
        "frames <scene.json> --out <dir> [--frames 0,30,60] [--transparent]",
        "render <scene.json> --out clip.mp4|.mov|.webm [--transparent]",
        'breakdown <scene.json | breakdown.json> --out breakdown.gif|.mp4|.webm [--title "\u2026"] [--width 960] [--fps 25]  (breakdown.json cuts a source video and adds the atom timeline)',
        "doctor --backend js|browser|ffmpeg"
      ], delivery: "HTML preview, PNG frames, and video without audio: H.264 MP4 (opaque), ProRes 4444 MOV or VP9 WebM (either can carry alpha with --transparent). breakdown adds a timeline of the atoms under the picture and also writes GIF. frames, render and breakdown need a Chromium-family browser; render and breakdown also need ffmpeg." };
    case "search":
      return { capabilities: searchCapabilities(args.positional.join(" ")) };
    case "scaffold":
      return scaffold(path2, args);
    case "describe": {
      const capability = getCapability(path2 ?? "");
      if (!capability) throw new Error(`UNKNOWN_CAPABILITY: ${path2 ?? "(missing id)"}. Use search.`);
      return capability;
    }
    case "doctor": {
      const backend = args.backend ?? "js";
      if (backend === "browser") {
        const browser = await findBrowser(args.browser);
        return browser ? { backend, available: true, path: browser, version: toolVersion(browser, "--version") ?? "unknown" } : { backend, available: false, reason: "No Chrome, Chromium or Edge was found. Install one, or pass --browser <path> or set MOTIONFLUX_BROWSER_PATH." };
      }
      if (backend === "ffmpeg") {
        const version = toolVersion(ffmpegPath());
        return version ? { backend, available: true, version, probe: toolVersion(ffmpegPath().replace(/ffmpeg(\.exe)?$/u, "ffprobe$1")) !== void 0 } : { backend, available: false, reason: "ffmpeg was not found on PATH. Install it or set MOTIONFLUX_FFMPEG_PATH. The frames command still works without it." };
      }
      if (backend !== "js") return { backend, available: false, reason: "Adapter not implemented; no optional host tools were required or invoked." };
      return {
        backend,
        available: Number(process.versions.node.split(".")[0]) >= 22,
        node: process.version,
        version: ENGINE_VERSION,
        capabilities: capabilities.length,
        browser: "Open generated HTML in a browser with Canvas 2D, FontFace and Web Crypto support."
      };
    }
    default: {
      if (args.command === "breakdown" && path2) {
        const raw = JSON.parse(await readFile(resolve2(path2), "utf8"));
        if (raw && typeof raw === "object" && "source" in raw) return renderVideoBreakdown(resolve2(path2), args);
      }
      const scene = await readScene(path2);
      if (args.command === "sample") return { state: compileScene(scene).evaluate(args.frame ?? 0), lock: versionLock(scene) };
      const assets = await assetBytes(scene, resolve2(path2));
      if (args.command === "validate") return { valid: true, assetsVerified: Object.keys(assets).length, lock: versionLock(scene) };
      if (!args.out) throw new Error("USAGE: Supply --out <output path>.");
      const [runtime, license] = await Promise.all([readFile(join3(resourceRoot, "standalone.js"), "utf8"), readFile(join3(resourceRoot, "OFL.txt"), "utf8")]);
      const plan = args.command === "breakdown" ? breakdownPlan(scene, { width: Math.round(args.width ?? Math.min(960, scene.canvas.width)), ...args.title ? { title: args.title } : {} }) : void 0;
      if (plan && (plan.width < 160 || plan.width > 3840)) throw new Error("USAGE: --width must be 160\u20133840 px.");
      const html = createStandaloneHtml(scene, runtime, assets, args.command === "deliver" ? "" : license, plan ? { breakdown: plan } : {});
      if (args.command === "deliver") {
        const previous = args.previous ? await readScene(args.previous) : void 0;
        return writeDelivery({ scene, ...previous ? { previous } : {}, assets, html, out: args.out });
      }
      if (args.command === "breakdown") return renderBreakdown(scene, html, plan, args);
      if (args.command === "frames" || args.command === "render") {
        const size = { width: scene.canvas.width, height: scene.canvas.height };
        const transparent = Boolean(args.transparent);
        const format = extname(args.out).slice(1).toLowerCase();
        if (args.command === "render") {
          if (!(format in videoFormats) || format === "gif") throw new Error("USAGE: render picks the format from --out: .mp4 (H.264), .mov (ProRes 4444) or .webm (VP9). GIF is written by breakdown.");
          if (transparent && !videoFormats[format].alpha) throw new Error("ALPHA_UNSUPPORTED: H.264 MP4 cannot carry transparency. Use .mov or .webm with --transparent, or the frames command for PNGs.");
          if (videoFormats[format].evenSize && (size.width % 2 || size.height % 2)) throw new Error(`VIDEO_SIZE: .${format} needs even dimensions; the canvas is ${size.width}\xD7${size.height}.`);
          if (!toolVersion(ffmpegPath())) throw new Error("FFMPEG_MISSING: ffmpeg was not found. Install it or set MOTIONFLUX_FFMPEG_PATH; use the frames command for a PNG sequence instead.");
        }
        const browser = await findBrowser(args.browser);
        if (!browser) throw new Error("BROWSER_MISSING: frames and render draw in a Chrome, Chromium or Edge you already have. None was found; pass --browser <path> or set MOTIONFLUX_BROWSER_PATH.");
        const work = await mkdtemp2(join3(tmpdir2(), "motionflux-render-"));
        const page = join3(work, "scene.html");
        try {
          await writeFile2(page, html);
          const out = resolve2(args.out);
          if (args.command === "frames") {
            const frames = parseFrames(args.frames, scene.durationFrames);
            const files = [];
            await mkdir2(out, { recursive: true });
            await captureFrames(page, frames, browser, transparent, async (frame, png) => {
              const file = join3(out, `frame-${String(frame).padStart(6, "0")}.png`);
              await writeFile2(file, png);
              files.push(file);
            });
            return { directory: out, type: "png-sequence", pattern: "frame-%06d.png", frames: files.length, files: files.length <= 24 ? files : [files[0], "\u2026", files.at(-1)], ...size, fps: scene.fps, alpha: transparent, videoDelivered: false, browser, lock: versionLock(scene) };
          }
          await mkdir2(dirname2(out), { recursive: true });
          const all = parseFrames(void 0, scene.durationFrames);
          await encodeVideo(out, format, transparent, scene.fps, (write) => captureFrames(page, all, browser, transparent, (_frame, png) => write(png)));
          const written = probeVideo(out);
          const expectedSeconds = all.length * scene.fps.denominator / scene.fps.numerator;
          return {
            path: out,
            type: `video/${format === "mov" ? "quicktime" : format}`,
            bytes: (await stat(out)).size,
            expected: { frames: all.length, durationSeconds: expectedSeconds, ...size, alpha: transparent },
            written: written ?? "ffprobe not available; the file was not read back",
            verified: Boolean(written && written.frames === all.length && written.width === size.width && written.height === size.height && Math.abs(written.durationSeconds - expectedSeconds) < 0.05 && written.alpha === transparent),
            audio: false,
            videoDelivered: true,
            browser,
            lock: versionLock(scene)
          };
        } finally {
          await rm3(work, { recursive: true, force: true });
        }
      }
      await save(args.out, html);
      return { path: resolve2(args.out), type: "standalone-html", embeddedAssets: Object.keys(assets).length, videoDelivered: false, lock: versionLock(scene) };
    }
  }
}
main().then((result) => process.stdout.write(`${JSON.stringify({ ok: true, result }, null, 2)}
`)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof SceneValidationError ? error.code : error && typeof error === "object" && "code" in error ? String(error.code) : message.match(/^([A-Z_]+):/u)?.[1] ?? "COMMAND_FAILED";
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code, message, ...error instanceof SceneValidationError ? { issues: error.issues } : {} } }, null, 2)}
`);
  process.exitCode = 1;
});
