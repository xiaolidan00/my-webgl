// sample_051
//
// WebGLで板ポリゴンへの鏡面反射

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
  // webgl用のcanvasエレメントを取得
  c = document.getElementById('canvas');
  c.width = 512;
  c.height = 512;

  // webglコンテキストをステンシル有効で取得
  var gl =
    canvas.getContext('webgl', { stencil: true }) ||
    canvas.getContext('experimental-webgl', { stencil: true });

  // イベント処理
  c.addEventListener('mousemove', mouseMove, true);

  // エレメントを取得
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
  uniLocation[1] = gl.getUniformLocation(prg, 'vpMatrix');
  uniLocation[2] = gl.getUniformLocation(prg, 'invMatrix');
  uniLocation[3] = gl.getUniformLocation(prg, 'lightDirection');
  uniLocation[4] = gl.getUniformLocation(prg, 'eyePosition');
  uniLocation[5] = gl.getUniformLocation(prg, 'ambientColor');
  uniLocation[6] = gl.getUniformLocation(prg, 'mirror');

  // 鏡面反射するシーンをレンダリングするシェーダ
  v_shader = create_shader('mirror_vs');
  f_shader = create_shader('mirror_fs');
  mPrg = create_program(v_shader, f_shader);
  var mAttLocation = new Array();
  mAttLocation[0] = gl.getAttribLocation(mPrg, 'position');
  mAttLocation[1] = gl.getAttribLocation(mPrg, 'texCoord');
  var mAttStride = new Array();
  mAttStride[0] = 3;
  mAttStride[1] = 2;
  var mUniLocation = new Array();
  mUniLocation[0] = gl.getUniformLocation(mPrg, 'ortMatrix');
  mUniLocation[1] = gl.getUniformLocation(mPrg, 'texture');
  mUniLocation[2] = gl.getUniformLocation(mPrg, 'alpha');

  // トーラスモデル
  var torusData = torus(64, 64, 0.1, 0.4);
  var tPosition = create_vbo(torusData.p);
  var tNormal = create_vbo(torusData.n);
  var tColor = create_vbo(torusData.c);
  var tVBOList = [tPosition, tNormal, tColor];
  var tIndex = create_ibo(torusData.i);

  // 球体モデル
  var sphereData = sphere(64, 64, 0.25);
  var sPosition = create_vbo(sphereData.p);
  var sNormal = create_vbo(sphereData.n);
  var sColor = create_vbo(sphereData.c);
  var sVBOList = [sPosition, sNormal, sColor];
  var sIndex = create_ibo(sphereData.i);

  // 板ポリゴン
  position = [-1.0, 1.0, 0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0];
  color = [0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0];
  texCoord = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
  var index = [0, 2, 1, 1, 2, 3];
  var pPosition = create_vbo(position);
  var pNormal = create_vbo(position);
  var pColor = create_vbo(color);
  var pTexCoord = create_vbo(texCoord);
  var pVBOList = [pPosition, pNormal, pColor];
  var pmVBOList = [pPosition, pTexCoord];
  var pIndex = create_ibo(index);

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var invMatrix = m.identity(m.create());
  var ortMatrix = m.identity(m.create());

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 512;
  var fBufferHeight = 512;
  var fBufferMirror = create_framebuffer(fBufferWidth, fBufferHeight);

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
    var rad = ((count % 360) * Math.PI) / 180;
    var upDown = Math.sin(rad) * 0.25;

    // ビュー×プロジェクション座標変換行列
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([0.0, 5.0, 5.0], qt, eyePosition);
    q.toVecIII([0.0, 1.0, -1.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 10, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // 正射影用の座標変換行列
    m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
    m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
    m.multiply(pMatrix, vMatrix, ortMatrix);

    // フレームバッファのバインドとクリア
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBufferMirror.f);
    gl.clearColor(0.3, 0.9, 0.9, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(prg);

    // ステンシルテストの無効化
    gl.disable(gl.STENCIL_TEST);

    // カリング面の反転
    gl.cullFace(gl.FRONT);

    // トーラスのレンダリング
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0.0, 1.0, 0.0], mMatrix);
    m.translate(mMatrix, [0.0, 0.75 + upDown, 0.0], mMatrix);
    m.rotate(mMatrix, Math.PI * 0.5, [1.0, 0.0, 0.0], mMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, tmpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.uniform3fv(uniLocation[3], lightDirection);
    gl.uniform3fv(uniLocation[4], eyePosition);
    gl.uniform4fv(uniLocation[5], [0.0, 0.0, 0.0, 0.0]);
    gl.uniform1i(uniLocation[6], true);
    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

    // 球体のレンダリング
    set_attribute(sVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
    m.identity(mMatrix);
    m.rotate(mMatrix, -rad, [0.0, 1.0, 0.0], mMatrix);
    m.translate(mMatrix, [0.0, 0.75, 1.0], mMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, tmpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // canvasを初期化
    gl.clearColor(0.0, 0.7, 0.7, 1.0);
    gl.clearDepth(1.0);
    gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    // ステンシル設定
    gl.enable(gl.STENCIL_TEST);
    gl.stencilFunc(gl.ALWAYS, 0, ~0);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

    // カリング面を元に戻す
    gl.cullFace(gl.BACK);

    // トーラスのレンダリング
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0.0, 1.0, 0.0], mMatrix);
    m.translate(mMatrix, [0.0, 0.75 + upDown, 0.0], mMatrix);
    m.rotate(mMatrix, Math.PI * 0.5, [1.0, 0.0, 0.0], mMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, tmpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.uniform3fv(uniLocation[3], lightDirection);
    gl.uniform3fv(uniLocation[4], eyePosition);
    gl.uniform4fv(uniLocation[5], [0.0, 0.0, 0.0, 0.0]);
    gl.uniform1i(uniLocation[6], false);
    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

    // 球体のレンダリング
    set_attribute(sVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
    m.identity(mMatrix);
    m.rotate(mMatrix, -rad, [0.0, 1.0, 0.0], mMatrix);
    m.translate(mMatrix, [0.0, 0.75, 1.0], mMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, tmpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

    // ステンシル設定
    gl.enable(gl.STENCIL_TEST);
    gl.stencilFunc(gl.ALWAYS, 1, ~0);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

    // 板ポリゴンのレンダリング
    set_attribute(pVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pIndex);
    m.identity(mMatrix);
    m.rotate(mMatrix, Math.PI * 1.5, [1.0, 0.0, 0.0], mMatrix);
    m.scale(mMatrix, [2.0, 2.0, 1.0], mMatrix);
    m.inverse(mMatrix, invMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, tmpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // プログラムオブジェクトの選択
    gl.useProgram(mPrg);

    // ステンシル設定
    gl.stencilFunc(gl.EQUAL, 1, ~0);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

    // テクスチャの設定
    gl.bindTexture(gl.TEXTURE_2D, fBufferMirror.t);

    // エレメントから映り込みの係数を取得
    var alpha = eRange.value * 0.01;

    // 板ポリゴンのレンダリング
    set_attribute(pmVBOList, mAttLocation, mAttStride);
    gl.uniformMatrix4fv(mUniLocation[0], false, ortMatrix);
    gl.uniform1i(mUniLocation[1], 0);
    gl.uniform1f(mUniLocation[2], alpha);
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
