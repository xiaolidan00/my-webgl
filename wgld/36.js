// sample_042
//
// WebGLでsobelフィルタ

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
  var eColor = document.getElementById('color');
  var eSobelGray = document.getElementById('sobelGray');
  var eSelect = document.getElementById('select');

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

  // 正射影で板ポリゴンをレンダリングするシェーダ
  v_shader = create_shader('ovs');
  f_shader = create_shader('ofs');
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
  oUniLocation[2] = gl.getUniformLocation(oPrg, 'sobel');
  oUniLocation[3] = gl.getUniformLocation(oPrg, 'sobelGray');
  oUniLocation[4] = gl.getUniformLocation(oPrg, 'hCoef');
  oUniLocation[5] = gl.getUniformLocation(oPrg, 'vCoef');

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

  // 深度テストとカリングを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // ライトの向き
  var lightDirection = [-0.577, 0.577, 0.577];

  // sobelフィルタのカーネル
  var hCoef = [1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0];
  var vCoef = [1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0];

  // テクスチャ生成
  var texture1 = null;
  var texture2 = null;
  create_texture('texture01.jpg', 1);
  create_texture('texture02.jpg', 2);

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 512;
  var fBufferHeight = 512;
  var fBuffer = create_framebuffer(fBufferWidth, fBufferHeight);

  // カウンタの宣言
  var count = 0;
  var count2 = 0;

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;
    if (count % 2 == 0) {
      count2++;
    }

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;

    // プログラムオブジェクトの選択
    gl.useProgram(prg);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.f);

    // フレームバッファを初期化
    var hsv = hsva(count2 % 360, 1, 1, 1);
    gl.clearColor(hsv[0], hsv[1], hsv[2], hsv[3]);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ビュー×プロジェクション座標変換行列
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([0.0, 20.0, 0.0], qt, eyePosition);
    q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(90, c.width / c.height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // トーラスをレンダリング
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
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // プログラムオブジェクトの選択
    gl.useProgram(oPrg);

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // canvas を初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 正射影用の座標変換行列
    m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
    m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // テクスチャの適用
    gl.activeTexture(gl.TEXTURE0);
    switch (eSelect.selectedIndex) {
      case 0:
        gl.bindTexture(gl.TEXTURE_2D, fBuffer.t);
        break;
      case 1:
        gl.bindTexture(gl.TEXTURE_2D, texture1);
        break;
      case 2:
        gl.bindTexture(gl.TEXTURE_2D, texture2);
        break;
      default:
        break;
    }

    // エレメントから色変換するかどうかのフラグを取得
    var sobel = !eColor.checked;
    var sobelGray = eSobelGray.checked;

    // 板ポリゴンのレンダリング
    set_attribute(vVBOList, oAttLocation, oAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(oUniLocation[0], false, tmpMatrix);
    gl.uniform1i(oUniLocation[1], 0);
    gl.uniform1i(oUniLocation[2], sobel);
    gl.uniform1i(oUniLocation[3], sobelGray);
    gl.uniform1fv(oUniLocation[4], hCoef);
    gl.uniform1fv(oUniLocation[5], vCoef);
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
};
