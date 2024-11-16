// sample_034
//
// WebGLで動的キューブマッピング

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

  // スペキュラライティングシェーダ
  var v_shader = create_shader('svs');
  var f_shader = create_shader('sfs');
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
  v_shader = create_shader('cvs');
  f_shader = create_shader('cfs');
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

  // 球体モデル
  var sphereData = sphere(64, 64, 3.0, [1.0, 1.0, 1.0, 1.0]);
  var sPosition = create_vbo(sphereData.p);
  var sNormal = create_vbo(sphereData.n);
  var sColor = create_vbo(sphereData.c);
  var sVBOList = [sPosition, sNormal, sColor];
  var sIndex = create_ibo(sphereData.i);

  // トーラスモデル
  var torusData = torus(64, 64, 0.5, 1.0, [1.0, 1.0, 1.0, 1.0]);
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

  // 視点座標
  var eyePosition = [0.0, 0.0, 20.0];

  // カウンタの宣言
  var count = 0;

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 512;
  var fBufferHeight = 512;
  var fBuffer = create_framebuffer(fBufferWidth, fBufferHeight, cubeTarget);

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    var rad = ((count % 360) * Math.PI) / 180;

    // 注視点
    var eye = new Array();

    // カメラの上方向
    var camUp = new Array();

    // モデルの座標位置
    var pos = new Array();

    // モデルに適用するカラー値
    var amb = new Array();

    // フレームバッファをバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.f);

    // フレームバッファへの 6 方向レンダリング
    for (var i = 0; i < cubeTarget.length; i++) {
      // フレームバッファにテクスチャを関連付ける
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, cubeTarget[i], fBuffer.t, 0);

      // フレームバッファを初期化
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // ライトベクトル
      var lightDirection = [-1.0, 1.0, 1.0];

      // 方角を判別して処理する
      switch (cubeTarget[i]) {
        case gl.TEXTURE_CUBE_MAP_POSITIVE_X:
          eye[i] = [1, 0, 0];
          camUp[i] = [0, -1, 0];
          pos[i] = [6, 0, 0];
          amb[i] = [1.0, 0.5, 0.5, 1.0];
          break;
        case gl.TEXTURE_CUBE_MAP_POSITIVE_Y:
          eye[i] = [0, 1, 0];
          camUp[i] = [0, 0, 1];
          pos[i] = [0, 6, 0];
          amb[i] = [0.5, 1.0, 0.5, 1.0];
          break;
        case gl.TEXTURE_CUBE_MAP_POSITIVE_Z:
          eye[i] = [0, 0, 1];
          camUp[i] = [0, -1, 0];
          pos[i] = [0, 0, 6];
          amb[i] = [0.5, 0.5, 1.0, 1.0];
          break;
        case gl.TEXTURE_CUBE_MAP_NEGATIVE_X:
          eye[i] = [-1, 0, 0];
          camUp[i] = [0, -1, 0];
          pos[i] = [-6, 0, 0];
          amb[i] = [0.5, 0.0, 0.0, 1.0];
          break;
        case gl.TEXTURE_CUBE_MAP_NEGATIVE_Y:
          eye[i] = [0, -1, 0];
          camUp[i] = [0, 0, -1];
          pos[i] = [0, -6, 0];
          amb[i] = [0.0, 0.5, 0.0, 1.0];
          break;
        case gl.TEXTURE_CUBE_MAP_NEGATIVE_Z:
          eye[i] = [0, 0, -1];
          camUp[i] = [0, -1, 0];
          pos[i] = [0, 0, -6];
          amb[i] = [0.0, 0.0, 0.5, 1.0];
          break;
        default:
          break;
      }

      // ビュー×プロジェクション座標変換行列
      m.lookAt([0, 0, 0], eye[i], camUp[i], vMatrix);
      m.perspective(90, 1.0, 0.1, 200, pMatrix);
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

      // 視線ベクトルの変換
      var invEye = new Array();
      invEye[0] = -eye[i][0];
      invEye[1] = -eye[i][1];
      invEye[2] = -eye[i][2];

      // スペキュラライティングシェーダでトーラスモデルをレンダリング
      gl.useProgram(sPrg);
      set_attribute(tVBOList, sAttLocation, sAttStride);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
      m.identity(mMatrix);
      m.translate(mMatrix, pos[i], mMatrix);
      m.rotate(mMatrix, rad, eye[i], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(sUniLocation[0], false, mvpMatrix);
      gl.uniformMatrix4fv(sUniLocation[1], false, invMatrix);
      gl.uniform3fv(sUniLocation[2], lightDirection);
      gl.uniform3fv(sUniLocation[3], invEye);
      gl.uniform4fv(sUniLocation[4], amb[i]);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
    }

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // canvas を初期化
    gl.clearColor(0.0, 1.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ビュー×プロジェクション座標変換行列
    var camUpDirection = new Array();
    q.toVecIII([0.0, 0.0, 20.0], qt, eyePosition);
    q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 200, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // キューブ環境マッピングシェーダ
    gl.useProgram(cPrg);

    // 背景用キューブをレンダリング
    set_attribute(cVBOList, cAttLocation, cAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);
    m.identity(mMatrix);
    m.scale(mMatrix, [100.0, 100.0, 100.0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(cUniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(cUniLocation[1], false, mvpMatrix);
    gl.uniform3fv(cUniLocation[2], eyePosition);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(cUniLocation[3], 0);
    gl.uniform1i(cUniLocation[4], false);
    gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);

    // 動的キューブマップテクスチャを適用して球体をレンダリング
    set_attribute(sVBOList, cAttLocation, cAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
    m.identity(mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(cUniLocation[0], false, mMatrix);
    gl.uniformMatrix4fv(cUniLocation[1], false, mvpMatrix);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, fBuffer.t);
    gl.uniform1i(cUniLocation[3], 0);
    gl.uniform1i(cUniLocation[4], true);
    gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

    // スペキュラライティングシェーダ
    gl.useProgram(sPrg);

    // トーラスをレンダリング
    set_attribute(tVBOList, sAttLocation, sAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (i = 0; i < cubeTarget.length; i++) {
      m.identity(mMatrix);
      m.translate(mMatrix, pos[i], mMatrix);
      m.rotate(mMatrix, rad, eye[i], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(sUniLocation[0], false, mvpMatrix);
      gl.uniformMatrix4fv(sUniLocation[1], false, invMatrix);
      gl.uniform3fv(sUniLocation[2], lightDirection);
      gl.uniform3fv(sUniLocation[3], eyePosition);
      gl.uniform4fv(sUniLocation[4], amb[i]);
      gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
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

  // フレームバッファをオブジェクトとして生成する関数(キューブマップ仕様)
  function create_framebuffer(width, height, target) {
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

    // フレームバッファ用のテクスチャをキューブマップテクスチャとしてバインド
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, fTexture);

    // フレームバッファ用のテクスチャにカラー用のメモリ領域を 6 面分確保
    for (var i = 0; i < target.length; i++) {
      gl.texImage2D(target[i], 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    // テクスチャパラメータ
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // 各種オブジェクトのバインドを解除
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
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
