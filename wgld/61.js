// sample_096
//
// WebGLでVTFによるGPGPUパーティクル

window.onload = function () {
  var i, j;
  var run = true; // アニメーション継続フラグ
  var velocity = 0; // パーティクルの加速度係数
  var mouseFlag = false; // マウス操作のフラグ
  var mousePositionX = 0.0; // マウス座標X（-1.0 から 1.0）
  var mousePositionY = 0.0; // マウス座標Y（-1.0 から 1.0）

  // canvasエレメントを取得
  c = document.getElementById('canvas');
  c.width = Math.min(window.innerWidth, window.innerHeight);
  c.height = c.width;

  // WebGLコンテキストの初期化
  var gl = c.getContext('webgl');

  // イベント登録
  c.addEventListener('mousedown', mouseDown, true);
  c.addEventListener('mouseup', mouseUp, true);
  c.addEventListener('mousemove', mouseMove, true);
  window.addEventListener('keydown', keyDown, true);

  // 頂点テクスチャフェッチが利用可能かどうかチェック
  i = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
  if (i > 0) {
    console.log('max_vertex_texture_imaeg_unit: ' + i);
  } else {
    alert('VTF not supported');
    return;
  }

  // 浮動小数点数テクスチャが利用可能かどうかチェック
  var ext;
  ext = gl.getExtension('OES_texture_float') || gl.getExtension('OES_texture_half_float');
  if (ext == null) {
    alert('float texture not supported');
    return;
  }

  // シェーダ用変数
  var v_shader, f_shader;

  // 頂点のレンダリングを行うシェーダ
  v_shader = create_shader('point_vs');
  f_shader = create_shader('point_fs');
  var pPrg = create_program(v_shader, f_shader);

  // locationの初期化
  var pAttLocation = [];
  pAttLocation[0] = gl.getAttribLocation(pPrg, 'index');
  var pAttStride = [];
  pAttStride[0] = 1;
  var pUniLocation = [];
  pUniLocation[0] = gl.getUniformLocation(pPrg, 'resolution');
  pUniLocation[1] = gl.getUniformLocation(pPrg, 'texture');
  pUniLocation[2] = gl.getUniformLocation(pPrg, 'pointScale');
  pUniLocation[3] = gl.getUniformLocation(pPrg, 'ambient');

  // テクスチャへの描き込みを行うシェーダ
  v_shader = create_shader('velocity_vs');
  f_shader = create_shader('velocity_fs');
  var vPrg = create_program(v_shader, f_shader);

  // locationの初期化
  var vAttLocation = [];
  vAttLocation[0] = gl.getAttribLocation(vPrg, 'position');
  var vAttStride = [];
  vAttStride[0] = 3;
  var vUniLocation = [];
  vUniLocation[0] = gl.getUniformLocation(vPrg, 'resolution');
  vUniLocation[1] = gl.getUniformLocation(vPrg, 'texture');
  vUniLocation[2] = gl.getUniformLocation(vPrg, 'mouse');
  vUniLocation[3] = gl.getUniformLocation(vPrg, 'mouseFlag');
  vUniLocation[4] = gl.getUniformLocation(vPrg, 'velocity');

  // テクスチャへの描き込みを行うシェーダ
  v_shader = create_shader('default_vs');
  f_shader = create_shader('default_fs');
  var dPrg = create_program(v_shader, f_shader);

  // locationの初期化
  var dAttLocation = [];
  dAttLocation[0] = gl.getAttribLocation(dPrg, 'position');
  var dAttStride = [];
  dAttStride[0] = 3;
  var dUniLocation = [];
  dUniLocation[0] = gl.getUniformLocation(dPrg, 'resolution');

  // テクスチャの幅と高さ
  var TEXTURE_WIDTH = 512;
  var TEXTURE_HEIGHT = 512;
  var resolution = [TEXTURE_WIDTH, TEXTURE_HEIGHT];

  // 頂点
  var vertices = new Array(TEXTURE_WIDTH * TEXTURE_HEIGHT);

  // 頂点のインデックスを連番で割り振る
  for (i = 0, j = vertices.length; i < j; i++) {
    vertices[i] = i;
  }

  // 頂点情報からVBO生成
  var vIndex = create_vbo(vertices);
  var vVBOList = [vIndex];

  // 板ポリ
  var position = [-1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, 1.0, 0.0, 1.0, -1.0, 0.0];
  var vPlane = create_vbo(position);
  var planeVBOList = [vPlane];

  // フレームバッファの生成
  var backBuffer = create_framebuffer(TEXTURE_WIDTH, TEXTURE_WIDTH, gl.FLOAT);
  var frontBuffer = create_framebuffer(TEXTURE_WIDTH, TEXTURE_WIDTH, gl.FLOAT);
  var flip = null;

  // フラグ
  gl.disable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  // デフォルトの頂点情報を書き込む
  (function () {
    // フレームバッファをバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, backBuffer.f);

    // ビューポートを設定
    gl.viewport(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(dPrg);

    // テクスチャへ頂点情報をレンダリング
    set_attribute(planeVBOList, dAttLocation, dAttStride);
    gl.uniform2fv(dUniLocation[0], resolution);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, position.length / 3);
  })();

  // レンダリング関数の呼び出し
  var count = 0;
  var ambient = [];
  render();

  // 恒常ループ
  function render() {
    // ブレンドは無効化
    gl.disable(gl.BLEND);

    // フレームバッファをバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, frontBuffer.f);

    // ビューポートを設定
    gl.viewport(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(vPrg);

    // テクスチャとしてバックバッファをバインド
    gl.bindTexture(gl.TEXTURE_2D, backBuffer.t);

    // テクスチャへ頂点情報をレンダリング
    set_attribute(planeVBOList, vAttLocation, vAttStride);
    gl.uniform2fv(vUniLocation[0], resolution);
    gl.uniform1i(vUniLocation[1], 0);
    gl.uniform2fv(vUniLocation[2], [mousePositionX, mousePositionY]);
    gl.uniform1i(vUniLocation[3], mouseFlag);
    gl.uniform1f(vUniLocation[4], velocity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, position.length / 3);

    // パーティクルの色
    count++;
    ambient = hsva(count % 360, 1.0, 0.8, 1.0);

    // ブレンドを有効化
    gl.enable(gl.BLEND);

    // ビューポートを設定
    gl.viewport(0, 0, c.width, c.height);

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(pPrg);

    // フレームバッファをテクスチャとしてバインド
    gl.bindTexture(gl.TEXTURE_2D, frontBuffer.t);

    // 頂点を描画
    set_attribute(vVBOList, pAttLocation, pAttStride);
    gl.uniform2fv(pUniLocation[0], resolution);
    gl.uniform1i(pUniLocation[1], 0);
    gl.uniform1f(pUniLocation[2], velocity);
    gl.uniform4fv(pUniLocation[3], ambient);
    gl.drawArrays(gl.POINTS, 0, vertices.length);

    // コンテキストの再描画
    gl.flush();

    // 加速度の調整
    if (mouseFlag) {
      velocity = 1.0;
    } else {
      velocity *= 0.95;
    }

    // フレームバッファをフリップ
    flip = backBuffer;
    backBuffer = frontBuffer;
    frontBuffer = flip;

    // ループのために再帰呼び出し
    if (run) {
      requestAnimationFrame(render);
    }
  }

  // イベント処理
  function mouseDown(eve) {
    mouseFlag = true;
  }
  function mouseUp(eve) {
    mouseFlag = false;
  }
  function mouseMove(eve) {
    if (mouseFlag) {
      var cw = c.width;
      var ch = c.height;
      mousePositionX = ((eve.clientX - c.offsetLeft - cw / 2.0) / cw) * 2.0;
      mousePositionY = (-(eve.clientY - c.offsetTop - ch / 2.0) / ch) * 2.0;
    }
  }
  function keyDown(eve) {
    run = eve.keyCode !== 27;
  }

  // シェーダを生成する関数
  function create_shader(id) {
    // シェーダを格納する変数
    var shader;

    // HTMLからscriptタグへの参照を取得
    var scriptElement = document.getElementById(id);

    // scriptタグが存在しない場合は抜ける
    if (!scriptElement) {
      return;
    }

    // scriptタグのtype属性をチェック
    switch (scriptElement.type) {
      // 頂点シェーダの場合
      case 'x-shader/x-vertex':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;

      // フラグメントシェーダの場合
      case 'x-shader/x-fragment':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      default:
        return;
    }

    // 生成されたシェーダにソースを割り当てる
    gl.shaderSource(shader, scriptElement.text);

    // シェーダをコンパイルする
    gl.compileShader(shader);

    // シェーダが正しくコンパイルされたかチェック
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      // 成功していたらシェーダを返して終了
      return shader;
    } else {
      // 失敗していたらエラーログをアラートする
      alert(gl.getShaderInfoLog(shader));
    }
  }

  // プログラムオブジェクトを生成しシェーダをリンクする関数
  function create_program(vs, fs) {
    // プログラムオブジェクトの生成
    var program = gl.createProgram();

    // プログラムオブジェクトにシェーダを割り当てる
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);

    // シェーダをリンク
    gl.linkProgram(program);

    // シェーダのリンクが正しく行なわれたかチェック
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      // 成功していたらプログラムオブジェクトを有効にする
      gl.useProgram(program);

      // プログラムオブジェクトを返して終了
      return program;
    } else {
      // 失敗していたらエラーログをアラートする
      alert(gl.getProgramInfoLog(program));
    }
  }

  // VBOを生成する関数
  function create_vbo(data) {
    // バッファオブジェクトの生成
    var vbo = gl.createBuffer();

    // バッファをバインドする
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // バッファにデータをセット
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // 生成した VBO を返して終了
    return vbo;
  }

  // VBOをバインドし登録する関数
  function set_attribute(vbo, attL, attS) {
    // 引数として受け取った配列を処理する
    for (var i in vbo) {
      // バッファをバインドする
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);

      // attributeLocationを有効にする
      gl.enableVertexAttribArray(attL[i]);

      // attributeLocationを通知し登録する
      gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
  }

  // フレームバッファをオブジェクトとして生成する関数
  function create_framebuffer(width, height, format) {
    // フォーマットチェック
    var textureFormat = null;
    if (!format) {
      textureFormat = gl.UNSIGNED_BYTE;
    } else {
      textureFormat = format;
    }

    // フレームバッファの生成
    var frameBuffer = gl.createFramebuffer();

    // フレームバッファをWebGLにバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // 深度バッファ用レンダーバッファの生成とバインド
    var depthRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);

    // レンダーバッファを深度バッファとして設定
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

    // フレームバッファにレンダーバッファを関連付ける
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      depthRenderBuffer
    );

    // フレームバッファ用テクスチャの生成
    var fTexture = gl.createTexture();

    // フレームバッファ用のテクスチャをバインド
    gl.bindTexture(gl.TEXTURE_2D, fTexture);

    // フレームバッファ用のテクスチャにカラー用のメモリ領域を確保
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, textureFormat, null);

    // テクスチャパラメータ
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // フレームバッファにテクスチャを関連付ける
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);

    // 各種オブジェクトのバインドを解除
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // オブジェクトを返して終了
    return { f: frameBuffer, d: depthRenderBuffer, t: fTexture };
  }
};
