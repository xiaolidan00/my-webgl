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
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
  {
    const vs = create_shader(gl, 'vshader');
    const fs = create_shader(gl, 'fshader');
    create_program(gl, vs, fs);
  }
  {
    var vertex_position = [
      0.0,
      1.0,
      0.0, //X
      1.0,
      0.0,
      0.0, //Y
      -1.0,
      0.0,
      0.0 //Z
    ];

    var attLocation = gl.getAttribLocation(gl.program, 'position');

    // VBOの生成
    var vbo = create_vbo(gl, vertex_position);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    gl.enableVertexAttribArray(attLocation);

    gl.vertexAttribPointer(attLocation, 3, gl.FLOAT, false, 0, 0);
  }
  {
    var vertex_color = [
      1.0,
      0.0,
      0.0,
      1.0, //red
      0.0,
      1.0,
      0.0,
      1.0, //green
      0.0,
      0.0,
      1.0,
      1.0 //blue
    ];
    var attLocation1 = gl.getAttribLocation(gl.program, 'color');
    var vbo1 = create_vbo(gl, vertex_color);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);

    gl.enableVertexAttribArray(attLocation1);

    gl.vertexAttribPointer(attLocation1, 4, gl.FLOAT, false, 0, 0);
  }

  var rad = ((45 % 360) * Math.PI) / 180;

  //模型变换矩阵
  var mMatrix = mat4.identity(mat4.create());
  //视图变换矩阵
  var vMatrix = mat4.identity(mat4.create());
  //投影变换矩阵
  var pMatrix = mat4.identity(mat4.create());
  //最终坐标变换矩阵
  var mvpMatrix = mat4.identity(mat4.create());

  var tmpMatrix = mat4.identity(mat4.create());
  {
    //lookAt(out, eye, center, up)
    mat4.lookAt(vMatrix, [0.0, 0.0, 3.0], [0, 0, 0], [0, 1, 0]);

    //perspective(out, fovy, aspect, near, far)
    mat4.perspective(pMatrix, 90, c.width / c.height, 0.1, 100);

    //multiply(out, a, b)
    mat4.multiply(tmpMatrix, pMatrix, vMatrix);
    //translate(out, a, v)
    mat4.translate(mMatrix, mMatrix, [1.5, 0.0, 0.0]);

    mat4.multiply(mvpMatrix, tmpMatrix, mMatrix);

    var uniLocation = gl.getUniformLocation(gl.program, 'mvpMatrix');
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    //绘制
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  {
    mat4.identity(mMatrix);
    mat4.translate(mMatrix, mMatrix, [1.0, -1.0, 0.0]);
    //rotate(out, a, rad, axis)
    mat4.rotate(mMatrix, mMatrix, rad, [0, 1, 0]);

    mat4.multiply(mvpMatrix, tmpMatrix, mMatrix);

    var uniLocation = gl.getUniformLocation(gl.program, 'mvpMatrix');
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    //绘制
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  {
    var s = Math.sin(rad) + 1.0;
    mat4.identity(mMatrix);

    mat4.translate(mMatrix, mMatrix, [-1.5, 0.0, 0.0]);
    //scale(out, a, v)
    mat4.scale(mMatrix, mMatrix, [s, s, 0.0]);

    mat4.multiply(mvpMatrix, tmpMatrix, mMatrix);

    var uniLocation = gl.getUniformLocation(gl.program, 'mvpMatrix');
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    //绘制
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  //清空不同的缓冲区命令
  gl.flush();
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
function create_vbo(gl, data) {
  var vbo = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return vbo;
}
