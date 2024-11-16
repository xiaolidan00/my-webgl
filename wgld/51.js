// sample_060
//
// WebGLで高解像度シャドウマッピング改

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
  var eRange = document.getElementById('range');

  // 頂点シェーダとフラグメントシェーダからプログラムオブジェクトを生成
  var v_shader = create_shader('svs');
  var f_shader = create_shader('sfs');
  var prg = create_program(v_shader, f_shader);

  // 同上(シャドウマップ用)
  v_shader = create_shader('dvs');
  f_shader = create_shader('dfs');
  var dPrg = create_program(v_shader, f_shader);

  // attributeLocationを配列に取得
  var attLocation = new Array();
  attLocation[0] = gl.getAttribLocation(prg, 'position');
  attLocation[1] = gl.getAttribLocation(prg, 'normal');
  attLocation[2] = gl.getAttribLocation(prg, 'color');

  // attributeの要素数を配列に格納
  var attStride = new Array();
  attStride[0] = 3;
  attStride[1] = 3;
  attStride[2] = 4;

  // attributeLocationを配列に取得(シャドウマップ用)
  var dAttLocation = [gl.getAttribLocation(dPrg, 'position')];

  // attributeの要素数を配列に格納(シャドウマップ用)
  var dAttStride = [3];

  // トーラスモデル
  var torusData = torus(64, 64, 1.0, 2.0, [1.0, 1.0, 1.0, 1.0]);
  var tPosition = create_vbo(torusData.p);
  var tNormal = create_vbo(torusData.n);
  var tColor = create_vbo(torusData.c);
  var tVBOList = [tPosition, tNormal, tColor];
  var tIndex = create_ibo(torusData.i);

  // 板ポリゴン
  var position = [-1.0, 0.0, -1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
  var normal = [0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0];
  var color = [0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0];
  var index = [0, 2, 1, 3, 1, 2];
  var vPosition = create_vbo(position);
  var vNormal = create_vbo(normal);
  var vColor = create_vbo(color);
  var vVBOList = [vPosition, vNormal, vColor];
  var vIndex = create_ibo(index);

  // シャドウマップ用VBOList
  var dtVBOList = [tPosition];
  var dvVBOList = [vPosition];

  // uniformLocationを配列に取得
  var uniLocation = new Array();
  uniLocation[0] = gl.getUniformLocation(prg, 'mMatrix');
  uniLocation[1] = gl.getUniformLocation(prg, 'mvpMatrix');
  uniLocation[2] = gl.getUniformLocation(prg, 'invMatrix');
  uniLocation[3] = gl.getUniformLocation(prg, 'tMatrix');
  uniLocation[4] = gl.getUniformLocation(prg, 'lgtMatrix');
  uniLocation[5] = gl.getUniformLocation(prg, 'lightPosition');
  uniLocation[6] = gl.getUniformLocation(prg, 'texture');

  // uniformLocationを配列に取得(シャドウマップ用)
  var dUniLocation = new Array();
  dUniLocation[0] = gl.getUniformLocation(dPrg, 'mvpMatrix');

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());
  var invMatrix = m.identity(m.create());
  var tMatrix = m.identity(m.create());
  var lgtMatrix = m.identity(m.create());
  var dvMatrix = m.identity(m.create());
  var dpMatrix = m.identity(m.create());
  var dvpMatrix = m.identity(m.create());

  // ライトの位置
  var lightPosition = [0.0, 1.0, 0.0];

  // ライトビューの上方向
  var lightUpDirection = [0.0, 0.0, -1.0];

  // カウンタの宣言
  var count = 0;

  // 深度テストを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 2048;
  var fBufferHeight = 2048;
  var fBuffer = create_framebuffer(fBufferWidth, fBufferHeight);

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;

    // ビュー×プロジェクション座標変換行列
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([0.0, 70.0, 0.0], qt, eyePosition);
    q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 150, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // テクスチャ変換用行列
    m.identity(tMatrix);
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

    // ライトの距離をエレメントの値に応じて調整
    var r = eRange.value;
    lightPosition[0] = 0.0 * r;
    lightPosition[1] = 1.0 * r;
    lightPosition[2] = 0.0 * r;

    // ライトから見たビュー座標変換行列
    m.lookAt(lightPosition, [0, 0, 0], lightUpDirection, dvMatrix);

    // ライトから見たプロジェクション座標変換行列
    m.perspective(90, 1.0, 15.0, 100.0, dpMatrix);

    // テクスチャ座標変換用行列
    m.multiply(tMatrix, dpMatrix, dvpMatrix);
    m.multiply(dvpMatrix, dvMatrix, tMatrix);

    // ライトから見たビュー×プロジェクション座標変換行列
    m.multiply(dpMatrix, dvMatrix, dvpMatrix);

    // プログラムオブジェクトの選択(シャドウマップ用)
    gl.useProgram(dPrg);

    // フレームバッファをバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.f);

    // フレームバッファを初期化
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ビューポートの設定
    gl.viewport(0.0, 0.0, fBufferWidth, fBufferHeight);

    // トーラスの描画(合計10個)
    set_attribute(dtVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (var i = 0; i < 10; i++) {
      var rad = (((count + i * 36) % 360) * Math.PI) / 180;
      var rad2 = ((((i % 5) * 72) % 360) * Math.PI) / 180;
      var ifl = -Math.floor(i / 5) + 1;
      m.identity(mMatrix);
      m.rotate(mMatrix, rad2, [0.0, 1.0, 0.0], mMatrix);
      m.translate(mMatrix, [0.0, ifl * 10.0 + 10.0, (ifl - 2.0) * 7.0], mMatrix);
      m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix);
      m.multiply(dvpMatrix, mMatrix, lgtMatrix);
      gl.uniformMatrix4fv(dUniLocation[0], false, lgtMatrix);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // 板ポリゴンの描画(底面)
    set_attribute(dvVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    m.identity(mMatrix);
    m.translate(mMatrix, [0.0, -10.0, 0.0], mMatrix);
    m.scale(mMatrix, [30.0, 0.0, 30.0], mMatrix);
    m.multiply(dvpMatrix, mMatrix, lgtMatrix);
    gl.uniformMatrix4fv(dUniLocation[0], false, lgtMatrix);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // プログラムオブジェクトの選択
    gl.useProgram(prg);

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // フレームバッファをテクスチャとしてバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer.t);

    // canvasを初期化
    gl.clearColor(0.0, 0.7, 0.7, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ビューポートの設定
    gl.viewport(0.0, 0.0, c.width, c.height);

    // トーラスの描画(合計10個)
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (i = 0; i < 10; i++) {
      rad = (((count + i * 36) % 360) * Math.PI) / 180;
      rad2 = ((((i % 5) * 72) % 360) * Math.PI) / 180;
      ifl = -Math.floor(i / 5) + 1;
      m.identity(mMatrix);
      m.rotate(mMatrix, rad2, [0.0, 1.0, 0.0], mMatrix);
      m.translate(mMatrix, [0.0, ifl * 10.0 + 10.0, (ifl - 2.0) * 7.0], mMatrix);
      m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      m.multiply(dvpMatrix, mMatrix, lgtMatrix);
      gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
      gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
      gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
      gl.uniformMatrix4fv(uniLocation[3], false, tMatrix);
      gl.uniformMatrix4fv(uniLocation[4], false, lgtMatrix);
      gl.uniform3fv(uniLocation[5], lightPosition);
      gl.uniform1i(uniLocation[6], 0);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // 板ポリゴンの描画
    set_attribute(vVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    m.identity(mMatrix);
    m.translate(mMatrix, [0.0, -10.0, 0.0], mMatrix);
    m.scale(mMatrix, [30.0, 0.0, 30.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    m.multiply(dvpMatrix, mMatrix, lgtMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.uniformMatrix4fv(uniLocation[3], false, tMatrix);
    gl.uniformMatrix4fv(uniLocation[4], false, lgtMatrix);
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
