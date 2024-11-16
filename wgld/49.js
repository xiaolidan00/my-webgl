// sample_057
//
// WebGLでゴッドレイフィルタ

// canvas とマウス座標用変数をグローバルに
var c;
var ex = 256;
var ey = 256;

// マウスムーブイベントに登録する処理
function mouseMove(e) {
  ex = e.offsetX;
  ey = e.offsetY;
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
  var eRange = document.getElementById('range');

  // シェーダの準備と各種ロケーションの取得
  var v_shader = create_shader('lighting_vs');
  var f_shader = create_shader('lighting_fs');
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
  uniLocation[5] = gl.getUniformLocation(prg, 'mask');

  // ズームブラーシェーダ
  v_shader = create_shader('zoomblur_vs');
  f_shader = create_shader('zoomblur_fs');
  var zPrg = create_program(v_shader, f_shader);
  var zAttLocation = new Array();
  zAttLocation[0] = gl.getAttribLocation(zPrg, 'position');
  zAttLocation[1] = gl.getAttribLocation(zPrg, 'texCoord');
  var zAttStride = new Array();
  zAttStride[0] = 3;
  zAttStride[1] = 2;
  var zUniLocation = new Array();
  zUniLocation[0] = gl.getUniformLocation(zPrg, 'mvpMatrix');
  zUniLocation[1] = gl.getUniformLocation(zPrg, 'texture');
  zUniLocation[2] = gl.getUniformLocation(zPrg, 'strength');
  zUniLocation[3] = gl.getUniformLocation(zPrg, 'center');

  // 正射影で板ポリゴンをレンダリングするシェーダ
  v_shader = create_shader('zoomblur_vs');
  f_shader = create_shader('ortho_fs');
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
  var mvpMatrix = m.identity(m.create());
  var invMatrix = m.identity(m.create());
  var ortMatrix = m.identity(m.create());

  // ビュー×プロジェクション座標変換行列
  var eyePosition = [0.0, 20.0, 0.0];
  m.lookAt(eyePosition, [0.0, 0.0, 0.0], [0.0, 0.0, -1.0], vMatrix);
  m.perspective(90, c.width / c.height, 0.1, 100, pMatrix);
  m.multiply(pMatrix, vMatrix, tmpMatrix);

  // 正射影用の座標変換行列(合成用)
  m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
  m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
  m.multiply(pMatrix, vMatrix, ortMatrix);

  // 深度テストとカリングを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // ライトの向き
  var lightDirection = [-0.577, 0.577, 0.577];

  // テクスチャ生成
  var texture1 = null;
  create_texture('texture1.png', 1);
  gl.activeTexture(gl.TEXTURE0);

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 512;
  var fBufferHeight = 512;
  var fBufferMask = create_framebuffer(fBufferWidth, fBufferHeight);
  var fBufferBlur = create_framebuffer(fBufferWidth, fBufferHeight);

  // カウンタの宣言
  var count = 0;

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;

    // テクスチャの適用
    gl.bindTexture(gl.TEXTURE_2D, texture1);

    // プログラムオブジェクトの選択
    gl.useProgram(oPrg);

    // フレームバッファのバインド(マスク用)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferMask.f);

    // フレームバッファを初期化
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 一度深度バッファへの描き込みを無効にする
    gl.depthMask(false);

    // 板ポリゴンをレンダリングしテクスチャを画面いっぱいに貼り付ける
    set_attribute(vVBOList, oAttLocation, oAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(oUniLocation[0], false, ortMatrix);
    gl.uniform1i(oUniLocation[1], 0);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // 深度バッファへの描き込みを有効化する
    gl.depthMask(true);

    // プログラムオブジェクトの選択
    gl.useProgram(prg);

    // トーラスのシルエットをレンダリング
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (var i = 0; i < 9; i++) {
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
      gl.uniform1i(uniLocation[5], true);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // プログラムオブジェクトの選択
    gl.useProgram(zPrg);

    // フレームバッファのバインド(ブラー用)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferBlur.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // エレメントから強度係数を取得
    var strength = eRange.value * 0.1;

    // フレームバッファ(マスク用)をテクスチャとして適用
    gl.bindTexture(gl.TEXTURE_2D, fBufferMask.t);

    // ズームブラーをかける
    set_attribute(vVBOList, zAttLocation, zAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(zUniLocation[0], false, ortMatrix);
    gl.uniform1i(zUniLocation[1], 0);
    gl.uniform1f(zUniLocation[2], strength);
    gl.uniform2fv(zUniLocation[3], [ex, ey]);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // canvas を初期化
    gl.clearColor(0.0, 0.0, 0.7, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(oPrg);

    // 背景用に読み込んだ画像をテクスチャとして適用
    gl.bindTexture(gl.TEXTURE_2D, texture1);

    // 一度深度バッファへの描き込みを無効にする
    gl.depthMask(false);

    // 板ポリゴンをレンダリングしテクスチャを画面いっぱいに貼り付ける
    set_attribute(vVBOList, oAttLocation, oAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(oUniLocation[0], false, ortMatrix);
    gl.uniform1i(oUniLocation[1], 0);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // 深度バッファへの描き込みを有効化する
    gl.depthMask(true);

    // プログラムオブジェクトの選択
    gl.useProgram(prg);

    // トーラスをライティング有効でレンダリング
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (var i = 0; i < 9; i++) {
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
      gl.uniform1i(uniLocation[5], false);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // プログラムオブジェクトの選択
    gl.useProgram(oPrg);

    // フレームバッファ(ブラー用)をテクスチャとして適用
    gl.bindTexture(gl.TEXTURE_2D, fBufferBlur.t);

    // 加算合成するためにブレンドを有効化する
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);

    // ブラーを合成
    set_attribute(vVBOList, oAttLocation, oAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(oUniLocation[0], false, ortMatrix);
    gl.uniform1i(oUniLocation[1], 0);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // ブレンドの無効化
    gl.disable(gl.BLEND);

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
};
