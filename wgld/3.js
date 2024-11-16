var c = document.getElementById('canvas');
c.width = 500;
c.height = 300;
var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
gl.clear(gl.COLOR_BUFFER_BIT);
gl.clearColor(0.0, 0.0, 0.0, 1.0);

onload = function () {
  var c = document.getElementById('canvas');
  c.width = 500;
  c.height = 300;

  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

  {
    const vs = create_shader(gl, 'vshader');
    const fs = create_shader(gl, 'fshader');
    create_program(gl, vs, fs);
  }
  {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
  }
  const [position, normal, color, index] = torus(32, 32, 1.0, 2.0);

  createVBO(gl, 'position', 3, position);
  createVBO(gl, 'normal', 3, normal);
  createVBO(gl, 'color', 4, color);

  {
    var ibo = create_ibo(gl, index);

    // IBOをバインドして登録する
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  }

  //模型变换矩阵
  var mMatrix = mat4.identity(mat4.create());
  //视图变换矩阵
  var vMatrix = mat4.identity(mat4.create());
  //投影变换矩阵
  var pMatrix = mat4.identity(mat4.create());
  //最终坐标变换矩阵
  var mvpMatrix = mat4.identity(mat4.create());

  //逆矩阵
  var invMatrix = mat4.identity(mat4.create());

  var tmpMatrix = mat4.identity(mat4.create());

  {
    //平行光方向
    var lightDirection = [-1.0, 0.5, 0.5];
    gl.uniform3fv(gl.getUniformLocation(gl.program, 'lightDirection'), lightDirection);
  }
  {
    //环境光
    var ambientColor = [0.1, 0.1, 0.1, 1.0];
    gl.uniform4fv(gl.getUniformLocation(gl.program, 'ambientColor'), ambientColor);
  }

  //lookAt(out, eye, center, up)
  mat4.lookAt(vMatrix, [0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0]);

  //perspective(out, fovy, aspect, near, far)
  mat4.perspective(pMatrix, 45, c.width / c.height, 0.1, 100);

  //multiply(out, a, b)
  mat4.multiply(tmpMatrix, pMatrix, vMatrix);

  let count = 0;
  function animate() {
    {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    count++;
    var rad = ((count % 360) * Math.PI) / 180;

    mat4.rotate(mMatrix, mMatrix, rad, [0, 1, 1]);

    mat4.multiply(mvpMatrix, tmpMatrix, mMatrix);
    //invert(out, a)
    mat4.invert(invMatrix, mMatrix);

    var uniLocation = gl.getUniformLocation(gl.program, 'mvpMatrix');
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    //绘制
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    //清空不同的缓冲区命令
    gl.flush();
  }
  setInterval(animate, 100);
};

function create_shader(gl, id) {
  var shader;

  var scriptElement = document.getElementById(id);

  if (!scriptElement) {
    return;
  }

  switch (scriptElement.type) {
    case 'x-shader/x-vertex':
      shader = gl.createShader(gl.VERTEX_SHADER);
      break;

    case 'x-shader/x-fragment':
      shader = gl.createShader(gl.FRAGMENT_SHADER);
      break;
    default:
      return;
  }

  gl.shaderSource(shader, scriptElement.text);

  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  } else {
    //编译错误
    console.log(scriptElement.text, gl.getShaderInfoLog(shader));
  }
}

function create_program(gl, vs, fs) {
  var program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);

  gl.linkProgram(program);

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.useProgram(program);
    gl.program = program;
    return program;
  } else {
    //编译错误
    console.log(gl.getProgramInfoLog(program));
  }
}
function createVBO(gl, attriName, num, data) {
  var attLocation = gl.getAttribLocation(gl.program, attriName);

  var vbo = create_vbo(gl, data);

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  gl.enableVertexAttribArray(attLocation);

  gl.vertexAttribPointer(attLocation, num, gl.FLOAT, false, 0, 0);
}
function create_vbo(gl, data) {
  var vbo = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return vbo;
}
function create_ibo(gl, data) {
  var ibo = gl.createBuffer();

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return ibo;
}

function torus(row, column, irad, orad) {
  var pos = new Array(),
    nor = new Array(),
    col = new Array(),
    idx = new Array();
  for (var i = 0; i <= row; i++) {
    var r = ((Math.PI * 2) / row) * i;
    var rr = Math.cos(r);
    var ry = Math.sin(r);
    for (var ii = 0; ii <= column; ii++) {
      var tr = ((Math.PI * 2) / column) * ii;
      var tx = (rr * irad + orad) * Math.cos(tr);
      var ty = ry * irad;
      var tz = (rr * irad + orad) * Math.sin(tr);
      var rx = rr * Math.cos(tr);
      var rz = rr * Math.sin(tr);
      pos.push(tx, ty, tz);
      nor.push(rx, ry, rz);
      var tc = hsva((360 / column) * ii, 1, 1, 1);
      col.push(tc[0], tc[1], tc[2], tc[3]);
    }
  }
  for (i = 0; i < row; i++) {
    for (ii = 0; ii < column; ii++) {
      r = (column + 1) * i + ii;
      idx.push(r, r + column + 1, r + 1);
      idx.push(r + column + 1, r + column + 2, r + 1);
    }
  }
  return [pos, nor, col, idx];
}

function hsva(h, s, v, a) {
  if (s > 1 || v > 1 || a > 1) {
    return;
  }
  var th = h % 360;
  var i = Math.floor(th / 60);
  var f = th / 60 - i;
  var m = v * (1 - s);
  var n = v * (1 - s * f);
  var k = v * (1 - s * (1 - f));
  var color = new Array();
  if (!s > 0 && !s < 0) {
    color.push(v, v, v, a);
  } else {
    var r = new Array(v, n, m, m, k, v);
    var g = new Array(k, v, v, n, m, m);
    var b = new Array(m, m, k, v, v, n);
    color.push(r[i], g[i], b[i], a);
  }
  return color;
}
