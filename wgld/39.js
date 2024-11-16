// sample_045
//
// WebGLでグレアフィルタ

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
  var r = sq * 2.0 * Math.PI * wh;
  if (sq != 1) {
    sq = 1 / sq;
    x *= sq;
    y *= sq;
  }
  q.rotate(r, [y, x, 0.0], qt);
}

onload = function () {
  // canvasエレメントを取得
  c = document.getElementById('canvas');
  c.width = 512;
  c.height = 512;

  // イベント処理
  c.addEventListener('mousemove', mouseMove, true);

  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

  // エレメントへの参照を取得
  var eCheck = document.getElementById('check');
  var eRange = document.getElementById('range');

  // シェーダの準備と各種ロケーションの取得
  var v_shader = create_shader('vs');
  var f_shader = create_shader('fs');
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
  uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
  uniLocation[1] = gl.getUniformLocation(prg, 'invMatrix');
  uniLocation[2] = gl.getUniformLocation(prg, 'lightDirection');
  uniLocation[3] = gl.getUniformLocation(prg, 'eyeDirection');
  uniLocation[4] = gl.getUniformLocation(prg, 'ambientColor');

  // スペキュラ成分だけをレンダリングするシェーダ
  v_shader = create_shader('svs');
  f_shader = create_shader('sfs');
  var sPrg = create_program(v_shader, f_shader);
  var sAttLocation = new Array();
  sAttLocation[0] = gl.getAttribLocation(sPrg, 'position');
  sAttLocation[1] = gl.getAttribLocation(sPrg, 'normal');
  sAttLocation[2] = gl.getAttribLocation(sPrg, 'color');
  var sAttStride = new Array();
  sAttStride[0] = 3;
  sAttStride[1] = 3;
  sAttStride[2] = 4;
  var sUniLocation = new Array();
  sUniLocation[0] = gl.getUniformLocation(sPrg, 'mvpMatrix');
  sUniLocation[1] = gl.getUniformLocation(sPrg, 'invMatrix');
  sUniLocation[2] = gl.getUniformLocation(sPrg, 'lightDirection');
  sUniLocation[3] = gl.getUniformLocation(sPrg, 'eyeDirection');

  // 正射影で板ポリゴンをガウスフィルタでレンダリングするシェーダ
  v_shader = create_shader('bvs');
  f_shader = create_shader('bfs');
  var oPrg = create_program(v_shader, f_shader);
  var oAttLocation = new Array();
  oAttLocation[0] = gl.getAttribLocation(oPrg, 'position');
  oAttLocation[1] = gl.getAttribLocation(oPrg, 'texCoord');
  var oAttStride = new Array();
  oAttStride[0] = 3;
  oAttStride[1] = 2;
  var oUniLocation = new Array();
  oUniLocation[0] = gl.getUniformLocation(oPrg, 'mvpMatrix');
  oUniLocation[1] = gl.getUniformLocation(oPrg, 'texture');
  oUniLocation[2] = gl.getUniformLocation(oPrg, 'gaussian');
  oUniLocation[3] = gl.getUniformLocation(oPrg, 'weight');
  oUniLocation[4] = gl.getUniformLocation(oPrg, 'horizontal');

  // 正射影でレンダリング結果を合成するシェーダ
  v_shader = create_shader('fvs');
  f_shader = create_shader('ffs');
  var fPrg = create_program(v_shader, f_shader);
  var fAttLocation = new Array();
  fAttLocation[0] = gl.getAttribLocation(fPrg, 'position');
  fAttLocation[1] = gl.getAttribLocation(fPrg, 'texCoord');
  var fAttStride = new Array();
  fAttStride[0] = 3;
  fAttStride[1] = 2;
  var fUniLocation = new Array();
  fUniLocation[0] = gl.getUniformLocation(fPrg, 'mvpMatrix');
  fUniLocation[1] = gl.getUniformLocation(fPrg, 'texture1');
  fUniLocation[2] = gl.getUniformLocation(fPrg, 'texture2');
  fUniLocation[3] = gl.getUniformLocation(fPrg, 'glare');

  // トーラスモデル
  var torusData = torus(64, 64, 1.0, 2.0, [1.0, 1.0, 1.0, 1.0]);
  var tPosition = create_vbo(torusData.p);
  var tNormal = create_vbo(torusData.n);
  var tColor = create_vbo(torusData.c);
  var tVBOList = [tPosition, tNormal, tColor];
  var tIndex = create_ibo(torusData.i);

  // 板ポリゴン
  var position = [-1.0, 1.0, 0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0];
  var texCoord = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
  var index = [0, 2, 1, 2, 3, 1];
  var vPosition = create_vbo(position);
  var vTexCoord = create_vbo(texCoord);
  var vVBOList = [vPosition, vTexCoord];
  var vIndex = create_ibo(index);

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var oTmpMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());
  var invMatrix = m.identity(m.create());

  // 深度テストとカリングを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // ライトの向き
  var lightDirection = [-0.577, 0.577, 0.577];

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 512;
  var fBufferHeight = 512;
  var fBuffer1 = create_framebuffer(fBufferWidth, fBufferHeight);
  var fBuffer2 = create_framebuffer(fBufferWidth, fBufferHeight);

  // カウンタの宣言
  var count = 0;
  var count2 = 0;

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;
    if (count % 2 > 0) {
      count2++;
    }

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;

    // ビュー×プロジェクション座標変換行列(パース有り)
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([0.0, 20.0, 0.0], qt, eyePosition);
    q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(90, c.width / c.height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // 正射影用の座標変換行列
    m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
    m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
    m.multiply(pMatrix, vMatrix, oTmpMatrix);

    // gaussianフィルタの重み係数を算出
    var weight = new Array(10);
    var t = 0.0;
    var d = (eRange.value * eRange.value) / 100;
    for (var i = 0; i < weight.length; i++) {
      var r = 1.0 + 2.0 * i;
      var w = Math.exp((-0.5 * (r * r)) / d);
      weight[i] = w;
      if (i > 0) {
        w *= 2.0;
      }
      t += w;
    }
    for (i = 0; i < weight.length; i++) {
      weight[i] /= t;
    }

    // プログラムオブジェクトの選択
    gl.useProgram(sPrg);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer1.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // トーラスのスペキュラ成分だけをフレームバッファにレンダリング
    set_attribute(tVBOList, sAttLocation, sAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (i = 0; i < 9; i++) {
      m.identity(mMatrix);
      m.rotate(mMatrix, (i * 2 * Math.PI) / 9, [0, 1, 0], mMatrix);
      m.translate(mMatrix, [0.0, 0.0, 10.0], mMatrix);
      m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(sUniLocation[0], false, mvpMatrix);
      gl.uniformMatrix4fv(sUniLocation[1], false, invMatrix);
      gl.uniform3fv(sUniLocation[2], lightDirection);
      gl.uniform3fv(sUniLocation[3], eyePosition);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // プログラムオブジェクトの選択
    gl.useProgram(oPrg);

    // フレームバッファのバインドを変更
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer2.f);

    // フレームバッファをテクスチャとして適用
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer1.t);

    // レンダリング(横方向ブラー)
    render(true, true);

    // フレームバッファのバインドを変更
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer1.f);

    // テクスチャを変更
    gl.bindTexture(gl.TEXTURE_2D, fBuffer2.t);

    // レンダリング(縦方向ブラー)
    render(true, false);

    // フレームバッファのバインドを変更
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer2.f);

    // プログラムオブジェクトの選択
    gl.useProgram(prg);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // トーラスをレンダリング
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (i = 0; i < 9; i++) {
      var amb = hsva(i * 40, 1, 1, 1);
      m.identity(mMatrix);
      m.rotate(mMatrix, (i * 2 * Math.PI) / 9, [0, 1, 0], mMatrix);
      m.translate(mMatrix, [0.0, 0.0, 10.0], mMatrix);
      m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
      gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
      gl.uniform3fv(uniLocation[2], lightDirection);
      gl.uniform3fv(uniLocation[3], eyePosition);
      gl.uniform4fv(uniLocation[4], amb);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // テクスチャユニット0はフルカラートーラスのレンダリング結果
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer2.t);

    // テクスチャユニット1はスペキュラ成分のブラー
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer1.t);

    // エレメントからフィルタリングするかどうかのフラグを取得
    var glare = eCheck.checked;

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // キャンバスを初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(fPrg);

    // 板ポリゴンのレンダリング
    set_attribute(vVBOList, fAttLocation, fAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(fUniLocation[0], false, oTmpMatrix);
    gl.uniform1i(fUniLocation[1], 0);
    gl.uniform1i(fUniLocation[2], 1);
    gl.uniform1i(fUniLocation[3], glare);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // コンテキストの再描画
    gl.flush();

    // ループのために再帰呼び出し
    setTimeout(arguments.callee, 1000 / 30);

    // 板ポリゴンのレンダリング関数
    function render(g, h) {
      // バッファを初期化
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // 板ポリゴンのレンダリング
      set_attribute(vVBOList, oAttLocation, oAttStride);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
      gl.uniformMatrix4fv(oUniLocation[0], false, oTmpMatrix);
      gl.uniform1i(oUniLocation[1], 0);
      gl.uniform1i(oUniLocation[2], g);
      gl.uniform1fv(oUniLocation[3], weight);
      gl.uniform1i(oUniLocation[4], h);
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    }
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
