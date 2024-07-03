function rgb2Color(r, g, b) {
  return [r / 255, g / 255, b / 255];
}
function flatArr(arr) {
  return arr.flat(Infinity);
}
function degToRad(angle) {
  return (angle * Math.PI) / 180;
}
function resizeGl(gl) {
  gl.canvas.width = gl.canvas.offsetWidth;
  gl.canvas.height = gl.canvas.offsetHeight;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function initGl(id) {
  var canvas = document.getElementById(id);
  canvas.style.background = 'black';

  var gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  resizeGl(gl);
  window.addEventListener('resize', () => {
    resizeGl(gl);
  });
  return gl;
}
function cleanGl(gl) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  resizeGl(gl);
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

//透视投影

function perspective(fieldOfViewInRadians, aspect, near, far) {
  var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
  var rangeInv = 1.0 / (near - far);

  return flatArr([
    [f / aspect, 0, 0, 0],
    [0, f, 0, 0],
    [0, 0, (near + far) * rangeInv, -1],
    [0, 0, near * far * rangeInv * 2, 0]
  ]);
}

function initProjectionMatrix(gl) {
  const fieldOfView = degToRad(45);
  const aspect = gl.canvas.width / gl.canvas.height;
  const zNear = 1;
  const zFar = 2000.0;

  var projectionMatrix = perspective(fieldOfView, aspect, zNear, zFar);

  //   var projectionMatrix = mat4.create();

  //   mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  gl.uniformMatrix4fv(
    gl.getUniformLocation(gl.program, 'uProjectionMatrix'),
    false,
    projectionMatrix
  );
  return projectionMatrix;
}

//正交投影
function orthographic(left, right, bottom, top, near, far) {
  return flatArr([
    [2 / (right - left), 0, 0, 0],
    [0, 2 / (top - bottom), 0, 0],
    [0, 0, 2 / (near - far), 0],

    [
      (left + right) / (left - right),
      (bottom + top) / (bottom - top),
      (near + far) / (near - far),
      1
    ]
  ]);
}

function initProjectionMatrixOrtho(gl) {
  var depth = Math.max(gl.canvas.width, gl.canvas.height);
  var left = -gl.canvas.width * 0.01;
  var right = gl.canvas.width * 0.01;
  var bottom = gl.canvas.height * 0.01;
  var top = -gl.canvas.height * 0.01;
  var near = depth * 0.1;
  var far = -depth * 0.1;
  var projectionMatrix = new Float32Array(orthographic(left, right, bottom, top, near, far));
  // var projectionMatrix = mat4.create();
  // mat4.ortho(projectionMatrix, left, right, bottom, top, near, far);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(gl.program, 'uProjectionMatrix'),
    false,
    projectionMatrix
  );
  return projectionMatrix;
}
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}
//加载贴图
function initTexture(gl, url) {
  return new Promise((resolve) => {
    var image = new Image();
    image.src = url; //必须同域
    image.onload = () => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      resolve({ texture, image });
    };
  });
}

function initCubeTex(gl, texture, target, url) {
  return new Promise((resolve) => {
    var image = new Image();
    image.src = url; //必须同域
    image.onload = () => {
      console.log(target, url);
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      resolve({ image, texture });
    };
  });
}
//立方体贴图TEXTURE_CUBE_MAP
async function initCubeTexture(gl, images) {
  const faceMap = {
    //前
    f: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
    //后
    b: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    //上
    u: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
    //下
    d: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    //左
    l: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    //右
    r: gl.TEXTURE_CUBE_MAP_POSITIVE_X
  };
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  for (let k in images) {
    await initCubeTex(gl, texture, faceMap[k], images[k]);
  }

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}
//初始化帧缓冲和贴图
function initFrameBuffer(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  //frame生成的贴图宽高要与截取webgl的宽高一致，否则有可能物体在画面外，我这里默认了整个场景
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.canvas.width,
    gl.canvas.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  var framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  framebuffer.texture = texture;

  var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

  if (gl.FRAMEBUFFER_COMPLETE !== e) {
    console.log('Frame buffer object is incomplete: ' + e.toString());

    return;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(texture, null);
  return { framebuffer, texture };
}

function convertBase64UrlToFile(base64, fileName) {
  let parts = base64.split(';base64,');
  let contentType = parts[0].split(':')[1];
  let raw = window.atob(parts[1]);
  let rawLength = raw.length;
  let uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; i++) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new File([uInt8Array], fileName, { type: contentType });
}
