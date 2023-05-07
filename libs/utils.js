function rgb2Color(r, g, b) {
  return [r / 255, g / 255, b / 255];
}
function flatArr(arr) {
  return arr.flat(Infinity);
}
function degToRad(angle) {
  return (angle * Math.PI) / 180;
}

function initGl(id) {
  var canvas = document.getElementById(id);
  canvas.style.background = 'black';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var gl = canvas.getContext('webgl');
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  });
  return gl;
}
function cleanGl(gl) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function initArrBuffer(gl, code, value, perLen) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, value, gl.STATIC_DRAW);

  let aVal = gl.getAttribLocation(gl.program, code);
  gl.vertexAttribPointer(aVal, perLen, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(aVal);
}

function initElmtBuffer(gl, value) {
  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, value, gl.STATIC_DRAW);
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(
      (type == gl.VERTEX_SHADER ? '顶点着色器-错误' : '片元着色器-错误') +
        gl.getShaderInfoLog(shader)
    );
    return null;
  }

  return shader;
}
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  gl.useProgram(shaderProgram);
  gl.program = shaderProgram;
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log('gl着色器程序错误 ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function initProjectionMatrix(gl) {
  const fieldOfView = degToRad(45);
  const aspect = gl.canvas.width / gl.canvas.height;
  const zNear = 1;
  const zFar = 10000.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
  console.log(projectionMatrix);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(gl.program, 'uProjectionMatrix'),
    false,
    projectionMatrix
  );
  return projectionMatrix;
}
