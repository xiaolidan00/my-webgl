// sample_063
//
// 頂点シェーダによるテクスチャ参照

// global variable
var c;

onload = function () {
  var i, j;
  // canvasエレメントを取得
  c = document.getElementById('canvas');
  c.width = 512;
  c.height = 512;

  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

  // 頂点テクスチャフェッチが利用可能かどうかチェック
  i = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
  if (i > 0) {
    console.log('max_vertex_texture_imaeg_unit: ' + i);
  } else {
    alert('VTF not supported');
    return;
  }

  // シェーダ用変数
  var v_shader;
  var f_shader;

  // 点のレンダリングを行うシェーダ
  v_shader = create_shader('point_vs');
  f_shader = create_shader('point_fs');
  var pPrg = create_program(v_shader, f_shader);

  // locationの初期化
  var pAttLocation = new Array();
  pAttLocation[0] = gl.getAttribLocation(pPrg, 'index');
  var pAttStride = new Array();
  pAttStride[0] = 1;
  var pUniLocation = new Array();
  pUniLocation[0] = gl.getUniformLocation(pPrg, 'mvpMatrix');
  pUniLocation[1] = gl.getUniformLocation(pPrg, 'texture');

  // テクスチャへの描き込みを行うシェーダ
  v_shader = create_shader('mapping_vs');
  f_shader = create_shader('mapping_fs');
  var mPrg = create_program(v_shader, f_shader);

  // locationの初期化
  var mAttLocation = new Array();
  mAttLocation[0] = gl.getAttribLocation(mPrg, 'position');
  mAttLocation[1] = gl.getAttribLocation(mPrg, 'index');
  var mAttStride = new Array();
  mAttStride[0] = 3;
  mAttStride[1] = 1;

  // 球体モデル
  var sphereData = sphere(15, 15, 1.0);

  // 位置座標
  var position = sphereData.p;

  // 頂点インデックス
  var indices = new Array();

  // 頂点の数分だけインデックスを格納
  j = position.length / 3;
  for (i = 0; i < j; i++) {
    indices.push(i);
  }

  // 頂点情報からVBO生成
  var pos = create_vbo(position);
  var idx = create_vbo(indices);
  var pVBOList = [idx];
  var mVBOList = [pos, idx];

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());

  // ビュー×プロジェクション座標変換行列
  m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
  m.perspective(45, c.width / c.height, 0.1, 10.0, pMatrix);
  m.multiply(pMatrix, vMatrix, tmpMatrix);

  // フレームバッファの生成
  var fBufferWidth = 16;
  var fBufferHeight = 16;
  var fBuffer = create_framebuffer(fBufferWidth, fBufferHeight);

  // フレームバッファをバインド
  gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.f);

  // ビューポートを設定
  gl.viewport(0, 0, 16, 16);

  // フレームバッファを初期化
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // プログラムオブジェクトの選択
  gl.useProgram(mPrg);

  // テクスチャへ頂点情報をレンダリング
  set_attribute(mVBOList, mAttLocation, mAttStride);
  gl.drawArrays(gl.POINTS, 0, j);

  // フレームバッファのバインドを解除
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // ビューポートを設定
  gl.viewport(0, 0, 512, 512);

  // プログラムオブジェクトの選択
  gl.useProgram(pPrg);

  // VBOの紐付け
  set_attribute(pVBOList, pAttLocation, pAttStride);

  // フレームバッファをテクスチャとしてバインド
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fBuffer.t);
  gl.uniform1i(pUniLocation[1], 0);

  // フラグ有効化
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // カウンタ他
  var count = 0;
  var rad;
  var timer;

  // 恒常ループ
  (function () {
    // canvasを初期化
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // カウンタからラジアンを算出
    count++;
    rad = ((count % 360) * Math.PI) / 180;

    // 点を描画
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0.0, 1.0, 0.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(pUniLocation[0], false, mvpMatrix);
    gl.drawArrays(gl.POINTS, 0, j);

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
