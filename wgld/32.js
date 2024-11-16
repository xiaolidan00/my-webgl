// sample_037
//
// WebGLで光学迷彩

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

  // 光学迷彩シェーダ
  var v_shader = create_shader('stealth_vs');
  var f_shader = create_shader('stealth_fs');
  var dPrg = create_program(v_shader, f_shader);
  var dAttLocation = new Array();
  dAttLocation[0] = gl.getAttribLocation(dPrg, 'position');
  dAttLocation[1] = gl.getAttribLocation(dPrg, 'normal');
  dAttLocation[2] = gl.getAttribLocation(dPrg, 'color');
  var dAttStride = new Array();
  dAttStride[0] = 3;
  dAttStride[1] = 3;
  dAttStride[2] = 4;
  var dUniLocation = new Array();
  dUniLocation[0] = gl.getUniformLocation(dPrg, 'mMatrix');
  dUniLocation[1] = gl.getUniformLocation(dPrg, 'tMatrix');
  dUniLocation[2] = gl.getUniformLocation(dPrg, 'mvpMatrix');
  dUniLocation[3] = gl.getUniformLocation(dPrg, 'coefficient');
  dUniLocation[4] = gl.getUniformLocation(dPrg, 'texture');

  // スペキュラライティングシェーダ
  v_shader = create_shader('specular_vs');
  f_shader = create_shader('specular_fs');
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
  sUniLocation[4] = gl.getUniformLocation(sPrg, 'ambientColor');

  // キューブ環境マッピングシェーダ
  v_shader = create_shader('cubemap_vs');
  f_shader = create_shader('cubemap_fs');
  var cPrg = create_program(v_shader, f_shader);
  var cAttLocation = new Array();
  cAttLocation[0] = gl.getAttribLocation(cPrg, 'position');
  cAttLocation[1] = gl.getAttribLocation(cPrg, 'normal');
  cAttLocation[2] = gl.getAttribLocation(cPrg, 'color');
  var cAttStride = new Array();
  cAttStride[0] = 3;
  cAttStride[1] = 3;
  cAttStride[2] = 4;
  var cUniLocation = new Array();
  cUniLocation[0] = gl.getUniformLocation(cPrg, 'mMatrix');
  cUniLocation[1] = gl.getUniformLocation(cPrg, 'mvpMatrix');
  cUniLocation[2] = gl.getUniformLocation(cPrg, 'eyePosition');
  cUniLocation[3] = gl.getUniformLocation(cPrg, 'cubeTexture');
  cUniLocation[4] = gl.getUniformLocation(cPrg, 'reflection');

  // キューブモデル
  var cubeData = cube(2.0, [1.0, 1.0, 1.0, 1.0]);
  var cPosition = create_vbo(cubeData.p);
  var cNormal = create_vbo(cubeData.n);
  var cColor = create_vbo(cubeData.c);
  var cVBOList = [cPosition, cNormal, cColor];
  var cIndex = create_ibo(cubeData.i);

  // トーラスモデル
  var torusData = torus(64, 64, 2.5, 5.0, [1.0, 1.0, 1.0, 1.0]);
  var tPosition = create_vbo(torusData.p);
  var tNormal = create_vbo(torusData.n);
  var tColor = create_vbo(torusData.c);
  var tVBOList = [tPosition, tNormal, tColor];
  var tIndex = create_ibo(torusData.i);

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());
  var invMatrix = m.identity(m.create());
  var tMatrix = m.identity(m.create());
  var tvpMatrix = m.identity(m.create());

  // 深度テストを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // テクスチャ関連
  var cubeTexture = null;

  // キューブマップ用イメージのソースを配列に格納
  var cubeSourse = new Array(
    'cube_PX.png',
    'cube_PY.png',
    'cube_PZ.png',
    'cube_NX.png',
    'cube_NY.png',
    'cube_NZ.png'
  );

  // キューブマップ用のターゲットを格納する配列
  var cubeTarget = new Array(
    gl.TEXTURE_CUBE_MAP_POSITIVE_X,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
  );

  // キューブマップテクスチャの生成
  create_cube_texture(cubeSourse, cubeTarget);

  // ライトの向き(反射光によるライティングで利用)
  var lightDirection = [-0.577, 0.577, 0.577];

  // カウンタの宣言
  var count = 0;

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 512;
  var fBufferHeight = 512;
  var fBuffer = create_framebuffer(fBufferWidth, fBufferHeight);

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;

    // フレームバッファをバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.7, 0.7, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ビュー×プロジェクション座標変換行列
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([0.0, 0.0, 20.0], qt, eyePosition);
    q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(90, c.width / c.height, 0.1, 200, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // キューブマップテクスチャで背景用キューブをレンダリング
    gl.useProgram(cPrg);
    set_attribute(cVBOList, cAttLocation, cAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);
    m.identity(mMatrix);
    m.scale(mMatrix, [100.0, 100.0, 100.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(cUniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(cUniLocation[1], false, mvpMatrix);
    gl.uniform3fv(cUniLocation[2], [0, 0, 0]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(cUniLocation[3], 0);
    gl.uniform1i(cUniLocation[4], false);
    gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);

    // スペキュラライティングシェーダでトーラスモデルをレンダリング
    gl.useProgram(sPrg);
    set_attribute(tVBOList, sAttLocation, sAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (var i = 0; i < 9; i++) {
      var amb = hsva(i * 40, 1, 1, 1);
      m.identity(mMatrix);
      m.rotate(mMatrix, (i * 2 * Math.PI) / 9, [0, 1, 0], mMatrix);
      m.translate(mMatrix, [0.0, 0.0, 30.0], mMatrix);
      m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(sUniLocation[0], false, mvpMatrix);
      gl.uniformMatrix4fv(sUniLocation[1], false, invMatrix);
      gl.uniform3fv(sUniLocation[2], lightDirection);
      gl.uniform3fv(sUniLocation[3], eyePosition);
      gl.uniform4fv(sUniLocation[4], amb);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // canvas を初期化
    gl.clearColor(0.0, 0.7, 0.7, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // キューブマップテクスチャで背景用キューブをレンダリング
    gl.useProgram(cPrg);
    set_attribute(cVBOList, cAttLocation, cAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);
    m.identity(mMatrix);
    m.scale(mMatrix, [100.0, 100.0, 100.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(cUniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(cUniLocation[1], false, mvpMatrix);
    gl.uniform3fv(cUniLocation[2], [0, 0, 0]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(cUniLocation[3], 0);
    gl.uniform1i(cUniLocation[4], false);
    gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);

    // スペキュラライティングシェーダでトーラスモデルをレンダリング
    gl.useProgram(sPrg);
    set_attribute(tVBOList, sAttLocation, sAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (i = 0; i < 9; i++) {
      amb = hsva(i * 40, 1, 1, 1);
      m.identity(mMatrix);
      m.rotate(mMatrix, (i * 2 * Math.PI) / 9, [0, 1, 0], mMatrix);
      m.translate(mMatrix, [0.0, 0.0, 30.0], mMatrix);
      m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(sUniLocation[0], false, mvpMatrix);
      gl.uniformMatrix4fv(sUniLocation[1], false, invMatrix);
      gl.uniform3fv(sUniLocation[2], lightDirection);
      gl.uniform3fv(sUniLocation[3], eyePosition);
      gl.uniform4fv(sUniLocation[4], amb);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

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

    // 行列を掛け合わせる
    m.multiply(tMatrix, pMatrix, tvpMatrix);
    m.multiply(tvpMatrix, vMatrix, tMatrix);

    // 光学迷彩に掛ける係数
    var coefficient = (eRange.value - 50) / 50.0;

    // フレームバッファテクスチャをバインド
    gl.bindTexture(gl.TEXTURE_2D, fBuffer.t);

    // 光学迷彩でトーラスモデルをレンダリング
    gl.useProgram(dPrg);
    set_attribute(tVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [1, 0, 1], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(dUniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(dUniLocation[1], false, tMatrix);
    gl.uniformMatrix4fv(dUniLocation[2], false, mvpMatrix);
    gl.uniform1f(dUniLocation[3], coefficient);
    gl.uniform1i(dUniLocation[4], 0);
    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

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

    // フレームバッファにテクスチャを関連付ける
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);

    // 各種オブジェクトのバインドを解除
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // オブジェクトを返して終了
    return { f: frameBuffer, d: depthRenderBuffer, t: fTexture };
  }

  // キューブマップテクスチャを生成する関数
  function create_cube_texture(source, target) {
    // インスタンス用の配列
    var cImg = new Array();

    for (var i = 0; i < source.length; i++) {
      // インスタンスの生成
      cImg[i] = new cubeMapImage();

      // イメージオブジェクトのソースを指定
      cImg[i].data.src = source[i];
    }

    // キューブマップ用イメージのコンストラクタ
    function cubeMapImage() {
      // イメージオブジェクトを格納
      this.data = new Image();

      // イメージロードをトリガーにする
      this.data.onload = function () {
        // プロパティを真にする
        this.imageDataLoaded = true;

        // チェック関数を呼び出す
        checkLoaded();
      };
    }

    // イメージロード済みかチェックする関数
    function checkLoaded() {
      // 全てロード済みならキューブマップを生成する関数を呼び出す
      if (
        cImg[0].data.imageDataLoaded &&
        cImg[1].data.imageDataLoaded &&
        cImg[2].data.imageDataLoaded &&
        cImg[3].data.imageDataLoaded &&
        cImg[4].data.imageDataLoaded &&
        cImg[5].data.imageDataLoaded
      ) {
        generateCubeMap();
      }
    }

    // キューブマップを生成する関数
    function generateCubeMap() {
      // テクスチャオブジェクトの生成
      var tex = gl.createTexture();

      // テクスチャをキューブマップとしてバインドする
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);

      // ソースを順に処理する
      for (var j = 0; j < source.length; j++) {
        // テクスチャへイメージを適用
        gl.texImage2D(target[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cImg[j].data);
      }

      // ミップマップを生成
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

      // テクスチャパラメータの設定
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // キューブマップテクスチャを変数に代入
      cubeTexture = tex;

      // テクスチャのバインドを無効化
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }
  }
};
