// sample_018
//
// WebGLで様々なブレンディングを実行する

onload = function () {
  // canvasエレメントを取得
  var c = document.getElementById('canvas');
  c.width = 300;
  c.height = 300;

  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

  // 各種エレメントへの参照を取得
  var eRBGRed = document.getElementById('rangeBgRed');
  var eRBGGreen = document.getElementById('rangeBgGreen');
  var eRBGBlue = document.getElementById('rangeBgBlue');
  var eRBGAlpha = document.getElementById('rangeBgAlpha');
  var eRBCRed = document.getElementById('rangeBcRed');
  var eRBCGreen = document.getElementById('rangeBcGreen');
  var eRBCBlue = document.getElementById('rangeBcBlue');
  var eRBCAlpha = document.getElementById('rangeBcAlpha');
  var eIM1Blend = document.getElementById('m1Blend');
  var eRM1VAlpha = document.getElementById('rangeM1VertexAlpha');
  var eLM1CEquation = document.getElementById('m1cEquation');
  var eLM1AEquation = document.getElementById('m1aEquation');
  var eLM1CSRCBF = document.getElementById('m1cSrcBlendFunc');
  var eLM1CDSTBF = document.getElementById('m1cDstBlendFunc');
  var eLM1ASRCBF = document.getElementById('m1aSrcBlendFunc');
  var eLM1ADSTBF = document.getElementById('m1aDstBlendFunc');
  var eIM2Blend = document.getElementById('m2Blend');
  var eRM2VAlpha = document.getElementById('rangeM2VertexAlpha');
  var eLM2CEquation = document.getElementById('m2cEquation');
  var eLM2AEquation = document.getElementById('m2aEquation');
  var eLM2CSRCBF = document.getElementById('m2cSrcBlendFunc');
  var eLM2CDSTBF = document.getElementById('m2cDstBlendFunc');
  var eLM2ASRCBF = document.getElementById('m2aSrcBlendFunc');
  var eLM2ADSTBF = document.getElementById('m2aDstBlendFunc');

  // equation constant array
  var equationList = new Array();
  equationList[0] = gl.FUNC_ADD;
  equationList[1] = gl.FUNC_SUBTRACT;
  equationList[2] = gl.FUNC_REVERSE_SUBTRACT;

  // blend factor constant array
  var blendFctList = new Array();
  blendFctList[0] = gl.ZERO;
  blendFctList[1] = gl.ONE;
  blendFctList[2] = gl.SRC_COLOR;
  blendFctList[3] = gl.DST_COLOR;
  blendFctList[4] = gl.ONE_MINUS_SRC_COLOR;
  blendFctList[5] = gl.ONE_MINUS_DST_COLOR;
  blendFctList[6] = gl.SRC_ALPHA;
  blendFctList[7] = gl.DST_ALPHA;
  blendFctList[8] = gl.ONE_MINUS_SRC_ALPHA;
  blendFctList[9] = gl.ONE_MINUS_DST_ALPHA;
  blendFctList[10] = gl.CONSTANT_COLOR;
  blendFctList[11] = gl.ONE_MINUS_CONSTANT_COLOR;
  blendFctList[12] = gl.CONSTANT_ALPHA;
  blendFctList[13] = gl.ONE_MINUS_CONSTANT_ALPHA;
  blendFctList[14] = gl.SRC_ALPHA_SATURATE;

  // 頂点シェーダとフラグメントシェーダの生成
  var v_shader = create_shader('vs');
  var f_shader = create_shader('fs');

  // プログラムオブジェクトの生成とリンク
  var prg = create_program(v_shader, f_shader);

  // attributeLocationを配列に取得
  var attLocation = new Array();
  attLocation[0] = gl.getAttribLocation(prg, 'position');
  attLocation[1] = gl.getAttribLocation(prg, 'color');
  attLocation[2] = gl.getAttribLocation(prg, 'textureCoord');

  // attributeの要素数を配列に格納
  var attStride = new Array();
  attStride[0] = 3;
  attStride[1] = 4;
  attStride[2] = 2;

  // 頂点の位置
  var position = [-1.0, 1.0, 0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0];

  // 頂点色
  var color = [1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

  // テクスチャ座標
  var textureCoord = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];

  // 頂点インデックス
  var index = [0, 1, 2, 3, 2, 1];

  // VBOとIBOの生成
  var vPosition = create_vbo(position);
  var vColor = create_vbo(color);
  var vTextureCoord = create_vbo(textureCoord);
  var VBOList = [vPosition, vColor, vTextureCoord];
  var iIndex = create_ibo(index);

  // VBOとIBOの登録
  set_attribute(VBOList, attLocation, attStride);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndex);

  // uniformLocationを配列に取得
  var uniLocation = new Array();
  uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
  uniLocation[1] = gl.getUniformLocation(prg, 'vertexAlpha');
  uniLocation[2] = gl.getUniformLocation(prg, 'texture');
  uniLocation[3] = gl.getUniformLocation(prg, 'useTexture');

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());

  // 深度テストを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // ビュー×プロジェクション座標変換行列
  m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
  m.multiply(pMatrix, vMatrix, tmpMatrix);

  // テクスチャ関連
  var texture = null;
  create_texture('texture.png');
  gl.activeTexture(gl.TEXTURE0);

  var count = 0;

  // 恒常ループ
  (function () {
    // canvasの初期化
    var cR = parseFloat(eRBGRed.value / 100);
    var cG = parseFloat(eRBGGreen.value / 100);
    var cB = parseFloat(eRBGBlue.value / 100);
    var cA = parseFloat(eRBGAlpha.value / 100);
    gl.clearColor(cR, cG, cB, cA);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ブレンドカラーを設定
    cR = parseFloat(eRBCRed.value / 100);
    cG = parseFloat(eRBCGreen.value / 100);
    cB = parseFloat(eRBCBlue.value / 100);
    cA = parseFloat(eRBCAlpha.value / 100);
    gl.blendColor(cR, cG, cB, cA);

    // モデルに適用するアルファ値
    var m1VertexAlpha = parseFloat(eRM1VAlpha.value / 100);
    var m2VertexAlpha = parseFloat(eRM2VAlpha.value / 100);

    // カウンタ処理
    count++;
    var rad = ((count % 360) * Math.PI) / 180;

    // モデル座標変換行列の生成
    m.identity(mMatrix);
    m.translate(mMatrix, [0.25, 0.25, -0.25], mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);

    // テクスチャのバインド
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // ブレンディング
    if (eIM1Blend.checked) {
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }
    var equationColor = equationList[eLM1CEquation.selectedIndex];
    var equationAlpha = equationList[eLM1AEquation.selectedIndex];
    var blendFctCSRC = blendFctList[eLM1CSRCBF.selectedIndex];
    var blendFctCDST = blendFctList[eLM1CDSTBF.selectedIndex];
    var blendFctASRC = blendFctList[eLM1ASRCBF.selectedIndex];
    var blendFctADST = blendFctList[eLM1ADSTBF.selectedIndex];
    gl.blendEquationSeparate(equationColor, equationAlpha);
    gl.blendFuncSeparate(blendFctCSRC, blendFctCDST, blendFctASRC, blendFctADST);

    // uniform変数の登録と描画
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniform1f(uniLocation[1], m1VertexAlpha);
    gl.uniform1i(uniLocation[2], 0);
    gl.uniform1i(uniLocation[3], true);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // モデル座標変換行列の生成
    m.identity(mMatrix);
    m.translate(mMatrix, [-0.25, -0.25, 0.25], mMatrix);
    m.rotate(mMatrix, rad, [0, 0, 1], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);

    // テクスチャのバインドを解除
    gl.bindTexture(gl.TEXTURE_2D, null);

    // ブレンディング
    if (eIM2Blend.checked) {
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }
    equationColor = equationList[eLM2CEquation.selectedIndex];
    equationAlpha = equationList[eLM2AEquation.selectedIndex];
    blendFctCSRC = blendFctList[eLM2CSRCBF.selectedIndex];
    blendFctCDST = blendFctList[eLM2CDSTBF.selectedIndex];
    blendFctASRC = blendFctList[eLM2ASRCBF.selectedIndex];
    blendFctADST = blendFctList[eLM2ADSTBF.selectedIndex];
    gl.blendEquationSeparate(equationColor, equationAlpha);
    gl.blendFuncSeparate(blendFctCSRC, blendFctCDST, blendFctASRC, blendFctADST);

    // uniform変数の登録と描画
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniform1f(uniLocation[1], m2VertexAlpha);
    gl.uniform1i(uniLocation[2], 0);
    gl.uniform1i(uniLocation[3], false);
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
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

      // テクスチャを変数に代入
      texture = tex;

      // テクスチャのバインドを無効化
      gl.bindTexture(gl.TEXTURE_2D, null);
    };

    // イメージオブジェクトのソースを指定
    img.src = source;
  }
};
