// sample_046
//
// WebGLで被写界深度

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
  var r = sq * 0.04 * Math.PI * wh;
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
  var eSelect = document.getElementById('select');
  var eRange = document.getElementById('range');

  // シーンをレンダリングするメインシェーダ
  var v_shader = create_shader('main_vs');
  var f_shader = create_shader('main_fs');
  var prg = create_program(v_shader, f_shader);
  var attLocation = new Array();
  attLocation[0] = gl.getAttribLocation(prg, 'position');
  attLocation[1] = gl.getAttribLocation(prg, 'normal');
  attLocation[2] = gl.getAttribLocation(prg, 'color');
  attLocation[3] = gl.getAttribLocation(prg, 'texCoord');
  var attStride = new Array();
  attStride[0] = 3;
  attStride[1] = 3;
  attStride[2] = 4;
  attStride[3] = 2;
  var uniLocation = new Array();
  uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
  uniLocation[1] = gl.getUniformLocation(prg, 'invMatrix');
  uniLocation[2] = gl.getUniformLocation(prg, 'lightDirection');
  uniLocation[3] = gl.getUniformLocation(prg, 'eyeDirection');
  uniLocation[4] = gl.getUniformLocation(prg, 'ambientColor');
  uniLocation[5] = gl.getUniformLocation(prg, 'texture');

  // 深度をレンダリングするシェーダ
  v_shader = create_shader('depthMap_vs');
  f_shader = create_shader('depthMap_fs');
  var dPrg = create_program(v_shader, f_shader);
  var dAttLocation = new Array();
  dAttLocation[0] = gl.getAttribLocation(dPrg, 'position');
  var dAttStride = new Array();
  dAttStride[0] = 3;
  var dUniLocation = new Array();
  dUniLocation[0] = gl.getUniformLocation(dPrg, 'mvpMatrix');
  dUniLocation[1] = gl.getUniformLocation(dPrg, 'depthOffset');

  // 正射影で板ポリゴンをgaussianフィルタでレンダリングするシェーダ
  v_shader = create_shader('gaussian_vs');
  f_shader = create_shader('gaussian_fs');
  var gPrg = create_program(v_shader, f_shader);
  var gAttLocation = new Array();
  gAttLocation[0] = gl.getAttribLocation(gPrg, 'position');
  gAttLocation[1] = gl.getAttribLocation(gPrg, 'texCoord');
  var gAttStride = new Array();
  gAttStride[0] = 3;
  gAttStride[1] = 2;
  var gUniLocation = new Array();
  gUniLocation[0] = gl.getUniformLocation(gPrg, 'mvpMatrix');
  gUniLocation[1] = gl.getUniformLocation(gPrg, 'texture');
  gUniLocation[2] = gl.getUniformLocation(gPrg, 'gaussian');
  gUniLocation[3] = gl.getUniformLocation(gPrg, 'horizontal');
  gUniLocation[4] = gl.getUniformLocation(gPrg, 'bufferWidth');
  gUniLocation[5] = gl.getUniformLocation(gPrg, 'weight');

  // 正射影でレンダリング結果を合成するシェーダ
  v_shader = create_shader('final_vs');
  f_shader = create_shader('final_fs');
  var fPrg = create_program(v_shader, f_shader);
  var fAttLocation = new Array();
  fAttLocation[0] = gl.getAttribLocation(fPrg, 'position');
  fAttLocation[1] = gl.getAttribLocation(fPrg, 'texCoord');
  var fAttStride = new Array();
  fAttStride[0] = 3;
  fAttStride[1] = 2;
  var fUniLocation = new Array();
  fUniLocation[0] = gl.getUniformLocation(fPrg, 'mvpMatrix');
  fUniLocation[1] = gl.getUniformLocation(fPrg, 'depthTexture');
  fUniLocation[2] = gl.getUniformLocation(fPrg, 'sceneTexture');
  fUniLocation[3] = gl.getUniformLocation(fPrg, 'blurTexture1');
  fUniLocation[4] = gl.getUniformLocation(fPrg, 'blurTexture2');
  fUniLocation[5] = gl.getUniformLocation(fPrg, 'result');

  // トーラスモデル
  var torusData = torus(64, 64, 0.3, 0.7, [1.0, 1.0, 1.0, 1.0]);
  var tPosition = create_vbo(torusData.p);
  var tNormal = create_vbo(torusData.n);
  var tColor = create_vbo(torusData.c);
  var tTexCoord = create_vbo(torusData.t);
  var tVBOList = [tPosition, tNormal, tColor, tTexCoord];
  var dtVBOList = [tPosition];
  var tIndex = create_ibo(torusData.i);

  // キューブモデル
  var cubeData = cube(2.0, [1.0, 1.0, 1.0, 1.0]);
  var cPosition = create_vbo(cubeData.p);
  var cNormal = create_vbo(cubeData.n);
  var cColor = create_vbo(cubeData.c);
  var cTexCoord = create_vbo(cubeData.t);
  var cVBOList = [cPosition, cNormal, cColor, cTexCoord];
  var dcVBOList = [cPosition];
  var cIndex = create_ibo(cubeData.i);

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
  var fBufferDepth = create_framebuffer(fBufferWidth, fBufferHeight);
  var fBufferScene = create_framebuffer(fBufferWidth, fBufferHeight);
  var fBufferBlurScene1 = create_framebuffer(fBufferWidth, fBufferHeight);
  var fBufferBlurScene2 = create_framebuffer(fBufferWidth, fBufferHeight);
  var fBufferBlurTemp = create_framebuffer(fBufferWidth, fBufferHeight);

  var texture1 = create_texture('texture.png', 1);

  // gaussianフィルタの重み係数を算出
  var weight1 = gaussian_weight(10, 15.0);
  var weight2 = gaussian_weight(10, 45.0);

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
    var rad = new Array();
    for (var i = 0; i < 9; i++) {
      rad[i] = (((count + 40 * i) % 360) * Math.PI) / 180;
    }

    // ビュー×プロジェクション座標変換行列(パース有り)
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([2.0, 0.0, 10.0], qt, eyePosition);
    q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(90, c.width / c.height, 0.1, 30, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // 正射影用の座標変換行列
    m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
    m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
    m.multiply(pMatrix, vMatrix, oTmpMatrix);

    // プログラムオブジェクトの選択(シーンのレンダリング)--------------------------------------
    gl.useProgram(prg);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferScene.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // テクスチャのバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);

    // シーンをレンダリング(キューブ)
    gl.cullFace(gl.FRONT);
    set_attribute(cVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);
    m.identity(mMatrix);
    m.scale(mMatrix, [3.5, 2.5, 10.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
    gl.uniform3fv(uniLocation[2], lightDirection);
    gl.uniform3fv(uniLocation[3], [0.0, 0.0, 10.0]);
    gl.uniform4fv(uniLocation[4], [1.0, 1.0, 1.0, 1.0]);
    gl.uniform1i(uniLocation[5], 0);
    gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);

    // シーンをレンダリング(トーラス)
    gl.cullFace(gl.BACK);
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (i = 0; i < 9; i++) {
      var amb = hsva(i * 40, 1, 1, 1);
      m.identity(mMatrix);
      m.translate(mMatrix, [0.0 + 0.2 * i, 0.0, 8.8 - 2.2 * i], mMatrix);
      m.rotate(mMatrix, rad[i], [1, 1, 0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
      gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
      gl.uniform3fv(uniLocation[2], lightDirection);
      gl.uniform3fv(uniLocation[3], eyePosition);
      gl.uniform4fv(uniLocation[4], amb);
      gl.uniform1i(uniLocation[5], 0);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // プログラムオブジェクトの選択(gaussian フィルタ)-----------------------------------------
    gl.useProgram(gPrg);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferBlurTemp.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // テクスチャのバインド(ぼけていないシーンをテクスチャとしてバインド)
    gl.bindTexture(gl.TEXTURE_2D, fBufferScene.t);

    // 板ポリゴンのレンダリング
    set_attribute(vVBOList, gAttLocation, gAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(gUniLocation[0], false, oTmpMatrix);
    gl.uniform1i(gUniLocation[1], 0);
    gl.uniform1i(gUniLocation[2], true);
    gl.uniform1i(gUniLocation[3], true);
    gl.uniform1f(gUniLocation[4], fBufferWidth);
    gl.uniform1fv(gUniLocation[5], weight1);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferBlurScene1.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // テクスチャのバインド
    gl.bindTexture(gl.TEXTURE_2D, fBufferBlurTemp.t);

    // 板ポリゴンのレンダリング
    set_attribute(vVBOList, gAttLocation, gAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(gUniLocation[0], false, oTmpMatrix);
    gl.uniform1i(gUniLocation[1], 0);
    gl.uniform1i(gUniLocation[2], true);
    gl.uniform1i(gUniLocation[3], false);
    gl.uniform1f(gUniLocation[4], fBufferWidth);
    gl.uniform1fv(gUniLocation[5], weight1);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferBlurTemp.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // テクスチャのバインド
    gl.bindTexture(gl.TEXTURE_2D, fBufferScene.t);

    // 板ポリゴンのレンダリング
    set_attribute(vVBOList, gAttLocation, gAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(gUniLocation[0], false, oTmpMatrix);
    gl.uniform1i(gUniLocation[1], 0);
    gl.uniform1i(gUniLocation[2], true);
    gl.uniform1i(gUniLocation[3], true);
    gl.uniform1f(gUniLocation[4], fBufferWidth);
    gl.uniform1fv(gUniLocation[5], weight2);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferBlurScene2.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // テクスチャのバインド
    gl.bindTexture(gl.TEXTURE_2D, fBufferBlurTemp.t);

    // 板ポリゴンのレンダリング
    set_attribute(vVBOList, gAttLocation, gAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(gUniLocation[0], false, oTmpMatrix);
    gl.uniform1i(gUniLocation[1], 0);
    gl.uniform1i(gUniLocation[2], true);
    gl.uniform1i(gUniLocation[3], false);
    gl.uniform1f(gUniLocation[4], fBufferWidth);
    gl.uniform1fv(gUniLocation[5], weight2);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // フォーカスする深度値をエレメントから取得------------------------------------------------
    var depthOffset = eRange.value * 0.01 - 0.5;
    depthOffset *= 0.85;

    // プログラムオブジェクトの選択(深度のレンダリング)
    gl.useProgram(dPrg);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferDepth.f);

    // フレームバッファを初期化
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 深度をレンダリング(キューブ)
    gl.cullFace(gl.FRONT);
    set_attribute(dcVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);
    m.identity(mMatrix);
    m.scale(mMatrix, [3.5, 2.5, 10.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(dUniLocation[0], false, mvpMatrix);
    gl.uniform1f(dUniLocation[1], depthOffset);
    gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);

    // 深度をレンダリング(トーラス)
    gl.cullFace(gl.BACK);
    set_attribute(dtVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (i = 0; i < 9; i++) {
      m.identity(mMatrix);
      m.translate(mMatrix, [0.0 + 0.2 * i, 0.0, 8.8 - 2.2 * i], mMatrix);
      m.rotate(mMatrix, rad[i], [1, 1, 0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      gl.uniformMatrix4fv(dUniLocation[0], false, mvpMatrix);
      gl.uniform1f(dUniLocation[1], depthOffset);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // 最終レンダリング結果をエレメントから取得し選択できるようにする--------------------------
    var result = eSelect.selectedIndex;

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // テクスチャのバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBufferDepth.t);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fBufferScene.t);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fBufferBlurScene1.t);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, fBufferBlurScene2.t);

    // キャンバスを初期化
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
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
    gl.uniform1i(fUniLocation[3], 2);
    gl.uniform1i(fUniLocation[4], 3);
    gl.uniform1i(fUniLocation[5], result);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

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

  // テクスチャを生成する関数
  function create_texture(source, number) {
    // イメージオブジェクトの生成
    var img = new Image();

    // データのオンロードをトリガーにする
    img.onload = function () {
      // テクスチャオブジェクトの生成
      var tex = gl.createTexture();

      // テクスチャをバインドする
      gl.bindTexture(gl.TEXTURE_2D, tex);

      // テクスチャへイメージを適用
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      // ミップマップを生成
      gl.generateMipmap(gl.TEXTURE_2D);

      // テクスチャパラメータの設定
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // 生成したテクスチャを変数に代入
      switch (number) {
        case 1:
          texture1 = tex;
          break;
        case 2:
          texture2 = tex;
          break;
        default:
          break;
      }

      // テクスチャのバインドを無効化
      gl.bindTexture(gl.TEXTURE_2D, null);
    };

    // イメージオブジェクトのソースを指定
    img.src = source;
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

  // gaussian ブラーの重みを計算する関数
  function gaussian_weight(cnt, dis) {
    var weight = new Array(cnt);
    var t = 0.0;
    var d = (dis * dis) / 10;
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
    return weight;
  }
};
