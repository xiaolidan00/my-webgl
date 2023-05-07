# 1.准备工作

来个最简单的着色器

> 顶点着色器

```glsl
attribute vec3 aPosition;
      attribute vec3 aColor;
      uniform mat4 uModelViewMatrix;
      varying lowp vec3 vColor;

      void main() {
        gl_Position = uModelViewMatrix * vec4(aPosition,1.0);
        vColor=aColor;
      }
```

> 片元着色器

```glsl
 varying lowp vec3 vColor;

      void main() {
         gl_FragColor = vec4(vColor,1.0);
      }
```

# 2.webgl 图形变换

# 2D 旋转

```js
//计算2D旋转矩阵
function createRotateMatrix(angle) {
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

# 3D 旋转

# 需要使用到的库

- glMatrix 官方 API 文档:`https://glmatrix.net/docs/module-mat4.html`
- dat.gui 官方 API 文档:`https://github.com/dataarts/dat.gui/blob/master/API.md`
