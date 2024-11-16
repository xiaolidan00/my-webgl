// sample_054
//
// WebGLで後光表面下散乱

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
  var r = sq * 3.0 * Math.PI * wh;
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

  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

  // イベント処理
  c.addEventListener('mousemove', mouseMove, true);

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
  uniLocation[3] = gl.getUniformLocation(prg, 'tMatrix');
  uniLocation[4] = gl.getUniformLocation(prg, 'lightPosition');
  uniLocation[5] = gl.getUniformLocation(prg, 'eyes');
  uniLocation[6] = gl.getUniformLocation(prg, 'eyePosition');
  uniLocation[7] = gl.getUniformLocation(prg, 'ambientColor');
  uniLocation[8] = gl.getUniformLocation(prg, 'blurTexture');

  // 深度をレンダリングするシェーダ
  v_shader = create_shader('depth_vs');
  f_shader = create_shader('gp_fs');
  var dPrg = create_program(v_shader, f_shader);
  var dAttLocation = new Array();
  dAttLocation[0] = gl.getAttribLocation(dPrg, 'position');
  var dAttStride = new Array();
  dAttStride[0] = 3;
  var dUniLocation = new Array();
  dUniLocation[0] = gl.getUniformLocation(dPrg, 'mMatrix');
  dUniLocation[1] = gl.getUniformLocation(dPrg, 'mvpMatrix');
  dUniLocation[2] = gl.getUniformLocation(dPrg, 'eyePosition');

  // 深度の差分をレンダリングするシェーダ
  v_shader = create_shader('difference_vs');
  f_shader = create_shader('difference_fs');
  var dfPrg = create_program(v_shader, f_shader);
  var dfAttLocation = new Array();
  dfAttLocation[0] = gl.getAttribLocation(dfPrg, 'position');
  var dfAttStride = new Array();
  dfAttStride[0] = 3;
  var dfUniLocation = new Array();
  dfUniLocation[0] = gl.getUniformLocation(dfPrg, 'mMatrix');
  dfUniLocation[1] = gl.getUniformLocation(dfPrg, 'mvpMatrix');
  dfUniLocation[2] = gl.getUniformLocation(dfPrg, 'tMatrix');
  dfUniLocation[3] = gl.getUniformLocation(dfPrg, 'eyePosition');
  dfUniLocation[4] = gl.getUniformLocation(dfPrg, 'backFaceTexture');

  // gaussian blurシェーダ
  v_shader = create_shader('blur_vs');
  f_shader = create_shader('blur_fs');
  var bPrg = create_program(v_shader, f_shader);
  var bAttLocation = new Array();
  bAttLocation[0] = gl.getAttribLocation(bPrg, 'position');
  bAttLocation[1] = gl.getAttribLocation(bPrg, 'texCoord');
  var bAttStride = new Array();
  bAttStride[0] = 3;
  bAttStride[1] = 2;
  var bUniLocation = new Array();
  bUniLocation[0] = gl.getUniformLocation(bPrg, 'ortMatrix');
  bUniLocation[1] = gl.getUniformLocation(bPrg, 'texture');
  bUniLocation[2] = gl.getUniformLocation(bPrg, 'weight');
  bUniLocation[3] = gl.getUniformLocation(bPrg, 'horizontal');

  // ライトの位置を点でレンダリングするシェーダ
  v_shader = create_shader('point_vs');
  f_shader = create_shader('gp_fs');
  var pPrg = create_program(v_shader, f_shader);
  var pAttLocation = new Array();
  pAttLocation[0] = gl.getAttribLocation(pPrg, 'position');
  var pAttStride = new Array();
  pAttStride[0] = 3;
  var pUniLocation = new Array();
  pUniLocation[0] = gl.getUniformLocation(pPrg, 'mvpMatrix');

  // 正射影で板ポリゴンをレンダリングするシェーダ
  v_shader = create_shader('ortho_vs');
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
  var torusData = torus(64, 64, 0.25, 0.5, [0.1, 0.1, 0.1, 1.0]);
  var tPosition = create_vbo(torusData.p);
  var tNormal = create_vbo(torusData.n);
  var tColor = create_vbo(torusData.c);
  var tVBOList = [tPosition, tNormal, tColor];
  var tdVBOList = [tPosition];
  var tIndex = create_ibo(torusData.i);

  // 球体モデル
  var sphereData = sphere(64, 64, 0.5, [1.0, 1.0, 1.0, 1.0]);
  var sPosition = create_vbo(sphereData.p);
  var sNormal = create_vbo(sphereData.n);
  var sColor = create_vbo(sphereData.c);
  var sVBOList = [sPosition, sNormal, sColor];
  var sdVBOList = [sPosition];
  var sIndex = create_ibo(sphereData.i);

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

  // テクスチャ投影用の各種行列
  var tMatrix = m.identity(m.create());
  var tvpMatrix = m.identity(m.create());
  var tmvpMatrix = m.identity(m.create());
  var itmvpMatrix = m.identity(m.create());
  var ortMatrix = m.identity(m.create());
  var ort_pMatrix = m.identity(m.create());
  var ort_tmpMatrix = m.identity(m.create());
  var inv_vMatrix = m.identity(m.create());
  var inv_ort_tmpMatrix = m.identity(m.create());

  // モデル座標変換行列用
  var mMatrixTorus = m.identity(m.create());
  var mMatrixSphere = m.identity(m.create());

  // テクスチャ変換用行列の初期化
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

  // 正射影用の座標変換行列
  m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
  m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, pMatrix);
  m.multiply(pMatrix, vMatrix, ortMatrix);

  // gaussianフィルタの重み係数を算出
  var weight = (function (v) {
    var wCoef = new Array(v);
    var t = 0.0;
    var d = 100.0;
    for (var i = 0; i < v; i++) {
      var r = 1.0 + 2.0 * i;
      var w = Math.exp((-0.5 * (r * r)) / d);
      wCoef[i] = w;
      if (i > 0) {
        w *= 2.0;
      }
      t += w;
    }
    for (i = 0; i < v; i++) {
      wCoef[i] /= t;
    }
    return wCoef;
  })(5);

  // フレームバッファオブジェクトの取得
  var fBufferWidth = 512;
  var fBufferHeight = 512;
  var fBuffer1 = create_framebuffer(fBufferWidth, fBufferHeight); // 裏面の深度値を描画
  var fBuffer2 = create_framebuffer(fBufferWidth, fBufferHeight); // 深度の差分を描画
  var fBuffer3 = create_framebuffer(fBufferWidth, fBufferHeight); // ブラーで使用する中間バッファ
  var fBuffer4 = create_framebuffer(fBufferWidth, fBufferHeight); // ブラーをかけた深度値を描画

  // 深度テストとカリングを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  // アンビエントカラー
  var ambientColor = [0.05, 0.05, 0.05, 0.0];

  // カウンタの宣言
  var count = 0;

  // 恒常ループ
  (function () {
    // 以下、レンダリング前の各種初期化処理を行う

    // カウンタをインクリメントする
    count++;

    // カウンタを元にラジアンを算出
    rad = ((count % 360) * Math.PI) / 180;

    // ビュー×プロジェクション座標変換行列
    var eyes = [0.0, 0.0, 0.0];
    var eyePosition = new Array();
    var camUpDirection = new Array();
    var invEyePosition = new Array();
    q.toVecIII([0.0, 0.0, 7.0], qt, eyePosition);
    q.toVecIII([0.0, 0.0, -7.0], qt, invEyePosition);
    q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);

    // 最終シーンで使う透視射影変換行列の生成(tmpMatrix)
    m.lookAt(eyePosition, eyes, camUpDirection, vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 15, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // バックバッファに描き込む際に使用する正射影変換行列の生成(ort_tmpMatrix)
    m.ortho(-3.0, 3.0, 3.0, -3.0, 0.1, 15, ort_pMatrix);
    m.multiply(ort_pMatrix, vMatrix, ort_tmpMatrix);

    // 裏面の深度値を描き込む際に使用する正射影変換行列の生成(inv_ort_tmpMatrix)
    m.lookAt(invEyePosition, eyes, camUpDirection, inv_vMatrix);
    m.multiply(ort_pMatrix, inv_vMatrix, inv_ort_tmpMatrix);

    // テクスチャ座標変換用の行列を掛け合わせておく
    tMatrix[0] = 0.5;
    m.multiply(tMatrix, ort_pMatrix, tvpMatrix);
    m.multiply(tvpMatrix, vMatrix, tmvpMatrix);

    // テクスチャ座標変換用の行列を掛け合わせておく(X軸反転版)
    tMatrix[0] = -0.5;
    m.multiply(tMatrix, ort_pMatrix, tvpMatrix);
    m.multiply(tvpMatrix, vMatrix, itmvpMatrix);

    // ライトの位置
    var lightPosition = [-1.75, 1.75, 1.75];

    // ライトの位置を回転させるためにクォータニオンを生成
    var qLight = q.identity(q.create());

    // 回転後のライトの位置を格納する配列
    var qLightPosition = new Array();

    // ライトを回転させる際の軸ベクトル
    var lightAxis = [1.0, 1.0, 0.0];

    // ライト回転軸ベクトルの正規化
    lightAxis = (function (v) {
      var x = v[0] * v[0];
      var y = v[1] * v[1];
      var z = v[2] * v[2];
      var sq = 1 / Math.sqrt(x + y + z);
      return [v[0] * sq, v[1] * sq, v[2] * sq];
    })(lightAxis);

    // クォータニオンを回転
    q.rotate(rad, lightAxis, qLight);

    // ライトの位置をクォータニオンで変換
    q.toVecIII(lightPosition, qLight, qLightPosition);

    // ライトの位置座標からVBOを生成(ライトの位置を点でレンダリングするため)
    var lightVBO = create_vbo(qLightPosition);
    var lVBOList = [lightVBO];

    // 各種レンダリングの開始

    // 裏面から見た深度値をひとつ目のフレームバッファにレンダリングする

    // フレームバッファをバインド(裏面の深度をレンダリング)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer1.f);

    // フレームバッファを初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(dPrg);

    // トーラスのレンダリング(裏面の深度)
    set_attribute(tdVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    m.identity(mMatrixTorus);
    m.rotate(mMatrixTorus, Math.PI * 0.5, [1.0, 0.0, 0.0], mMatrixTorus);
    m.multiply(inv_ort_tmpMatrix, mMatrixTorus, mvpMatrix);
    gl.uniformMatrix4fv(dUniLocation[0], false, mMatrixTorus);
    gl.uniformMatrix4fv(dUniLocation[1], false, mvpMatrix);
    gl.uniform3fv(dUniLocation[2], invEyePosition);
    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

    // 球のレンダリング(裏面の深度)
    set_attribute(sdVBOList, dAttLocation, dAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
    m.identity(mMatrixSphere);
    m.rotate(mMatrixSphere, rad, [0.0, 0.0, 1.0], mMatrixSphere);
    m.translate(mMatrixSphere, [0.0, 1.5, 0.0], mMatrixSphere);
    m.multiply(inv_ort_tmpMatrix, mMatrixSphere, mvpMatrix);
    gl.uniformMatrix4fv(dUniLocation[0], false, mMatrixSphere);
    gl.uniformMatrix4fv(dUniLocation[1], false, mvpMatrix);
    gl.uniform3fv(dUniLocation[2], invEyePosition);
    gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

    // 表側と裏側の深度値の差分をふたつ目のフレームバッファにレンダリングする

    // フレームバッファをバインド(深度の差分をレンダリング)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer2.f);

    // 裏面深度をレンダリングしたフレームバッファをテクスチャとしてバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer1.t);

    // フレームバッファを初期化
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(dfPrg);

    // トーラスのレンダリング(深度の差分をレンダリング)
    set_attribute(tdVBOList, dfAttLocation, dfAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    m.multiply(ort_tmpMatrix, mMatrixTorus, mvpMatrix);
    gl.uniformMatrix4fv(dfUniLocation[0], false, mMatrixTorus);
    gl.uniformMatrix4fv(dfUniLocation[1], false, mvpMatrix);
    gl.uniformMatrix4fv(dfUniLocation[2], false, itmvpMatrix);
    gl.uniform3fv(dfUniLocation[3], eyePosition);
    gl.uniform1i(dfUniLocation[4], 0);
    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

    // 球のレンダリング(深度の差分をレンダリング)
    set_attribute(sdVBOList, dfAttLocation, dfAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
    m.multiply(ort_tmpMatrix, mMatrixSphere, mvpMatrix);
    gl.uniformMatrix4fv(dfUniLocation[0], false, mMatrixSphere);
    gl.uniformMatrix4fv(dfUniLocation[1], false, mvpMatrix);
    gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

    // 深度値の差分をぼかすため三つ目と四つ目のフレームバッファでブラーを掛ける

    // フレームバッファをバインド(水平方向ブラーをかける)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer3.f);

    // フレームバッファをテクスチャとしてバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer2.t);

    // フレームバッファを初期化
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(bPrg);

    // 水平方向にブラーをかける
    set_attribute(vVBOList, bAttLocation, bAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
    gl.uniformMatrix4fv(bUniLocation[0], false, ortMatrix);
    gl.uniform1i(bUniLocation[1], 0);
    gl.uniform1fv(bUniLocation[2], weight);
    gl.uniform1i(bUniLocation[3], true);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // フレームバッファをバインド(垂直方向ブラーをかける)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer4.f);

    // フレームバッファをテクスチャとしてバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer3.t);

    // フレームバッファを初期化
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 垂直方向にブラーをかける
    gl.uniform1i(bUniLocation[1], 0);
    gl.uniform1i(bUniLocation[3], false);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // すべてのオフスクリーンレンダリングが完了したのでテクスチャとしてバインドする

    // フレームバッファをテクスチャとしてバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer1.t);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer2.t);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fBuffer4.t);

    // 最終シーンのレンダリングを開始

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // canvasを初期化
    gl.clearColor(0.0, 0.1, 0.1, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // プログラムオブジェクトの選択
    gl.useProgram(prg);

    // トーラスのレンダリング
    set_attribute(tVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
    m.inverse(mMatrixTorus, invMatrix);
    m.multiply(tmpMatrix, mMatrixTorus, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrixTorus);
    gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.uniformMatrix4fv(uniLocation[3], false, tmvpMatrix);
    gl.uniform3fv(uniLocation[4], qLightPosition);
    gl.uniform3fv(uniLocation[5], eyes);
    gl.uniform3fv(uniLocation[6], eyePosition);
    gl.uniform4fv(uniLocation[7], ambientColor);
    gl.uniform1i(uniLocation[8], 2);
    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

    // 球のレンダリング
    set_attribute(sVBOList, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
    m.inverse(mMatrixSphere, invMatrix);
    m.multiply(tmpMatrix, mMatrixSphere, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mMatrixSphere);
    gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

    // ライトの位置を点としてレンダリングする

    // プログラムオブジェクトの選択
    gl.useProgram(pPrg);

    // ライトの位置を表す点のレンダリング
    set_attribute(lVBOList, pAttLocation, pAttStride);
    gl.uniformMatrix4fv(pUniLocation[0], false, tmpMatrix);
    gl.drawArrays(gl.POINT, 0, 1);

    // オフスクリーンでレンダリングした結果を正射影で最終シーンに合成

    // プログラムオブジェクトの選択
    gl.useProgram(oPrg);

    // 板ポリゴンのレンダリング
    set_attribute(vVBOList, oAttLocation, oAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);

    m.identity(mMatrix);
    m.translate(mMatrix, [-0.8, -0.8, 0.0], mMatrix);
    m.scale(mMatrix, [0.2, 0.2, 1.0], mMatrix);
    m.multiply(ortMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(oUniLocation[0], false, mvpMatrix);
    gl.uniform1i(oUniLocation[1], 0);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    m.translate(mMatrix, [2.0, 0.0, 0.0], mMatrix);
    m.multiply(ortMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(oUniLocation[0], false, mvpMatrix);
    gl.uniform1i(oUniLocation[1], 1);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    m.translate(mMatrix, [2.0, 0.0, 0.0], mMatrix);
    m.multiply(ortMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(oUniLocation[0], false, mvpMatrix);
    gl.uniform1i(oUniLocation[1], 2);
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
