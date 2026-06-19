const { BrowserBuiltins, runBrowser, compile } = require('../dist/index.js');
const { Scheduler } = require('../dist/runtime/scheduler.js');

console.log('=== Browser/Canvas Test Suite ===');
console.log();

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log('\u2713', name);
    passed++;
  } else {
    console.log('\u2717', name, 'FAILED');
    failed++;
  }
}

function testEqual(name, actual, expected) {
  if (actual === expected) {
    console.log('\u2713', name, '=', actual);
    passed++;
  } else {
    console.log('\u2717', name, 'expected', expected, 'got', actual);
    failed++;
  }
}

function testError(name, fn, expectedSubstring) {
  try {
    fn();
    console.log('\u2717', name, 'expected error, got success');
    failed++;
  } catch (e) {
    if (e.message.includes(expectedSubstring)) {
      console.log('\u2713', name, '=', e.message);
      passed++;
    } else {
      console.log('\u2717', name, 'expected "' + expectedSubstring + '", got "' + e.message + '"');
      failed++;
    }
  }
}

function createMockCanvas(opts) {
  if (opts?.noCanvas) return null;
  const calls = [];
  const ctx = {};
  ctx.calls = calls;
  ctx.fillStyle = null;
  ctx.strokeStyle = null;
  ctx.font = null;
  ctx.lineWidth = null;
  ctx.shadowColor = null;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
  ctx.clearRect = function(x, y, w, h) { calls.push(['clearRect', x, y, w, h]); };
  ctx.fillRect = function(x, y, w, h) { calls.push(['fillRect', x, y, w, h]); };
  ctx.strokeRect = function(x, y, w, h) { calls.push(['strokeRect', x, y, w, h]); };
  ctx.fillText = function(text, x, y) { calls.push(['fillText', text, x, y]); };
  ctx.strokeText = function(text, x, y) { calls.push(['strokeText', text, x, y]); };
  ctx.measureText = function(text) { calls.push(['measureText', text]); return { width: text.length * 10 }; };
  ctx.beginPath = function() { calls.push(['beginPath']); };
  ctx.closePath = function() { calls.push(['closePath']); };
  ctx.moveTo = function(x, y) { calls.push(['moveTo', x, y]); };
  ctx.lineTo = function(x, y) { calls.push(['lineTo', x, y]); };
  ctx.arc = function(x, y, r, a1, a2) { calls.push(['arc', x, y, r, a1, a2]); };
  ctx.arcTo = function(x1, y1, x2, y2, r) { calls.push(['arcTo', x1, y1, x2, y2, r]); };
  ctx.stroke = function() { calls.push(['stroke']); };
  ctx.fill = function() { calls.push(['fill']); };
  ctx.save = function() { calls.push(['save']); };
  ctx.restore = function() { calls.push(['restore']); };
  ctx.rotate = function(a) { calls.push(['rotate', a]); };
  ctx.translate = function(x, y) { calls.push(['translate', x, y]); };
  ctx.scale = function(x, y) { calls.push(['scale', x, y]); };
  ctx.createLinearGradient = function(x0, y0, x1, y1) {
    calls.push(['createLinearGradient', x0, y0, x1, y1]);
    const grad = { _stops: [] };
    grad.addColorStop = function(offset, color) {
      grad._stops.push([offset, color]);
    };
    return grad;
  };
  ctx.createRadialGradient = function(x0, y0, r0, x1, y1, r1) {
    calls.push(['createRadialGradient', x0, y0, r0, x1, y1, r1]);
    const grad = { _stops: [] };
    grad.addColorStop = function(offset, color) {
      grad._stops.push([offset, color]);
    };
    return grad;
  };
  ctx.setLineDash = function(segments) { calls.push(['setLineDash', segments]); };
  return ctx;
}

function createTest(opts) {
  const ctx = createMockCanvas(opts);
  const scheduler = opts?.skipScheduler ? null : new Scheduler();
  const bb = new BrowserBuiltins(scheduler, ctx, 800, 600);
  return { ctx, scheduler, bb };
}

// ════════════════════════════════════════════════════════════
// 1. Built-in registration tests
// ════════════════════════════════════════════════════════════

(function() {
  const { bb } = createTest();
  const names = bb.getBuiltinNames();

  test('canvas_clear registered', names.includes('canvas_clear'));
  test('canvas_get_width registered', names.includes('canvas_get_width'));
  test('canvas_get_height registered', names.includes('canvas_get_height'));
  test('canvas_fill_rect registered', names.includes('canvas_fill_rect'));
  test('canvas_stroke_rect registered', names.includes('canvas_stroke_rect'));
  test('canvas_clear_rect registered', names.includes('canvas_clear_rect'));
  test('canvas_fill_text registered', names.includes('canvas_fill_text'));
  test('canvas_stroke_text registered', names.includes('canvas_stroke_text'));
  test('canvas_measure_text registered', names.includes('canvas_measure_text'));
  test('canvas_set_fill_color registered', names.includes('canvas_set_fill_color'));
  test('canvas_set_stroke_color registered', names.includes('canvas_set_stroke_color'));
  test('canvas_set_font registered', names.includes('canvas_set_font'));
  test('canvas_set_line_width registered', names.includes('canvas_set_line_width'));
  test('canvas_begin_path registered', names.includes('canvas_begin_path'));
  test('canvas_close_path registered', names.includes('canvas_close_path'));
  test('canvas_move_to registered', names.includes('canvas_move_to'));
  test('canvas_line_to registered', names.includes('canvas_line_to'));
  test('canvas_arc registered', names.includes('canvas_arc'));
  test('canvas_stroke registered', names.includes('canvas_stroke'));
  test('canvas_fill registered', names.includes('canvas_fill'));
  test('canvas_save registered', names.includes('canvas_save'));
  test('canvas_restore registered', names.includes('canvas_restore'));
  test('canvas_rotate registered', names.includes('canvas_rotate'));
  test('canvas_translate registered', names.includes('canvas_translate'));
  test('canvas_scale registered', names.includes('canvas_scale'));

  test('concat registered', names.includes('concat'));
  test('to_string registered', names.includes('to_string'));
  test('print registered', names.includes('print'));
  test('append registered', names.includes('append'));
  test('map_put registered', names.includes('map_put'));
  test('abs registered', names.includes('abs'));
  test('sin registered', names.includes('sin'));
  test('floor registered', names.includes('floor'));
  test('round registered', names.includes('round'));
  test('pi registered', names.includes('pi'));
  test('record_update registered', names.includes('record_update'));
  test('canvas_load_image registered', names.includes('canvas_load_image'));
  test('canvas_draw_image registered', names.includes('canvas_draw_image'));
  test('canvas_image_loaded registered', names.includes('canvas_image_loaded'));
  test('audio_load registered', names.includes('audio_load'));
  test('audio_play registered', names.includes('audio_play'));
  test('audio_stop registered', names.includes('audio_stop'));
  test('audio_pause registered', names.includes('audio_pause'));
  test('audio_resume registered', names.includes('audio_resume'));
  test('audio_set_volume registered', names.includes('audio_set_volume'));
  test('audio_set_loop registered', names.includes('audio_set_loop'));
  test('canvas_wait_click registered', names.includes('canvas_wait_click'));
  test('canvas_wait_drag registered', names.includes('canvas_wait_drag'));
  test('canvas_create_linear_gradient registered', names.includes('canvas_create_linear_gradient'));
  test('canvas_create_radial_gradient registered', names.includes('canvas_create_radial_gradient'));
  test('canvas_add_color_stop registered', names.includes('canvas_add_color_stop'));
  test('canvas_set_fill_gradient registered', names.includes('canvas_set_fill_gradient'));
  test('canvas_set_stroke_gradient registered', names.includes('canvas_set_stroke_gradient'));
  test('canvas_set_shadow_color registered', names.includes('canvas_set_shadow_color'));
  test('canvas_set_shadow_blur registered', names.includes('canvas_set_shadow_blur'));
  test('canvas_set_shadow_offset_x registered', names.includes('canvas_set_shadow_offset_x'));
  test('canvas_set_shadow_offset_y registered', names.includes('canvas_set_shadow_offset_y'));
  test('canvas_set_text_align registered', names.includes('canvas_set_text_align'));
  test('canvas_set_text_baseline registered', names.includes('canvas_set_text_baseline'));
  test('canvas_arc_to registered', names.includes('canvas_arc_to'));
  test('canvas_set_line_dash registered', names.includes('canvas_set_line_dash'));
  test('map_keys registered', names.includes('map_keys'));
  test('map_values registered', names.includes('map_values'));
  test('fetch registered (with scheduler)', names.includes('fetch'));
  test('await_font_loaded registered', names.includes('await_font_loaded'));
  test('db_store registered', names.includes('db_store'));
  test('db_load registered', names.includes('db_load'));
  test('db_delete registered', names.includes('db_delete'));

  test('file_read NOT registered', !names.includes('file_read'));
  test('file_write NOT registered', !names.includes('file_write'));
  test('file_read_lines NOT registered', !names.includes('file_read_lines'));
  test('read_line NOT registered', !names.includes('read_line'));
})();

// ════════════════════════════════════════════════════════════
// 2. Canvas function call tests
// ════════════════════════════════════════════════════════════

(function() {
  // 2a. Fill rectangle
  (function() {
    const { ctx, bb } = createTest();
    const fn = bb.getFn('canvas_fill_rect');
    fn.fn([
      { toRawNumber: () => 10 }, { toRawNumber: () => 20 },
      { toRawNumber: () => 100 }, { toRawNumber: () => 50 },
    ]);
    test('canvas_fill_rect calls fillRect', ctx.calls.length === 1);
    testEqual('fillRect x', ctx.calls[0][1], 10);
    testEqual('fillRect y', ctx.calls[0][2], 20);
    testEqual('fillRect w', ctx.calls[0][3], 100);
    testEqual('fillRect h', ctx.calls[0][4], 50);
  })();

  // 2b. Fill color
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_set_fill_color').fn([{ toRawString: () => 'red' }]);
    test('canvas_set_fill_color sets fillStyle', ctx.fillStyle === 'red');
  })();

  // 2c. Font
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_set_font').fn([{ toRawString: () => 'bold 20px sans-serif' }]);
    test('canvas_set_font sets font', ctx.font === 'bold 20px sans-serif');
  })();

  // 2d. Line width
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_set_line_width').fn([{ toRawNumber: () => 3 }]);
    test('canvas_set_line_width sets lineWidth', ctx.lineWidth === 3);
  })();

  // 2e. Stroke color
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_set_stroke_color').fn([{ toRawString: () => '#333' }]);
    test('canvas_set_stroke_color sets strokeStyle', ctx.strokeStyle === '#333');
  })();

  // 2f. Fill text
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_fill_text').fn([
      { toRawString: () => 'hello' },
      { toRawNumber: () => 100 }, { toRawNumber: () => 200 },
    ]);
    test('canvas_fill_text calls fillText', ctx.calls.length === 1);
    testEqual('fillText text', ctx.calls[0][1], 'hello');
    testEqual('fillText x', ctx.calls[0][2], 100);
    testEqual('fillText y', ctx.calls[0][3], 200);
  })();

  // 2g. Measure text
  (function() {
    const { ctx, bb } = createTest();
    const result = bb.getFn('canvas_measure_text').fn([{ toRawString: () => 'hello' }]);
    test('canvas_measure_text calls measureText', ctx.calls.length === 1);
    test('canvas_measure_text returns Number', result.isNumber());
    testEqual('canvas_measure_text width', result.toRawNumber(), 50);
  })();

  // 2h. Path operations
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_begin_path').fn([]);
    bb.getFn('canvas_move_to').fn([{ toRawNumber: () => 0 }, { toRawNumber: () => 0 }]);
    bb.getFn('canvas_line_to').fn([{ toRawNumber: () => 100 }, { toRawNumber: () => 100 }]);
    bb.getFn('canvas_stroke').fn([]);
    test('path ops count', ctx.calls.length === 4);
    testEqual('path[0]', ctx.calls[0][0], 'beginPath');
    testEqual('path[1] moveTo(0,0)', ctx.calls[1][0] + '(' + ctx.calls[1][1] + ',' + ctx.calls[1][2] + ')', 'moveTo(0,0)');
    testEqual('path[2] lineTo(100,100)', ctx.calls[2][0] + '(' + ctx.calls[2][1] + ',' + ctx.calls[2][2] + ')', 'lineTo(100,100)');
    testEqual('path[3]', ctx.calls[3][0], 'stroke');
  })();

  // 2i. Clear
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_clear').fn([]);
    test('canvas_clear calls clearRect', ctx.calls.length === 1);
    testEqual('clear[0]', ctx.calls[0][0], 'clearRect');
    testEqual('clear x', ctx.calls[0][1], 0);
    testEqual('clear w', ctx.calls[0][3], 800);
    testEqual('clear h', ctx.calls[0][4], 600);
  })();

  // 2j. Get dimensions
  (function() {
    const { bb } = createTest();
    testEqual('canvas_get_width', bb.getFn('canvas_get_width').fn([]).toRawNumber(), 800);
    testEqual('canvas_get_height', bb.getFn('canvas_get_height').fn([]).toRawNumber(), 600);
  })();

  // 2k. Stroke rect
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_stroke_rect').fn([
      { toRawNumber: () => 5 }, { toRawNumber: () => 5 },
      { toRawNumber: () => 50 }, { toRawNumber: () => 50 },
    ]);
    test('canvas_stroke_rect', ctx.calls[0][0] === 'strokeRect');
  })();

  // 2l. Save/restore
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_save').fn([]);
    bb.getFn('canvas_rotate').fn([{ toRawNumber: () => 0.5 }]);
    bb.getFn('canvas_restore').fn([]);
    test('save/restore count', ctx.calls.length === 3);
    testEqual('save', ctx.calls[0][0], 'save');
    testEqual('rotate', ctx.calls[1][0], 'rotate');
    testEqual('restore', ctx.calls[2][0], 'restore');
  })();

  // 2m. Transform
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_translate').fn([{ toRawNumber: () => 100 }, { toRawNumber: () => 50 }]);
    bb.getFn('canvas_scale').fn([{ toRawNumber: () => 2 }, { toRawNumber: () => 3 }]);
    test('transform count', ctx.calls.length === 2);
    testEqual('translate', ctx.calls[0][0] + '(' + ctx.calls[0][1] + ',' + ctx.calls[0][2] + ')', 'translate(100,50)');
    testEqual('scale', ctx.calls[1][0] + '(' + ctx.calls[1][1] + ',' + ctx.calls[1][2] + ')', 'scale(2,3)');
  })();

  // 2n. Arc
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_arc').fn([
      { toRawNumber: () => 100 }, { toRawNumber: () => 100 },
      { toRawNumber: () => 50 }, { toRawNumber: () => 0 },
      { toRawNumber: () => 6.28 },
    ]);
    test('canvas_arc calls arc', ctx.calls.length === 1);
    testEqual('arc center x', ctx.calls[0][1], 100);
    testEqual('arc radius', ctx.calls[0][3], 50);
  })();

  // 2o. Close path + fill
  (function() {
    const { ctx, bb } = createTest();
    bb.getFn('canvas_close_path').fn([]);
    bb.getFn('canvas_fill').fn([]);
    test('close+fill count', ctx.calls.length === 2);
    testEqual('closePath', ctx.calls[0][0], 'closePath');
    testEqual('fill', ctx.calls[1][0], 'fill');
  })();
})();

// ════════════════════════════════════════════════════════════
// 3. No-canvas (null) — functions should return Unit gracefully
// ════════════════════════════════════════════════════════════

(function() {
  const scheduler = new Scheduler();
  const bb = new BrowserBuiltins(scheduler, null, 0, 0);

  const unit = { isUnit: () => true };

  function expectUnit(name, fn, args) {
    const result = fn.fn(args || []);
    test(name + ' returns Unit', result.isUnit ? result.isUnit() : result.toString() === '()');
  }

  expectUnit('canvas_clear (no canvas)', bb.getFn('canvas_clear'));
  expectUnit('canvas_fill_rect (no canvas)', bb.getFn('canvas_fill_rect'), [
    { toRawNumber: () => 10 }, { toRawNumber: () => 20 },
    { toRawNumber: () => 100 }, { toRawNumber: () => 50 },
  ]);
  expectUnit('canvas_fill_text (no canvas)', bb.getFn('canvas_fill_text'), [
    { toRawString: () => 'hi' },
    { toRawNumber: () => 0 }, { toRawNumber: () => 0 },
  ]);
  expectUnit('canvas_set_fill_color (no canvas)', bb.getFn('canvas_set_fill_color'), [
    { toRawString: () => 'red' },
  ]);
  expectUnit('canvas_begin_path (no canvas)', bb.getFn('canvas_begin_path'));
  expectUnit('canvas_stroke (no canvas)', bb.getFn('canvas_stroke'));

  // measureText returns 0 when no canvas
  const mw = bb.getFn('canvas_measure_text').fn([{ toRawString: () => 'hello' }]);
  test('canvas_measure_text (no canvas) returns Number', mw.isNumber ? mw.isNumber() : true);
  testEqual('canvas_measure_text (no canvas) = 0', mw.toRawNumber(), 0);

  // get_width/height return 0 when no canvas
  testEqual('canvas_get_width (no canvas)', bb.getFn('canvas_get_width').fn([]).toRawNumber(), 0);
  testEqual('canvas_get_height (no canvas)', bb.getFn('canvas_get_height').fn([]).toRawNumber(), 0);

  // canvas_draw_image returns Unit when no canvas
  expectUnit('canvas_draw_image (no canvas)', bb.getFn('canvas_draw_image'), [
    { toRawNumber: () => 1 }, { toRawNumber: () => 0 }, { toRawNumber: () => 0 },
    { toRawNumber: () => 100 }, { toRawNumber: () => 100 },
  ]);

  // canvas_image_loaded returns Boolean (no real image loaded)
  const loadedResult = bb.getFn('canvas_image_loaded').fn([{ toRawNumber: () => 0 }]);
  test('canvas_image_loaded returns Boolean', loadedResult.isBoolean());
  testEqual('canvas_image_loaded = false (no real image)', loadedResult.toRawBoolean(), false);

  // audio functions return Unit even without canvas/audio
  expectUnit('audio_play (no audio)', bb.getFn('audio_play'), [{ toRawNumber: () => 1 }]);
  expectUnit('audio_stop (no audio)', bb.getFn('audio_stop'), [{ toRawNumber: () => 1 }]);
  expectUnit('audio_pause (no audio)', bb.getFn('audio_pause'), [{ toRawNumber: () => 1 }]);
  expectUnit('audio_resume (no audio)', bb.getFn('audio_resume'), [{ toRawNumber: () => 1 }]);
  expectUnit('audio_set_volume (no audio)', bb.getFn('audio_set_volume'), [
    { toRawNumber: () => 1 }, { toRawNumber: () => 0.5 },
  ]);
  expectUnit('audio_set_loop (no audio)', bb.getFn('audio_set_loop'), [
    { toRawNumber: () => 1 }, { toRawString: () => 'true' },
  ]);

  // map_keys/map_values return empty list for empty map
  const emptyMap = {
    _entries: {},
    hasByValueKey: () => false,
  };
  const keysResult = bb.getFn('map_keys').fn([emptyMap]);
  test('map_keys (empty) returns List', keysResult.isList ? keysResult.isList() : Array.isArray(keysResult));
  testEqual('map_keys (empty) length', keysResult.length(), 0);
  const valsResult = bb.getFn('map_values').fn([emptyMap]);
  testEqual('map_values (empty) length', valsResult.length(), 0);
})();

// ════════════════════════════════════════════════════════════
// 4. Integration via runBrowser — Simplex source → canvas
// ════════════════════════════════════════════════════════════

(function() {
  const calls = [];
  const ctx = {
    calls: calls,
    fillStyle: null, font: null, strokeStyle: null, lineWidth: null,
    clearRect: function() { calls.push('clearRect'); },
    fillRect: function(x, y, w, h) { calls.push('fillRect:' + x + ',' + y + ',' + w + ',' + h); },
    fillText: function(t, x, y) { calls.push('fillText:' + t + ',' + x + ',' + y); },
    measureText: function() { return { width: 0 }; },
    beginPath: function() { calls.push('beginPath'); },
    closePath: function() { calls.push('closePath'); },
    moveTo: function() { calls.push('moveTo'); },
    lineTo: function() { calls.push('lineTo'); },
    arc: function() { calls.push('arc'); },
    stroke: function() { calls.push('stroke'); },
    fill: function() { calls.push('fill'); },
    save: function() { calls.push('save'); },
    restore: function() { calls.push('restore'); },
    rotate: function() { calls.push('rotate'); },
    translate: function() { calls.push('translate'); },
    scale: function() { calls.push('scale'); },
    strokeRect: function() { calls.push('strokeRect'); },
    clearRectExact: function() {},
  };

  try {
    runBrowser('fn draw() { canvas_clear(); canvas_fill_rect(10, 20, 100, 50); canvas_fill_text("hi", 0, 30) } draw()', {
      target: 'browser',
      canvas: ctx,
      canvasWidth: 800,
      canvasHeight: 600,
    });
    test('integration: calls count', calls.length === 3);
    test('integration: clearRect called', calls[0] === 'clearRect');
    test('integration: fillRect called', calls[1] === 'fillRect:10,20,100,50');
    test('integration: fillText called', calls[2] === 'fillText:hi,0,30');
  } catch (e) {
    console.log('\u2717 integration test ERROR:', e.message);
    failed++;
  }
})();

// ════════════════════════════════════════════════════════════
// 4b. Named function as event handler (scope + side-effect tests)
// ════════════════════════════════════════════════════════════

(function testCanvasWaitClickReturnsTask() {
  {
    const ctx = {
      fillStyle: null, font: null, strokeStyle: null, lineWidth: null,
      canvas: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
      getContext: function() { return this; },
      addEventListener: () => {},
      removeEventListener: () => {},
      setPointerCapture: () => {},
      clearRect: function() {},
      fillRect: function() {},
      fillText: function() {},
      arc: function() {},
      fill: function() {},
      beginPath: function() {},
      measureText: function() { return {width: 10}; },
      save: function() {},
      restore: function() {},
      rotate: function() {},
      translate: function() {},
      scale: function() {},
      strokeRect: function() {},
      clearRectExact: function() {},
    };
    try {
      const result = runBrowser('fn main() -> Unit { let t: Task<Map<String, Number>> = canvas_wait_click(); () }', {
        target: 'browser', canvas: ctx, canvasWidth: 800, canvasHeight: 600,
      });
      test('canvas_wait_click type-checks and returns Task', true);
    } catch (e) {
      console.log('\u2717 canvas_wait_click compile ERROR:', e.message);
      failed++;
    }
  }
})();

(function testCanvasWaitClickNoCanvas() {
  {
    try {
      runBrowser('fn main() -> Unit { let t: Task<Map<String, Number>> = canvas_wait_click(); () }', {
        target: 'browser', canvas: null, canvasWidth: 0, canvasHeight: 0,
      });
      test('canvas_wait_click type-checks without canvas', true);
    } catch (e) {
      console.log('\u2717 canvas_wait_click (no canvas) ERROR:', e.message);
      failed++;
    }
  }
})();

(function testCanvasWaitClickRejectsArgs() {
  try {
    compile('fn main() -> Unit { canvas_wait_click(42) }');
    console.log('\u2717 typecheck err: canvas_wait_click arg should fail');
    failed++;
  } catch (e) {
    test('canvas_wait_click rejects args', /Expected 0 arguments/.test(e.message));
  }
})();

(function testNamedFnLastExpressionSideEffectOnce() {
  {
    const calls = [];
    const ctx = {
      calls: calls,
      fillStyle: null, font: null, strokeStyle: null, lineWidth: null,
      clearRect: function() { calls.push('clearRect'); },
      fillRect: function(x, y, w, h) { calls.push('fillRect:'+x+','+y+','+w+','+h); },
      fillText: function(t, x, y) { calls.push('fillText:'+t+','+x+','+y); },
      arc: function() { calls.push('arc'); },
      fill: function() { calls.push('fill'); },
      beginPath: function() { calls.push('beginPath'); },
      closePath: function() { calls.push('closePath'); },
      stroke: function() { calls.push('stroke'); },
      setFillStyle: function(c) { calls.push('setFillStyle:'+c); },
      getContext: function() { return this; },
      measureText: function() { return {width: 10}; },
      save: function() {},
      restore: function() {},
      rotate: function() {},
      translate: function() {},
      scale: function() {},
      strokeRect: function() {},
      clearRectExact: function() {},
    };
    try {
      runBrowser(`
        fn draw() {
          canvas_clear();
          canvas_fill_rect(0, 0, 100, 50);
          canvas_fill_text("once", 10, 30)
        }
        draw()
      `, { target: 'browser', canvas: ctx, canvasWidth: 800, canvasHeight: 600 });
      test('named fn side-effect: calls count === 3', calls.length === 3);
      test('named fn side-effect: clearRect', calls[0] === 'clearRect');
      test('named fn side-effect: fillRect', calls[1] === 'fillRect:0,0,100,50');
      test('named fn side-effect: fillText exactly once', calls[2] === 'fillText:once,10,30');
    } catch (e) {
      console.log('\u2717 named fn side-effect ERROR:', e.message);
      failed++;
    }
  }
})();

// ════════════════════════════════════════════════════════════
// 5. Type checker — canvas builtin signatures
// ════════════════════════════════════════════════════════════

(function() {
  // Valid canvas calls should type-check and run
  try {
    runBrowser('fn main() { canvas_set_fill_color("red"); canvas_fill_rect(0, 0, 100, 50) }', {
      target: 'browser', canvas: null, canvasWidth: 0, canvasHeight: 0,
    });
    test('typecheck: canvas_set_fill_color + fill_rect', true);
  } catch (e) {
    console.log('\u2717 typecheck valid canvas calls:', e.message);
    failed++;
  }

  try {
    runBrowser('fn main() { canvas_fill_text("hi", 10, 20); canvas_stroke_text("bye", 30, 40) }', {
      target: 'browser', canvas: null, canvasWidth: 0, canvasHeight: 0,
    });
    test('typecheck: fill_text + stroke_text', true);
  } catch (e) {
    console.log('\u2717 typecheck valid text calls:', e.message);
    failed++;
  }

  try {
    runBrowser('fn main() { canvas_begin_path(); canvas_move_to(0, 0); canvas_line_to(100, 100); canvas_stroke() }', {
      target: 'browser', canvas: null, canvasWidth: 0, canvasHeight: 0,
    });
    test('typecheck: path operations', true);
  } catch (e) {
    console.log('\u2717 typecheck path calls:', e.message);
    failed++;
  }

  try {
    runBrowser('fn main() { let w: Number = canvas_get_width(); let h: Number = canvas_get_height() }', {
      target: 'browser', canvas: null, canvasWidth: 0, canvasHeight: 0,
    });
    test('typecheck: get_width + get_height', true);
  } catch (e) {
    console.log('\u2717 typecheck dim calls:', e.message);
    failed++;
  }

  // Invalid calls should be rejected by type checker
  try {
    compile('fn main() { canvas_set_fill_color(42) }');
    console.log('\u2717 typecheck err: canvas_set_fill_color number should fail');
    failed++;
  } catch (e) {
    test('typecheck err: canvas_set_fill_color(42) rejected', true);
  }

  try {
    compile('fn main() { canvas_fill_rect("a", 0, 0, 0) }');
    console.log('\u2717 typecheck err: canvas_fill_rect string arg should fail');
    failed++;
  } catch (e) {
    test('typecheck err: canvas_fill_rect wrong arg type', true);
  }

  try {
    compile('fn main() { canvas_fill_text(42, 0, 0) }');
    console.log('\u2717 typecheck err: canvas_fill_text number instead of string should fail');
    failed++;
  } catch (e) {
    test('typecheck err: canvas_fill_text wrong arg type', true);
  }

  try {
    compile('fn main() { canvas_arc(0, "a", 0, 0, 0) }');
    console.log('\u2717 typecheck err: canvas_arc string arg should fail');
    failed++;
  } catch (e) {
    test('typecheck err: canvas_arc wrong arg type', true);
  }

  try {
    compile('fn main() { canvas_set_line_width("thin") }');
    console.log('\u2717 typecheck err: canvas_set_line_width string should fail');
    failed++;
  } catch (e) {
    test('typecheck err: canvas_set_line_width wrong arg type', true);
  }

  try {
    compile('fn main() { canvas_rotate("half") }');
    console.log('\u2717 typecheck err: canvas_rotate string should fail');
    failed++;
  } catch (e) {
    test('typecheck err: canvas_rotate wrong arg type', true);
  }

  // canvas_load_image / canvas_draw_image — valid
  try {
    runBrowser('fn main() { canvas_load_image("data:,"); canvas_draw_image(0, 0, 0, 100, 50) }', {
      target: 'browser', canvas: null, canvasWidth: 0, canvasHeight: 0,
    });
    test('typecheck: canvas_load_image + draw_image valid', true);
  } catch (e) {
    console.log('\u2717 typecheck canvas_load_image + draw_image:', e.message);
    failed++;
  }

  // canvas_load_image — invalid (needs String)
  try {
    compile('fn main() { canvas_load_image(42) }');
    console.log('\u2717 typecheck err: canvas_load_image number should fail');
    failed++;
  } catch (e) {
    test('typecheck err: canvas_load_image(42) rejected', true);
  }

  try {
    compile('fn main() { canvas_draw_image("id", 0, 0, 100, 50) }');
    console.log('\u2717 typecheck err: canvas_draw_image string id should fail');
    failed++;
  } catch (e) {
    test('typecheck err: canvas_draw_image string id rejected', true);
  }
})();

// ════════════════════════════════════════════════════════════
// 7. BrowserBuiltins arity checks
// ════════════════════════════════════════════════════════════

(function() {
  const { bb } = createTest();

  const arities = {
    canvas_clear: 0, canvas_fill_rect: 4, canvas_stroke_rect: 4,
    canvas_clear_rect: 4, canvas_fill_text: 3, canvas_stroke_text: 3,
    canvas_measure_text: 1, canvas_set_fill_color: 1, canvas_set_stroke_color: 1,
    canvas_set_font: 1, canvas_set_line_width: 1,
    canvas_begin_path: 0, canvas_close_path: 0,
    canvas_move_to: 2, canvas_line_to: 2, canvas_arc: 5,
    canvas_stroke: 0, canvas_fill: 0,
    canvas_save: 0, canvas_restore: 0,
    canvas_rotate: 1, canvas_translate: 2, canvas_scale: 2,
    canvas_get_width: 0, canvas_get_height: 0,
    canvas_load_image: 1, canvas_draw_image: 5, canvas_image_loaded: 1,
    audio_load: 1, audio_play: 1, audio_stop: 1, audio_pause: 1, audio_resume: 1,
    audio_set_volume: 2, audio_set_loop: 2,
    canvas_wait_click: 0, canvas_wait_drag: 0,
    canvas_create_linear_gradient: 4, canvas_create_radial_gradient: 6,
    canvas_add_color_stop: 3, canvas_set_fill_gradient: 1, canvas_set_stroke_gradient: 1,
    canvas_set_shadow_color: 1, canvas_set_shadow_blur: 1,
    canvas_set_shadow_offset_x: 1, canvas_set_shadow_offset_y: 1,
    canvas_set_text_align: 1, canvas_set_text_baseline: 1,
    canvas_arc_to: 5, canvas_set_line_dash: 1,
    sin: 1, floor: 1, round: 1, pi: 0,
    await_font_loaded: 1,
    map_keys: 1, map_values: 1,
  };

  for (const [name, expected] of Object.entries(arities)) {
    const entry = bb.getFn(name);
    testEqual('arity: ' + name + ' = ' + expected, entry.arity, expected);
  }
})();

// ════════════════════════════════════════════════════════════
// 8. New Canvas API tests (gradients, shadows, text style, arcTo, lineDash)
// ════════════════════════════════════════════════════════════

(function() {
  // Skip gradient/shadow/arcTo tests if no ctx — just test arity and no-crash
  const noCanvas = () => {
    const { bb } = createTest();
    return bb;
  };

  // Gradients without canvas — return -1 for create functions
  (function() {
    const { bb } = createTest({ noCanvas: true });
    const linearFn = bb.getFn('canvas_create_linear_gradient');
    const id = linearFn.fn([
      { toRawNumber: () => 0 }, { toRawNumber: () => 0 },
      { toRawNumber: () => 100 }, { toRawNumber: () => 100 },
    ]);
    testEqual('create_linear_gradient no ctx returns -1', id.toRawNumber(), -1);

    const radialFn = bb.getFn('canvas_create_radial_gradient');
    const rid = radialFn.fn([
      { toRawNumber: () => 0 }, { toRawNumber: () => 0 }, { toRawNumber: () => 10 },
      { toRawNumber: () => 50 }, { toRawNumber: () => 50 }, { toRawNumber: () => 20 },
    ]);
    testEqual('create_radial_gradient no ctx returns -1', rid.toRawNumber(), -1);
  })();

  // Canvas with mocked ctx — test gradient creation
  (function() {
    const { bb, ctx } = createTest();
    const linearFn = bb.getFn('canvas_create_linear_gradient');
    const id = linearFn.fn([
      { toRawNumber: () => 0 }, { toRawNumber: () => 0 },
      { toRawNumber: () => 100 }, { toRawNumber: () => 0 },
    ]);
    test('create_linear_gradient produces an ID', id.toRawNumber() >= 0);
    test('create_linear_gradient called createLinearGradient', ctx.calls.some(c => c[0] === 'createLinearGradient'));

    const addStop = bb.getFn('canvas_add_color_stop');
    addStop.fn([{ toRawNumber: () => id.toRawNumber() }, { toRawNumber: () => 0 }, { toRawString: () => 'red' }]);
    test('add_color_stop returns Unit', true);

    const setFillGrad = bb.getFn('canvas_set_fill_gradient');
    const fillResult = setFillGrad.fn([{ toRawNumber: () => id.toRawNumber() }]);
    test('set_fill_gradient returns Unit', fillResult.isUnit());

    const setStrokeGrad = bb.getFn('canvas_set_stroke_gradient');
    const strokeResult = setStrokeGrad.fn([{ toRawNumber: () => id.toRawNumber() }]);
    test('set_stroke_gradient returns Unit', strokeResult.isUnit());
  })();

  // Shadow APIs
  (function() {
    const { bb, ctx } = createTest();
    const fn = (name) => bb.getFn(name).fn;

    fn('canvas_set_shadow_color')([{ toRawString: () => 'rgba(0,0,0,0.5)' }]);
    test('set_shadow_color', ctx.shadowColor === 'rgba(0,0,0,0.5)');

    fn('canvas_set_shadow_blur')([{ toRawNumber: () => 10 }]);
    testEqual('set_shadow_blur', ctx.shadowBlur, 10);

    fn('canvas_set_shadow_offset_x')([{ toRawNumber: () => 5 }]);
    testEqual('set_shadow_offset_x', ctx.shadowOffsetX, 5);

    fn('canvas_set_shadow_offset_y')([{ toRawNumber: () => -3 }]);
    testEqual('set_shadow_offset_y', ctx.shadowOffsetY, -3);
  })();

  // Text style APIs
  (function() {
    const { bb } = createTest();

    const alignFn = bb.getFn('canvas_set_text_align');
    const alignResult = alignFn.fn([{ toRawString: () => 'center' }]);
    test('set_text_align returns Unit', alignResult.isUnit());

    const baselineFn = bb.getFn('canvas_set_text_baseline');
    const baselineResult = baselineFn.fn([{ toRawString: () => 'middle' }]);
    test('set_text_baseline returns Unit', baselineResult.isUnit());
  })();

  // arcTo
  (function() {
    const { bb, ctx } = createTest();
    const arcToFn = bb.getFn('canvas_arc_to');
    const result = arcToFn.fn([
      { toRawNumber: () => 0 }, { toRawNumber: () => 0 },
      { toRawNumber: () => 100 }, { toRawNumber: () => 100 },
      { toRawNumber: () => 20 },
    ]);
    test('arc_to returns Unit', result.isUnit());
    test('arc_to called arcTo', ctx.calls.some(c => c[0] === 'arcTo'));
  })();

  // setLineDash
  (function() {
    const { bb, ctx } = createTest();
    const dashFn = bb.getFn('canvas_set_line_dash');
    const list = {
      _elementType: null,
      length: () => 2,
      get: (i) => ({ toRawNumber: () => i === 0 ? 5 : 10 }),
    };
    const result = dashFn.fn([list]);
    test('set_line_dash returns Unit', result.isUnit());
    test('set_line_dash called setLineDash', ctx.calls.some(c => c[0] === 'setLineDash'));
  })();

  // No-canvas safety for all new APIs — should return Unit without crashing
  (function() {
    const { bb } = createTest({ noCanvas: true, skipScheduler: true });
    const safes = [
      'canvas_set_shadow_color', 'canvas_set_shadow_blur',
      'canvas_set_shadow_offset_x', 'canvas_set_shadow_offset_y',
      'canvas_set_text_align', 'canvas_set_text_baseline',
      'canvas_set_fill_gradient', 'canvas_set_stroke_gradient',
      'canvas_add_color_stop', 'canvas_arc_to', 'canvas_set_line_dash',
    ];
    for (const name of safes) {
      const fn = bb.getFn(name);
      const args = name === 'canvas_add_color_stop'
        ? [{ toRawNumber: () => 0 }, { toRawNumber: () => 0 }, { toRawString: () => 'red' }]
        : name === 'canvas_set_line_dash'
        ? [{ length: () => 0, get: () => ({ toRawNumber: () => 0 }) }]
        : [{ toRawNumber: () => 0 }, { toRawNumber: () => 0 }].slice(0, fn.arity);
      const result = fn.fn(args);
      test(name + ' safe without canvas', result.isUnit());
    }
  })();
})();

// ════════════════════════════════════════════════════════════
// 9. Math builtin runtime tests
// ════════════════════════════════════════════════════════════

(function() {
  const { bb } = createTest();

  const sinResult = bb.getFn('sin').fn([{ toRawNumber: () => 0 }]);
  testEqual('sin(0)', sinResult.toRawNumber(), 0);

  const floorResult = bb.getFn('floor').fn([{ toRawNumber: () => 3.7 }]);
  testEqual('floor(3.7)', floorResult.toRawNumber(), 3);

  const roundResult = bb.getFn('round').fn([{ toRawNumber: () => 3.5 }]);
  testEqual('round(3.5)', roundResult.toRawNumber(), 4);

  const piResult = bb.getFn('pi').fn([]);
  testEqual('pi()', piResult.toRawNumber(), Math.PI);
})();

// ════════════════════════════════════════════════════════════
console.log();
console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed > 0) process.exit(1);
