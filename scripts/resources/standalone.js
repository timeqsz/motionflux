"use strict";
(() => {
  // packages/catalog/src/index.ts
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
  function check(value, schema, path, issues) {
    const issue = (message) => {
      issues.push({ path, code: "SCHEMA", message });
    };
    if (schema.oneOf) {
      const results = schema.oneOf.map((variant) => {
        const errors = [];
        check(value, variant, path, errors);
        return errors;
      });
      if (results.filter((errors) => !errors.length).length === 1) return;
      const object2 = value && typeof value === "object" ? value : {};
      const selected = schema.oneOf.findIndex((variant) => Object.entries(variant.properties ?? {}).some(([key, field]) => field.const !== void 0 && object2[key] === field.const));
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
      for (const key of schema.required ?? []) if (!Object.hasOwn(record, key)) issues.push({ path: `${path}.${key}`, code: "REQUIRED", message: "Required field is missing." });
      for (const [key, child] of Object.entries(record)) {
        const field = Object.hasOwn(schema.properties ?? {}, key) ? schema.properties[key] : void 0;
        if (field) check(child, field, `${path}.${key}`, issues);
        else if (schema.additionalProperties === false) issues.push({ path: `${path}.${key}`, code: "UNKNOWN_FIELD", message: "Unsupported field; remove it or use a supported schema version." });
        else if (typeof schema.additionalProperties === "object") check(child, schema.additionalProperties, `${path}.${key}`, issues);
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
      if (schema.items) value.forEach((child, i) => check(child, schema.items, `${path}[${i}]`, issues));
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
    const add = (path, code, message) => issues.push({ path, code, message });
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
      const path = `$.clips[${i}]`;
      if (clipIds.has(clip.id)) add(`${path}.id`, "DUPLICATE_ID", "Clip ID must be unique.");
      clipIds.add(clip.id);
      const node = scene.nodes.find((node2) => node2.id === clip.target);
      const capability = getCapability(clip.recipe);
      if (!node) add(`${path}.target`, "MISSING_TARGET", "Reference an existing node ID.");
      else if (!capability.targets.includes(node.type)) add(`${path}.target`, "TARGET_TYPE", `${clip.recipe} cannot target ${node.type}.`);
      if (clip.startFrame + clip.durationFrames > scene.durationFrames) add(`${path}.durationFrames`, "CLIP_BOUNDS", "Clip must fit inside the scene.");
      if (capability.role === "property") for (const property of capability.writes) {
        const key = `${clip.target}:${property}`;
        const span = { start: clip.startFrame, end: clip.startFrame + clip.durationFrames };
        const spans = writers.get(key) ?? [];
        if (spans.some((other) => span.start < other.end && other.start < span.end)) add(path, "PROPERTY_CONFLICT", `Clips overlap on ${key}. Clips that write the same property must not share any frame; let one end before the next starts.`);
        writers.set(key, [...spans, span]);
      }
      if (node?.type === "text" && clip.recipe === "text.lines" && (node.text.split("\n").length - 1) * Number(clip.params.stepFrames) >= clip.durationFrames)
        add(`${path}.params.stepFrames`, "STAGGER_BOUNDS", "Leave positive animation time for every line within the clip.");
      if (node?.type === "text" && clip.recipe === "text.chars" && ([...node.text].filter((character) => character.trim()).length - 1) * Number(clip.params.stepFrames) >= clip.durationFrames)
        add(`${path}.params.stepFrames`, "STAGGER_BOUNDS", "Leave positive animation time for every character within the clip.");
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
  function place(path, { x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = scaleX, ox = 0, oy = 0 }) {
    const cos = Math.cos(rotation * Math.PI / 180);
    const sin = Math.sin(rotation * Math.PI / 180);
    return path.map(([px, py]) => {
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
    for (const path of paths) for (const [x, y] of path) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (minX === Infinity) minX = minY = maxX = maxY = 0;
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }
  var ring = (path, closed) => closed && path.length > 1 ? [...path, path[0]] : path;
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
  function slice(path, closed, start, end) {
    const points = ring(path, closed);
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
  function resample(path, closed, count) {
    const points = ring(path, closed);
    const cumulative = lengths(points);
    const total2 = cumulative.at(-1) ?? 0;
    if (points.length < 2 || total2 === 0) return path.map((point2) => [...point2]);
    return Array.from({ length: count }, (_, i) => locate(points, cumulative, (closed ? i / count : i / Math.max(1, count - 1)) * total2).point);
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
  function emit(c, shapes, filters = [], blend = "normal") {
    (c.state.layers ??= []).push({ shapes, filters, blend });
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
    const box2 = bounds([outline]);
    const radius = Math.max(box2.width, box2.height) / 2;
    const samples = 96;
    const source = resample(outline, true, samples);
    const goal = {
      circle: circle(radius, box2.cx, box2.cy),
      triangle: polygon(radius * 1.15, 3, -90, box2.cx, box2.cy),
      square: polygon(radius * 1.2, 4, -45, box2.cx, box2.cy),
      star: polystar(5, radius * 1.15, 0.45).map(([x, y]) => [x + box2.cx, y + box2.cy])
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
  function rank(slot, slots, order) {
    const middle = (slots - 1) / 2;
    return order === "reverse" ? slots - 1 - slot : order === "center" ? Math.abs(slot - middle) : order === "edges" ? middle - Math.abs(slot - middle) : slot;
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
    const box2 = bounds([outline]);
    const pad = strokeOf(c);
    const corner = (i, j) => {
      const jitter = i === 0 || j === 0 || i === count || j === count ? 0 : 0.6;
      return [
        box2.minX - pad + (i + (rand(c.seed, i, j, 0) - 0.5) * jitter) / count * (box2.width + 2 * pad),
        box2.minY - pad + (j + (rand(c.seed, i, j, 1) - 0.5) * jitter) / count * (box2.height + 2 * pad)
      ];
    };
    const far = Math.hypot(box2.width, box2.height) / 2 + pad || 1;
    const shapes = [];
    for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) {
      [[corner(i, j), corner(i + 1, j), corner(i + 1, j + 1)], [corner(i, j), corner(i + 1, j + 1), corner(i, j + 1)]].forEach((triangle, half) => {
        const centre = [(triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3, (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3];
        const away = [centre[0] - box2.cx, centre[1] - box2.cy];
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
  function loopTiming(scene) {
    const start = scene.clips.length ? Math.min(...scene.clips.map((clip) => clip.startFrame)) : 0;
    const end = scene.durationFrames;
    const mode2 = canContinueScene(scene) ? "continuous" : "restart";
    const transitionFrames = mode2 === "continuous" ? 0 : Math.min((end - start) * 0.2, scene.fps.numerator / scene.fps.denominator * 0.2);
    return { start, end, mode: mode2, transitionFrames, period: end - start + transitionFrames };
  }
  var wrap = (value, period) => (value % period + period) % period;
  function loopFrame(timing2, elapsed) {
    return timing2.start + Math.min(wrap(elapsed, timing2.period), timing2.end - timing2.start);
  }
  function loopBlend(timing2, elapsed) {
    if (!timing2.transitionFrames) return 0;
    const t = Math.max(0, (wrap(elapsed, timing2.period) - (timing2.end - timing2.start)) / timing2.transitionFrames);
    return t * t * (3 - 2 * t);
  }
  function loopElapsed(timing2, frame, previous = 0) {
    if (Math.abs(loopFrame(timing2, previous) - frame) < 1e-7) return previous;
    if (timing2.mode === "continuous" && frame === timing2.end && previous > 0 && Math.abs(wrap(previous, timing2.period)) < 1e-7) return previous;
    return Math.floor(Math.max(0, previous) / timing2.period) * timing2.period + Math.max(0, Math.min(timing2.end - timing2.start, frame - timing2.start));
  }

  // packages/core/src/raster.ts
  function box(src, width, height, radius, horizontal) {
    if (radius < 1) return src;
    const out = new Uint8ClampedArray(src.length);
    const lines = horizontal ? height : width;
    const length = horizontal ? width : height;
    const stride = horizontal ? 1 : width;
    const window2 = radius * 2 + 1;
    for (let line = 0; line < lines; line++) {
      const start = horizontal ? line * width : line;
      let sum = 0;
      for (let i = 0; i <= Math.min(radius, length - 1); i++) sum += src[start + i * stride];
      for (let i = 0; i < length; i++) {
        out[start + i * stride] = sum / window2;
        const enter = i + radius + 1;
        const leave = i - radius;
        if (enter < length) sum += src[start + enter * stride];
        if (leave >= 0) sum -= src[start + leave * stride];
      }
    }
    return out;
  }
  function blur(src, width, height, radius) {
    let out = src;
    for (let pass = 0; pass < 3; pass++) {
      out = box(out, width, height, Math.round(radius), true);
      out = box(out, width, height, Math.round(radius), false);
    }
    return out === src ? src.slice() : out;
  }
  function filterReach(filter2, pixelScale = 1) {
    const radius = filter2.radius * pixelScale;
    switch (filter2.type) {
      case "blur":
      case "glow":
        return 3 * Math.round(radius);
      case "directional":
        return Math.ceil(radius / 2) + 1;
      case "glitch":
      case "split":
        return Math.ceil(radius);
      case "grain":
      case "dissolve":
        return 0;
    }
  }
  function applyFilter(mask, filter2, pixelScale = 1) {
    const { data: src, width, height } = mask;
    const k = pixelScale;
    const radius = filter2.radius * k;
    const left = mask.x ?? 0;
    const top = mask.y ?? 0;
    switch (filter2.type) {
      case "blur":
        return blur(src, width, height, radius);
      case "glow": {
        const soft = blur(src, width, height, radius);
        for (let i = 0; i < soft.length; i++) soft[i] = src[i] + soft[i] * filter2.amount;
        return soft;
      }
      case "directional": {
        const steps = Math.max(1, Math.ceil(radius));
        const angle = filter2.angle * Math.PI / 180;
        const dx = Math.cos(angle) * radius / steps;
        const dy = Math.sin(angle) * radius / steps;
        const out = new Uint8ClampedArray(src.length);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          let sum = 0;
          for (let s = 0; s <= steps; s++) {
            const sx = Math.round(x + (s - steps / 2) * dx);
            const sy = Math.round(y + (s - steps / 2) * dy);
            if (sx >= 0 && sy >= 0 && sx < width && sy < height) sum += src[sy * width + sx];
          }
          out[y * width + x] = sum / (steps + 1);
        }
        return out;
      }
      case "grain": {
        const out = new Uint8ClampedArray(src.length);
        const cell = Math.max(1, filter2.scale * k);
        for (let i = 0; i < src.length; i++) if (src[i]) out[i] = src[i] * (1 - filter2.amount * rand(filter2.seed, Math.floor((i % width + left) / cell), Math.floor((Math.floor(i / width) + top) / cell), filter2.phase));
        return out;
      }
      case "dissolve": {
        const out = new Uint8ClampedArray(src.length);
        const cell = Math.max(1, filter2.scale * k);
        for (let i = 0; i < src.length; i++) if (src[i] && rand(filter2.seed, Math.floor((i % width + left) / cell), Math.floor((Math.floor(i / width) + top) / cell), 7) < filter2.amount) out[i] = src[i];
        return out;
      }
      case "glitch": {
        const out = new Uint8ClampedArray(src.length);
        const band = Math.max(1, filter2.scale * k);
        for (let y = 0; y < height; y++) {
          const index = Math.floor((y + top) / band);
          const shift2 = rand(filter2.seed, index, filter2.phase, 1) < filter2.amount ? Math.round((rand(filter2.seed, index, filter2.phase, 2) - 0.5) * 2 * radius) : 0;
          for (let x = 0; x < width; x++) {
            const from = x - shift2;
            out[y * width + x] = from >= 0 && from < width ? src[y * width + from] : 0;
          }
        }
        return out;
      }
      case "split":
        return src.slice();
    }
  }

  // packages/core/src/index.ts
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

  // packages/renderer-browser/src/draw.ts
  var red = [255, 51, 85];
  var cyan = [34, 211, 238];
  function trace(context, paths, closed) {
    context.beginPath();
    for (const path of paths) {
      if (path.length < 2) continue;
      context.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) context.lineTo(path[i][0], path[i][1]);
      if (closed) context.closePath();
    }
  }
  function drawShapes(context, shapes, alpha) {
    for (const shape2 of shapes) {
      context.save();
      if (shape2.clip) {
        trace(context, shape2.clip, true);
        context.clip();
      }
      context.globalAlpha = alpha * shape2.opacity;
      trace(context, shape2.paths, shape2.closed);
      if (shape2.fill) context.fill();
      else {
        context.lineWidth = shape2.strokeWidth;
        context.stroke();
      }
      context.restore();
    }
  }
  function drawLines(context, lines, alpha) {
    for (const line of lines) {
      if (!line.glyphs) {
        context.globalAlpha = alpha * line.opacity;
        context.fillText(line.text, 0, line.y);
        continue;
      }
      let prefix = "";
      [...line.text].forEach((character, i) => {
        const glyph = line.glyphs[i] ?? { dx: 0, dy: 0, opacity: 1, scale: 1 };
        const x = context.measureText(prefix).width;
        prefix += character;
        if (glyph.opacity <= 0 || glyph.scale <= 0) return;
        context.save();
        context.globalAlpha = alpha * line.opacity * glyph.opacity;
        context.translate(x + glyph.dx, line.y + glyph.dy);
        context.scale(glyph.scale, glyph.scale);
        context.fillText(character, 0, 0);
        context.restore();
      });
    }
  }
  function measure(context, subject) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const layer of subject.layers ?? []) for (const shape2 of layer.shapes) {
      const pad = shape2.fill ? 0 : shape2.strokeWidth / 2;
      for (const path of shape2.paths) for (const [x, y] of path) {
        minX = Math.min(minX, x - pad);
        maxX = Math.max(maxX, x + pad);
        minY = Math.min(minY, y - pad);
        maxY = Math.max(maxY, y + pad);
      }
    }
    for (const line of subject.lines ?? []) {
      if (!line.text) continue;
      const metrics = context.measureText(line.text);
      minX = Math.min(minX, -metrics.actualBoundingBoxLeft);
      maxX = Math.max(maxX, metrics.actualBoundingBoxRight);
      minY = Math.min(minY, line.y - metrics.actualBoundingBoxAscent);
      maxY = Math.max(maxY, line.y + metrics.actualBoundingBoxDescent);
    }
    if (minX === Infinity) return { minX: 0, minY: 0, width: 0, height: 0 };
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }
  function polygonOf(region, box2) {
    const { minX, minY, width, height } = box2;
    const cx = minX + width / 2;
    const cy = minY + height / 2;
    if (region.kind === "box") return [[minX, minY], [minX + width, minY], [minX + width, minY + height], [minX, minY + height]];
    if (region.kind === "inset") {
      const l = minX + region.left * width;
      const r = minX + width * (1 - region.right);
      const t = minY + region.top * height;
      const b2 = minY + height * (1 - region.bottom);
      return r > l && b2 > t ? [[l, t], [r, t], [r, b2], [l, b2]] : [];
    }
    if (region.kind === "circle") {
      const x = minX + region.cx * width;
      const y = minY + region.cy * height;
      const far2 = Math.max(...[[minX, minY], [minX + width, minY], [minX, minY + height], [minX + width, minY + height]].map(([px, py]) => Math.hypot(px - x, py - y)));
      const radius = region.r * (far2 + 1);
      return Array.from({ length: 72 }, (_, i) => [x + radius * Math.cos(i / 72 * Math.PI * 2), y + radius * Math.sin(i / 72 * Math.PI * 2)]);
    }
    const angle = region.angle * Math.PI / 180;
    const d = [Math.cos(angle), Math.sin(angle)];
    const n = [-d[1], d[0]];
    const half = (Math.abs(width * d[0]) + Math.abs(height * d[1])) / 2;
    const far = Math.hypot(width, height) + 10;
    const at = (ratio) => [cx + d[0] * (ratio * 2 - 1) * half, cy + d[1] * (ratio * 2 - 1) * half];
    const [from, to] = region.kind === "half" ? [-far / Math.max(half, 1e-6), region.at] : [region.from, region.to];
    const a = at(from);
    const b = at(to);
    return [[a[0] + n[0] * far, a[1] + n[1] * far], [b[0] + n[0] * far, b[1] + n[1] * far], [b[0] - n[0] * far, b[1] - n[1] * far], [a[0] - n[0] * far, a[1] - n[1] * far]];
  }
  function body(context, subject, alpha) {
    const paint = (strength) => {
      for (const layer of subject.layers ?? []) drawShapes(context, layer.shapes, strength);
      if (subject.lines) drawLines(context, subject.lines, strength);
    };
    if (!subject.pieces) {
      paint(alpha);
      return;
    }
    const box2 = measure(context, subject);
    for (const piece of subject.pieces) {
      context.save();
      context.beginPath();
      for (const region of piece.regions) {
        const polygon2 = polygonOf(region, box2);
        if (polygon2.length) {
          context.moveTo(...polygon2[0]);
          polygon2.slice(1).forEach((point2) => context.lineTo(...point2));
          context.closePath();
        }
      }
      context.clip();
      context.translate(piece.offset[0] + (piece.shift?.[0] ?? 0) * box2.width, piece.offset[1] + (piece.shift?.[1] ?? 0) * box2.height);
      paint(alpha * piece.opacity);
      context.restore();
    }
  }
  var buffers = /* @__PURE__ */ new Map();
  function buffer(width, height) {
    const key = `${width}x${height}`;
    let entry = buffers.get(key);
    if (!entry) {
      const canvas = typeof OffscreenCanvas === "undefined" ? Object.assign(document.createElement("canvas"), { width, height }) : new OffscreenCanvas(width, height);
      entry = { canvas, context: canvas.getContext("2d", { willReadFrequently: true }) };
      buffers.set(key, entry);
    }
    return entry;
  }
  var rgb = (color3) => [1, 3, 5].map((start) => parseInt(color3.slice(start, start + 2), 16));
  function drawSubject(context, subject, pixelScale = 1) {
    const stretch = subject.stretch ?? [1, 1];
    if (Math.abs(subject.scale * stretch[0] * stretch[1]) < 1e-9 || subject.opacity <= 0) return;
    const place2 = (target) => {
      target.translate(...subject.position);
      target.rotate(subject.rotation * Math.PI / 180);
      target.scale(subject.scale * stretch[0], subject.scale * stretch[1]);
      target.lineCap = "round";
      target.lineJoin = "round";
      target.textBaseline = "alphabetic";
      target.textAlign = "left";
      if (subject.font) target.font = subject.font;
    };
    const filters = [...(subject.layers ?? []).flatMap((layer) => layer.filters), ...subject.filters ?? []];
    if (!filters.length) {
      context.save();
      place2(context);
      context.fillStyle = subject.color;
      context.strokeStyle = subject.color;
      body(context, subject, subject.opacity);
      context.restore();
      return;
    }
    const pixelWidth = context.canvas.width;
    const pixelHeight = context.canvas.height;
    const { canvas, context: scratch } = buffer(pixelWidth, pixelHeight);
    scratch.save();
    scratch.setTransform(1, 0, 0, 1, 0, 0);
    scratch.globalCompositeOperation = "source-over";
    scratch.globalAlpha = 1;
    scratch.clearRect(0, 0, pixelWidth, pixelHeight);
    scratch.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    place2(scratch);
    scratch.fillStyle = "#ffffff";
    scratch.strokeStyle = "#ffffff";
    body(scratch, subject, 1);
    scratch.restore();
    const image = scratch.getImageData(0, 0, pixelWidth, pixelHeight);
    const pixels = image.data;
    let left = pixelWidth;
    let right = -1;
    let top = pixelHeight;
    let bottom = -1;
    for (let y2 = 0, i = 3; y2 < pixelHeight; y2++) for (let x2 = 0; x2 < pixelWidth; x2++, i += 4) if (pixels[i]) {
      if (x2 < left) left = x2;
      if (x2 > right) right = x2;
      if (y2 < top) top = y2;
      bottom = y2;
    }
    if (right < 0) return;
    const reach = filters.reduce((sum, filter2) => sum + filterReach(filter2, pixelScale), 0);
    const x = Math.max(0, left - reach);
    const y = Math.max(0, top - reach);
    const width = Math.min(pixelWidth, right + reach + 1) - x;
    const height = Math.min(pixelHeight, bottom + reach + 1) - y;
    let coverage = new Uint8ClampedArray(width * height);
    for (let row = 0, i = 0; row < height; row++) for (let at = ((y + row) * pixelWidth + x) * 4 + 3, end = at + width * 4; at < end; at += 4, i++) coverage[i] = pixels[at];
    for (const filter2 of filters) coverage = applyFilter({ data: coverage, width, height, x, y }, filter2, pixelScale);
    const ink = rgb(subject.color);
    const split = [...filters].reverse().find((filter2) => filter2.type === "split");
    const ox = split ? Math.round(Math.cos(split.angle * Math.PI / 180) * split.radius * pixelScale) : 0;
    const oy = split ? Math.round(Math.sin(split.angle * Math.PI / 180) * split.radius * pixelScale) : 0;
    const sample2 = (column, row) => column < 0 || row < 0 || column >= width || row >= height ? 0 : coverage[row * width + column] / 255;
    for (let row = 0, i = 0; row < height; row++) for (let at = ((y + row) * pixelWidth + x) * 4, end = at + width * 4; at < end; at += 4, i++) {
      if (!split) {
        pixels[at] = ink[0];
        pixels[at + 1] = ink[1];
        pixels[at + 2] = ink[2];
        pixels[at + 3] = coverage[i];
        continue;
      }
      const column = i % width;
      let alpha = 0;
      const color3 = [0, 0, 0];
      for (const [tint, weight] of [[red, sample2(column + ox, row + oy)], [cyan, sample2(column - ox, row - oy)], [ink, sample2(column, row)]]) {
        for (let channel = 0; channel < 3; channel++) color3[channel] = tint[channel] * weight + color3[channel] * (1 - weight);
        alpha = weight + alpha * (1 - weight);
      }
      for (let channel = 0; channel < 3; channel++) pixels[at + channel] = alpha ? color3[channel] / alpha : 0;
      pixels[at + 3] = alpha * 255;
    }
    scratch.putImageData(image, 0, 0, x, y, width, height);
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = subject.opacity;
    context.drawImage(canvas, x, y, width, height, x, y, width, height);
    context.restore();
  }

  // packages/renderer-browser/src/index.ts
  function textFont(scene, node) {
    return `${node.fontSize}px ${node.font === "system" ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif' : node.font === "mono" ? '"SF Mono", ui-monospace, Menlo, Consolas, "PingFang SC", monospace' : `"mf_${scene.spec.assets[node.font].sha256}"`}`;
  }
  async function verifyFontBytes(asset, bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hash !== asset.sha256) throw new Error(`ASSET_HASH: ${asset.src} does not match its locked SHA-256.`);
  }
  function drawFrame(context, scene, frame, scale = 1, background = true) {
    const state = scene.evaluate(frame);
    drawState(context, scene, state, scale, background);
    return state;
  }
  function drawState(context, scene, state, scale, background) {
    const { width, height } = scene.spec.canvas;
    context.save();
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    if (background) {
      context.fillStyle = scene.spec.canvas.background;
      context.fillRect(0, 0, width, height);
    } else context.clearRect(0, 0, width, height);
    for (const node of state.nodes) drawSceneNode(context, scene, node, scale);
    context.restore();
  }
  function drawSceneNode(context, scene, node, scale = 1) {
    if (node.type === "overlay") drawSubject(context, { position: [0, 0], rotation: 0, scale: 1, opacity: 1, color: node.color, layers: node.layers }, scale);
    else drawSubject(context, node.type === "text" ? { ...node, font: textFont(scene, node) } : node, scale);
  }
  var loopPlans = /* @__PURE__ */ new WeakMap();
  var restartCanvases = /* @__PURE__ */ new WeakMap();
  function drawLoopFrame(context, scene, elapsed, scale = 1) {
    let timing2 = loopPlans.get(scene);
    if (!timing2) {
      timing2 = loopTiming(scene.spec);
      loopPlans.set(scene, timing2);
    }
    const frame = loopFrame(timing2, elapsed);
    const state = timing2.mode === "continuous" ? scene.evaluate(timing2.start + elapsed, { continuous: true }) : scene.evaluate(frame);
    drawState(context, scene, state, scale, true);
    const mix = loopBlend(timing2, elapsed);
    if (mix > 0) {
      let target = restartCanvases.get(context.canvas);
      if (!target) {
        target = context.canvas.ownerDocument.createElement("canvas");
        restartCanvases.set(context.canvas, target);
      }
      if (target.width !== context.canvas.width) target.width = context.canvas.width;
      if (target.height !== context.canvas.height) target.height = context.canvas.height;
      drawFrame(target.getContext("2d"), scene, timing2.start, scale);
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = mix;
      context.globalCompositeOperation = "source-over";
      context.drawImage(target, 0, 0);
      context.restore();
    }
    return { ...state, frame, timeSeconds: frame * scene.spec.fps.denominator / scene.spec.fps.numerator };
  }
  async function mountScene(canvas, input, resolveAsset) {
    const scene = compileScene(input);
    const loaded = [];
    try {
      for (const asset of Object.values(scene.spec.assets)) {
        const bytes = await resolveAsset(asset);
        await verifyFontBytes(asset, bytes);
        const face = await new FontFace(`mf_${asset.sha256}`, bytes).load();
        document.fonts.add(face);
        loaded.push(face);
      }
      canvas.width = scene.spec.canvas.width;
      canvas.height = scene.spec.canvas.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("CANVAS_UNAVAILABLE: Canvas 2D is required.");
      let destroyed = false;
      return {
        scene,
        renderFrame(frame, background = true) {
          if (destroyed) throw new Error("Renderer has been destroyed.");
          return drawFrame(context, scene, frame, 1, background);
        },
        renderLoop(elapsed) {
          if (destroyed) throw new Error("Renderer has been destroyed.");
          return drawLoopFrame(context, scene, elapsed);
        },
        destroy() {
          if (!destroyed) {
            loaded.forEach((face) => document.fonts.delete(face));
            destroyed = true;
          }
        }
      };
    } catch (error) {
      loaded.forEach((face) => document.fonts.delete(face));
      throw error;
    }
  }

  // packages/renderer-browser/src/breakdown.ts
  var unitOf = (plan) => plan.width / 640;
  var header = 46;
  var blockHeight = 22;
  var laneGap = 4;
  var trackGap = 12;
  var footer = 18;
  var labelWidth = 120;
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
  var sans = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  var mono = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';
  function drawPanel(context, plan, frame, top = 0) {
    const u = unitOf(plan), arranged = layout(plan), laneX = labelWidth * u, laneWidth = plan.width - laneX - 12 * u;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.fillStyle = "#0f1114";
    context.fillRect(0, top, context.canvas.width, panelHeight(plan) + 1);
    context.textBaseline = "middle";
    context.textAlign = "left";
    context.fillStyle = "#f2f3ee";
    context.font = `600 ${15 * u}px ${sans}`;
    if (plan.title) context.fillText(plan.title, 12 * u, top + 18 * u, plan.width - 24 * u);
    context.fillStyle = "#ffffff8f";
    context.font = `${10 * u}px ${mono}`;
    const startSeconds = plan.sourceStartSeconds ?? 0;
    context.fillText(`${(startSeconds + frame / plan.fps).toFixed(2)} / ${(startSeconds + plan.durationFrames / plan.fps).toFixed(2)} s`, 12 * u, top + 35 * u);
    for (const [index, { track, blocks, top: trackTop, height }] of arranged.tracks.entries()) {
      context.globalAlpha = 1;
      context.fillStyle = index % 2 === 0 ? "#14171b" : "#0f1114";
      context.fillRect(0, top + (trackTop - trackGap / 2) * u, plan.width, (height + trackGap) * u);
      const middle = top + (trackTop + height / 2) * u;
      const active = blocks.some((block) => frame >= block.from && frame < block.to);
      context.globalAlpha = active ? 1 : 0.7;
      context.fillStyle = track.color;
      context.fillRect(0, middle - 8 * u, 2 * u, 16 * u);
      context.font = `700 ${11 * u}px ${sans}`;
      context.fillText(track.symbol, 12 * u, middle);
      context.font = `${12 * u}px ${sans}`;
      context.fillText(track.name, 42 * u, middle, laneX - 50 * u);
      context.globalAlpha = 1;
      for (const block of blocks) {
        const y = top + (trackTop + block.lane * (blockHeight + laneGap)) * u;
        const from = laneX + laneWidth * block.from / plan.durationFrames;
        const to = laneX + laneWidth * block.to / plan.durationFrames;
        const inset = Math.min(1.5 * u, (to - from) / 4), x = from + inset, width = to - from - inset * 2;
        const acting = frame >= block.from && frame < block.to;
        context.globalAlpha = acting ? 1 : 0.35;
        context.fillStyle = track.color;
        context.beginPath();
        context.roundRect(x, y, width, blockHeight * u, 3 * u);
        context.fill();
      }
      context.globalAlpha = 1;
    }
    context.globalAlpha = 1;
    context.fillStyle = "#f2f3ee";
    context.fillRect(
      laneX + laneWidth * Math.min(1, frame / plan.durationFrames) - 0.5 * u,
      top + header * u,
      u,
      (arranged.height - header - footer + 2) * u
    );
    context.restore();
  }
  function drawBreakdown(target, picture, plan, frame) {
    const context = target.getContext("2d"), { sceneHeight } = breakdownSize(plan, picture);
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#0f1114";
    context.fillRect(0, 0, target.width, target.height);
    context.drawImage(picture, 0, 0, plan.width, sceneHeight);
    context.restore();
    drawPanel(context, plan, frame, sceneHeight);
  }

  // packages/renderer-browser/src/standalone.ts
  async function main() {
    const input = JSON.parse(document.getElementById("scene-data").textContent);
    const assets = JSON.parse(document.getElementById("asset-data").textContent);
    const playback = JSON.parse(document.getElementById("playback-data")?.textContent || "{}");
    const canvas = document.querySelector("canvas");
    const breakdown = playback.breakdown;
    const composite = breakdown ? document.createElement("canvas") : void 0;
    if (composite) {
      canvas.before(composite);
      canvas.hidden = true;
      composite.setAttribute("aria-label", "\u52A8\u6548\u4E0E\u539F\u5B50\u65F6\u95F4\u8F74");
    }
    const status = document.getElementById("status");
    const mounted = await mountScene(canvas, input, async (asset) => {
      const encoded = assets[asset.src];
      if (!encoded) throw new Error(`Missing embedded font ${asset.src}`);
      return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)).buffer;
    });
    if (composite && breakdown) {
      const size = breakdownSize(breakdown, mounted.scene.spec.canvas);
      composite.width = size.width;
      composite.height = size.height;
    }
    const slider = document.querySelector("input");
    const button = document.querySelector("button");
    const timing2 = loopTiming(mounted.scene.spec);
    slider.min = String(playback.loop ? timing2.start : 0);
    slider.max = String(playback.loop ? timing2.end : mounted.scene.spec.durationFrames - 1);
    const fps = mounted.scene.spec.fps.numerator / mounted.scene.spec.fps.denominator;
    let frame = 0;
    let playing = false;
    let elapsed = 0;
    let last = 0;
    let animation = 0;
    const renderFrame = (next, background = true) => {
      frame = next;
      mounted.renderFrame(next, background);
      slider.value = String(next);
      if (composite && breakdown) drawBreakdown(composite, canvas, breakdown, next);
      status.textContent = `Frame ${next.toFixed(0)} / ${slider.max} \xB7 ${(next / fps).toFixed(2)}s`;
    };
    const renderLoop = (displayFrame) => {
      const state = mounted.renderLoop(elapsed);
      frame = displayFrame ?? state.frame;
      slider.value = String(frame);
      if (composite && breakdown) drawBreakdown(composite, canvas, breakdown, state.frame);
      status.textContent = `Frame ${frame.toFixed(0)} / ${slider.max} \xB7 ${(frame / fps).toFixed(2)}s`;
    };
    const tick = (now) => {
      if (!playing) return;
      if (!document.hidden && last) elapsed += Math.min(now - last, 100) / 1e3 * fps;
      last = now;
      if (playback.loop) renderLoop();
      else renderFrame(Math.min(mounted.scene.spec.durationFrames - 1, elapsed));
      if (!playback.loop && frame >= mounted.scene.spec.durationFrames - 1) {
        playing = false;
        button.textContent = "\u64AD\u653E";
      } else animation = requestAnimationFrame(tick);
    };
    button.onclick = () => {
      playing = !playing;
      button.textContent = playing ? "\u6682\u505C" : "\u64AD\u653E";
      if (playing) {
        if (playback.loop) elapsed = loopElapsed(timing2, frame, elapsed);
        else {
          if (frame >= mounted.scene.spec.durationFrames - 1) frame = 0;
          elapsed = frame;
        }
        last = 0;
        animation = requestAnimationFrame(tick);
      } else cancelAnimationFrame(animation);
    };
    slider.oninput = () => {
      playing = false;
      cancelAnimationFrame(animation);
      button.textContent = "\u64AD\u653E";
      if (playback.loop) {
        const next = Number(slider.value);
        elapsed = loopElapsed(timing2, next, elapsed);
        renderLoop(next);
      } else renderFrame(Number(slider.value));
    };
    window.motionFlux = { renderFrame, scene: mounted.scene.spec };
    window.addEventListener("pagehide", () => {
      cancelAnimationFrame(animation);
      mounted.destroy();
    });
    renderFrame(0);
  }
  main().catch((error) => {
    document.getElementById("status").textContent = String(error);
  });
})();
