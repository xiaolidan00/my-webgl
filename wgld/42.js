// sample_050
//
// WebGLでパーティクルフォグ

// canvas とクォータニオンをグローバルに扱う
var c;
var q = new qtnIV();
var qt = q.identity(q.create());

// マウスムーブイベントに登録する処理
function mouseMove(e) {
  var cw = c.width;
  var ch = c.height;
  var wh = 1 / Math.sqrt(cw * cw + ch * ch);
  var x = e.clientX - c.offsetLeft - cw * 0.5;
  var y = e.clientY - c.offsetTop - ch * 0.5;
  var sq = Math.sqrt(x * x + y * y);
  var r = sq * 0.5 * Math.PI * wh;
  if (sq != 1) {
    sq = 1 / sq;
    x *= sq;
    y *= sq;
  }
  q.rotate(r, [y, x, 0.0], qt);
}

onload = function () {
  // webgl用のcanvasエレメントを取得
  c = document.getElementById('canvas');
  c.width = 512;
  c.height = 512;

  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

  // ノイズを生成し専用のcanvasに割り当てる
  var n = new noiseX(5, 2, 0.6);
  n.setSeed(new Date().getTime());
  var noiseCanvas;
  var noiseColor = new Array(128 * 128);
  for (var i = 0; i < 128; i++) {
    for (var j = 0; j < 128; j++) {
      noiseColor[i * 128 + j] = n.snoise(i, j, 128);
      noiseColor[i * 128 + j] *= noiseColor[i * 128 + j];
    }
  }
  noiseCanvas = n.canvasExport(noiseColor, 128);

  // ノイズテクスチャの準備
  var noiseTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noiseCanvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // イベント処理
  c.addEventListener('mousemove', mouseMove, true);

  // エレメントを取得
  var eCheck = document.getElementById('check');
  var eRange = document.getElementById('range');

  // シーンをレンダリングするメインシェーダ
  var v_shader = create_shader('main_vs');
  var f_shader = create_shader('main_fs');
  var prg = create_program(v_shader, f_shader);
  var attLocation = new Array();
  attLocation[0] = gl.getAttribLocation(prg, 'position');
  attLocation[1] = gl.getAttribLocation(prg, 'normal');
  attLocation[2] = gl.getAttribLocation(prg, 'color');
  var attStride = new Array();
  attStride[0] = 3;
  attStride[1] = 3;
  attStride[2] = 4;
  var uniLocation = new Array();
  uniLocation[0] = gl.getUniformLocation(prg, 'mMatrix');
  uniLocation[1] = gl.getUniformLocation(prg, 'mvpMatrix');
  uniLocation[2] = gl.getUniformLocation(prg, 'invMatrix');
  uniLocation[3] = gl.getUniformLocation(prg, 'lightDirection');
  uniLocation[4] = gl.getUniformLocation(prg, 'eyePosition');
  uniLocation[5] = gl.getUniformLocation(prg, 'ambientColor');

  // 深度をレンダリングするシェーダ
  v_shader = create_shader('depthMap_vs');
  f_shader = create_shader('depthMap_fs');
  dPrg = create_program(v_shader, f_shader);
  var dAttLocation = new Array();
  dAttLocation[0] = gl.getAttribLocation(dPrg, 'position');
  var dAttStride = new Array();
  dAttStride[0] = 3;
  var dUniLocation = new Array();
  dUniLocation[0] = gl.getUniformLocation(dPrg, 'mvpMatrix');

  // パーティクルフォグをレンダリングするシェーダ
  v_shader = create_shader('fog_vs');
  f_shader = create_shader('fog_fs');
  fPrg = create_program(v_shader, f_shader);
  var fAttLocation = new Array();
  fAttLocation[0] = gl.getAttribLocation(fPrg, 'position');
  fAttLocation[1] = gl.getAttribLocation(fPrg, 'color');
  fAttLocation[2] = gl.getAttribLocation(fPrg, 'texCoord');
  var fAttStride = new Array();
  fAttStride[0] = 3;
  fAttStride[1] = 4;
  fAttStride[2] = 2;
  var fUniLocation = new Array();
  fUniLocation[0] = gl.getUniformLocation(fPrg, 'mMatrix');
  fUniLocation[1] = gl.getUniformLocation(fPrg, 'mvpMatrix');
  fUniLocation[2] = gl.getUniformLocation(fPrg, 'tMatrix');
  fUniLocation[3] = gl.getUniformLocation(fPrg, 'offset');
  fUniLocation[4] = gl.getUniformLocation(fPrg, 'distLength');
  fUniLocation[5] = gl.getUniformLocation(fPrg, 'depthTexture');
  fUniLocation[6] = gl.getUniformLocation(fPrg, 'noiseTexture');
  fUniLocation[7] = gl.getUniformLocation(fPrg, 'softParticle');

  // トーラスモデル
  var torusData = torus(64, 64, 0.25, 0.5);
  var tPosition = create_vbo(torusData.p);
  var tNormal = create_vbo(torusData.n);
  var tColor = create_vbo(torusData.c);
  var tVBOList = [tPosition, tNormal, tColor];
  var tpVBOList = [tPosition];
  var tIndex = create_ibo(torusData.i);

  // ボックスモデル
  var position = [
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, -1.0, 0.0, 0.0, -1.0, -1.0, 1.0, 0.0, -1.0, 0.0, 0.0,
    0.0, 0.0, 1.0
  ];
  var color = [
    0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3,
    1.0, 0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3, 1.0
  ];
  var index = [0, 2, 3, 0, 3, 1, 2, 4, 5, 2, 5, 3, 1, 3, 5, 1, 5, 6];
  var bPosition = create_vbo(position);
  var bColor = create_vbo(color);
  var bVBOList = [bPosition, bPosition, bColor];
  var bpVBOList = [bPosition];
  var bIndex = create_ibo(index);

  // パーティクル
  position = [-1.0, 1.0, 0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0];
  color = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
  var texCoord = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
  var ptclIndex = [0, 2, 1, 1, 2, 3];
  var pPosition = create_vbo(position);
  var pColor = create_vbo(color);
  var pTexCoord = create_vbo(texCoord);
  var pVBOList = [pPosition, pColor, pTexCoord];
  var pIndex = create_ibo(ptclIndex);

  // パーティクル用のデータを初期化
  var particleCount = 30;
  var offsetPositionX = new Array(particleCount);
  var offsetPositionZ = new Array(particleCount);
  var offsetPositionS = new Array(particleCount);
  var offsetTexCoordS = new Array(particleCount);
  var offsetTexCoordT = new Array(particleCount);
  for (i = 0; i < particleCount; i++) {
    offsetPositionX[i] = Math.random() * 6.0 - 3.0;
    offsetPositionZ[i] = -Math.random() * 1.5 + 0.5;
    offsetPositionS[i] = Math.random() * 0.02;
    offsetTexCoordS[i] = Math.random();
    offsetTexCoordT[i] = Math.random();
  }
  offsetPositionZ.sort(function (a, b) {
    return a - b;
  });

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var tMatrix = m.identity(m.create());
  var tvpMatrix = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());
  var invMatrix = m.identity(m.create());

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 512;
  var fBufferHeight = 512;
  var fBufferDepth = create_framebuffer(fBufferWidth, fBufferHeight);

  // 深度テストとカリング、ブレンドを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
  gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

  // ライトの向き
  var lightDirection = [-0.577, 0.577, 0.577];

  // カウンタの宣言
  var count = 0;

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    rad = ((count % 360) * Math.PI) / 180;

    // ビュー×プロジェクション座標変換行列
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([0.0, 0.0, 5.0], qt, eyePosition);
    q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 10, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // テクスチャ変換用行列
    tMatrix[0] = 0.5;
    tMatrix[1] = 0.0;
    tMatrix[2] = 0.0;
    tMatrix[3] = 0.0;
    tMatrix[4] = 0.0;
    tMatrix[5] = 0.5;
    tMatrix[6] = 0.0;
    tMatrix[7] = 0.0;
    tMatrix[8] = 0.0;
    tMatrix[9] = 0.0;
    tMatrix[10] = 1.0;
    tMatrix[11] = 0.0;
    tMatrix[12] = 0.5;
    tMatrix[13] = 0.5;
    tMatrix[14] = 0.0;
    tMatrix[15] = 1.0;
    m.multiply(tMatrix, pMatrix, tvpMatrix);
    m.multiply(tvpMatrix, vMatrix, tMatrix);

    // フレームバッファのバインドとクリア
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferDepth.f);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 深度のレンダリング用にプログラムオブジェクトを選択
    gl.useProgram(dPrg);

    // 深度のレンダリング用にブレンドを無効化
    gl.disable(gl.BLEND);

    // トーラスのレンダリング
    set_attribute(tpVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.translate(mMatrix, [0.0, 0.5, 0.0], mMatrix);
    m.rotate(mMatrix, Math.PI * 0.5, [1, 0, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(dUniLocation[0], false, mvpMatrix);
    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

    // ボックスのレンダリング
    set_attribute(bpVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bIndex);
    m.identity(mMatrix);
    m.scale(mMatrix, [2.0, 2.0, 2.0], mMatrix);
    m.translate(mMatrix, [0.0, -0.25, 0.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(dUniLocation[0], false, mvpMatrix);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // canvasを初期化
    gl.clearColor(0.0, 0.7, 0.7, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(prg);

    // ブレンドを有効化
    gl.enable(gl.BLEND);

    // トーラスのレンダリング
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.translate(mMatrix, [0.0, 0.5, 0.0], mMatrix);
    m.rotate(mMatrix, Math.PI * 0.5, [1, 0, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.uniform3fv(uniLocation[3], lightDirection);
    gl.uniform3fv(uniLocation[4], eyePosition);
    gl.uniform4fv(uniLocation[5], [0.0, 0.0, 0.0, 0.0]);
    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

    // ボックスのレンダリング
    set_attribute(bVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bIndex);
    m.identity(mMatrix);
    m.scale(mMatrix, [2.0, 2.0, 2.0], mMatrix);
    m.translate(mMatrix, [0.0, -0.25, 0.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // プログラムオブジェクトの選択
    gl.useProgram(fPrg);

    // テクスチャのバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBufferDepth.t);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

    // エレメントからソフトパーティクルを適用するか真偽値を取得
    var softParticle = eCheck.checked;

    // エレメントから深度の比較指数を取得
    var depthCoef = eRange.value * 0.001;

    // パーティクルのレンダリング
    set_attribute(pVBOList, fAttLocation, fAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pIndex);
    for (var i = 0; i < particleCount; i++) {
      offsetPositionX[i] += offsetPositionS[i];
      if (offsetPositionX[i] > 3.0) {
        offsetPositionX[i] = -3.0;
      }
      m.identity(mMatrix);
      m.translate(mMatrix, [offsetPositionX[i], 0.5, offsetPositionZ[i]], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      gl.uniformMatrix4fv(fUniLocation[0], false, mMatrix);
      gl.uniformMatrix4fv(fUniLocation[1], false, mvpMatrix);
      gl.uniformMatrix4fv(fUniLocation[2], false, tMatrix);
      gl.uniform2fv(fUniLocation[3], [offsetTexCoordS[i], offsetTexCoordT[i]]);
      gl.uniform1f(fUniLocation[4], depthCoef);
      gl.uniform1i(fUniLocation[5], 0);
      gl.uniform1i(fUniLocation[6], 1);
      gl.uniform1i(fUniLocation[7], softParticle);
      gl.drawElements(gl.TRIANGLES, ptclIndex.length, gl.UNSIGNED_SHORT, 0);
    }

    // コンテキストの再描画
    gl.flush();

    // ループのために再帰呼び出し
    setTimeout(arguments.callee, 1000 / 30);
  })();

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

  // IBOを生成する関数
  function create_ibo(data) {
    // バッファオブジェクトの生成
    var ibo = gl.createBuffer();

    // バッファをバインドする
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    // バッファにデータをセット
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // 生成したIBOを返して終了
    return ibo;
  }

  // フレームバッファをオブジェクトとして生成する関数
  function create_framebuffer(width, height) {
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // テクスチャパラメータ
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
