// sample_047
//
// WebGLで距離フォグ

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
  var eRangeFogStart = document.getElementById('fogStart');
  var eRangeFogEnd = document.getElementById('fogEnd');

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
  uniLocation[6] = gl.getUniformLocation(prg, 'fogStart');
  uniLocation[7] = gl.getUniformLocation(prg, 'fogEnd');
  uniLocation[8] = gl.getUniformLocation(prg, 'fogColor');

  // トーラスモデル
  var torusData = torus(64, 64, 0.75, 1.75, [1.0, 1.0, 1.0, 1.0]);
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

  // 深度テストとカリングを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // ライトの向き
  var lightDirection = [-0.577, 0.577, 0.577];

  // カウンタの宣言
  var count = 0;

  // 恒常ループ
  (function () {
    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    var rad = new Array();
    for (var i = 0; i < 9; i++) {
      rad[i] = (((count + 40 * i) % 360) * Math.PI) / 180;
    }

    // ビュー×プロジェクション座標変換行列
    var eyePosition = new Array();
    var camUpDirection = new Array();
    q.toVecIII([0.0, 0.0, 15.0], qt, eyePosition);
    q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
    m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
    m.perspective(90, c.width / c.height, 0.1, 30, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // canvasを初期化
    gl.clearColor(0.75, 0.75, 0.75, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // エレメントからパラメータを取得
    var fogStart = eRangeFogStart.value * 0.01;
    var fogEnd = eRangeFogEnd.value * 0.01;

    // トーラスのレンダリング
    gl.cullFace(gl.BACK);
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    for (i = 0; i < 9; i++) {
      var amb = hsva(i * 40, 1, 1, 1);
      m.identity(mMatrix);
      m.rotate(mMatrix, (i * 40 * Math.PI) / 180, [0, 1, 0], mMatrix);
      m.translate(mMatrix, [0.0, 0.0, 10.0], mMatrix);
      m.rotate(mMatrix, rad[i], [1, 1, 0], mMatrix);
      m.multiply(tmpMatrix, mMatrix, mvpMatrix);
      m.inverse(mMatrix, invMatrix);
      gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
      gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
      gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
      gl.uniform3fv(uniLocation[3], lightDirection);
      gl.uniform3fv(uniLocation[4], eyePosition);
      gl.uniform4fv(uniLocation[5], amb);
      gl.uniform1f(uniLocation[6], fogStart);
      gl.uniform1f(uniLocation[7], fogEnd);
      gl.uniform4fv(uniLocation[8], [0.75, 0.75, 0.75, 1.0]);
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
};
