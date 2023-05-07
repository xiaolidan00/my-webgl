---
theme: fancy
---

webgl 基础入门

# 1.webgl 图形变换

> （1)2D 旋转

```js
//计算2D旋转矩阵
function createRotateMatrix(angle = 0.0) {
  var radian = degToRad(angle);
  var cosB = Math.cos(radian),
    sinB = Math.sin(radian);
  return flatArr([
    [cosB, sinB, 0.0, 0.0],
    [-sinB, cosB, 0.0, 0.0],
    [0.0, 0.0, 1.0, 0.0],
    [0.0, 0.0, 0.0, 1.0]
  ]);
}
```

![20230507_152621.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/729097d3b39648a08a36ac3160124d8d~tplv-k3u1fbpfcp-watermark.image?)

> (2)3D 旋转

```js
var settings = {
  x: 1,
  y: 1,
  z: 1
};
var modelViewMatrix = mat4.create();
mat4.rotateX(modelViewMatrix, modelViewMatrix, settings.x);
mat4.rotateY(modelViewMatrix, modelViewMatrix, settings.y);
mat4.rotateZ(modelViewMatrix, modelViewMatrix, settings.z);
```

![20230507_153431.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d9fe44b7b05f46e1b62e22e3dc22ee5d~tplv-k3u1fbpfcp-watermark.image?)

> (3)缩放

```js
function createScaleMatrix(sx = 1.0, sy = 1.0, sz = 1.0) {
  return flatArr([
    [sx, 0, 0.0, 0.0],
    [0, sy, 0.0, 0.0],
    [0.0, 0.0, sz, 0.0],
    [0.0, 0.0, 0.0, 1.0]
  ]);
}

//同理
var modelViewMatrix = mat4.create();
mat4.scale(modelViewMatrix, modelViewMatrix, [settings.scaleX, settings.scaleY, settings.scaleZ]);
```

![20230507_154627.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5861e60bcb834789b5b1e5a885e24de7~tplv-k3u1fbpfcp-watermark.image?)

![20230507_155635.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7a6e396d701448acbf38dc42c8579c38~tplv-k3u1fbpfcp-watermark.image?)

> (4)平移

- 顶点着色器

```glsl
//vec3 aMovePos;平移的位置
vec3 pos=aPosition+aMovePos;
 gl_Position =vec4(pos,1.0);
```

![20230507_161121.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fcc530d821c64f7caa790dd28f5562c6~tplv-k3u1fbpfcp-watermark.image?)

- 平移矩阵

```js
var modelViewMatrix = mat4.create();
mat4.translate(modelViewMatrix, modelViewMatrix, [settings.x, settings.y, settings.z]);
```

![20230507_161517.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/21d40072bcbe4f23b1bd5e065bb0d9fb~tplv-k3u1fbpfcp-watermark.image?)

# 2.wegl 投影与摄像机

> （1）正交投影:一个前后左右上下四个面形成的长方体空间，物体在里面才能显示，超过就不显示，不添加投影矩阵的情况下，默认是[-1.0,1.0]的立方体

```js
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

var depth = Math.max(gl.canvas.width, gl.canvas.height);
var left = -gl.canvas.width * 0.01;
var right = gl.canvas.width * 0.01;
var bottom = gl.canvas.height * 0.01;
var top = -gl.canvas.height * 0.01;
var near = depth * 0.1;
var far = -depth * 0.1;
var projectionMatrix = new Float32Array(orthographic(left, right, bottom, top, near, far));
```

- 注意：空间越大，物体就会显得越小，甚至看不到，空间设置要适当

- glMatrix 正交投影

```js
var projectionMatrix = mat4.create();
mat4.ortho(projectionMatrix, left, right, bottom, top, near, far);
```

> （2）透视投影：类似小孔成像，从一个点触发，放射出四棱锥，近点和远点分别切一个面，截取的这个范围内，物体就可以看到，其他就不能看见

```js
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
```

- glMatrix 透视投影

```js
var projectionMatrix = mat4.create();

mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
```

> (3)摄像机：一句话就是你的眼睛，你的眼睛等同于一个透视投影，眼睛会移动位置，然后就会呈现不同的视图

```js
var cameraMatrix = mat4.create();
//lookAt(out, eye, center, up)
mat4.lookAt(cameraMatrix, [settings.x, settings.y, settings.z], [0, 0, 0], [0, 1, 0]);
```

![20230507_202839.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6ef504ea3c3d448db4a27f89f8bd1e1e~tplv-k3u1fbpfcp-watermark.image?)

# 3.Github 地址

`https://github.com/xiaolidan00/my-webgl`

# 4.需要使用到的库

- glMatrix 官方 API 文档:`https://glmatrix.net/docs/module-mat4.html`
- dat.gui 官方 API 文档:`https://github.com/dataarts/dat.gui/blob/master/API.md`
