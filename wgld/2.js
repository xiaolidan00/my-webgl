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
    //开启正反面
    gl.enable(gl.CULL_FACE);

    //开启深度测试
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
  }
  {
    const vs = create_shader(gl, 'vshader');
    const fs = create_shader(gl, 'fshader');
    create_program(gl, vs, fs);
  }
  {
    var position = [0.0, 1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, -1.0, 0.0];

    var attLocation = gl.getAttribLocation(gl.program, 'position');

    // VBOの生成
    var vbo = create_vbo(gl, position);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    gl.enableVertexAttribArray(attLocation);

    gl.vertexAttribPointer(attLocation, 3, gl.FLOAT, false, 0, 0);
  }
  {
    /**
     *          0
     * 2                1
     *          3
     */
    var index = [
      0,
      1,
      2, //顺时针反面

      //   0,
      //   2,
      //   1,

      1,
      2,
      3 //逆时针正面
    ];
    var ibo = create_ibo(gl, index);

    // IBOをバインドして登録する
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  }
  {
    var color = [1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    var attLocation1 = gl.getAttribLocation(gl.program, 'color');
    var vbo1 = create_vbo(gl, color);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);

    gl.enableVertexAttribArray(attLocation1);

    gl.vertexAttribPointer(attLocation1, 4, gl.FLOAT, false, 0, 0);
  }

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

    // var rad = ((45 % 360) * Math.PI) / 180;

    // mat4.rotate(mMatrix, mMatrix, rad, [0, 1, 0.0]);

    mat4.multiply(mvpMatrix, tmpMatrix, mMatrix);

    var uniLocation = gl.getUniformLocation(gl.program, 'mvpMatrix');
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    //绘制
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
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
function create_ibo(gl, data) {
  var ibo = gl.createBuffer();

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return ibo;
}
