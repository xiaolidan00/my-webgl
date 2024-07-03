const fs = require('fs');

const data = [
  { title: '变换' },
  { title: '顶点着色器加减平移', url: 'translate1.html' },
  { title: 'glmatrix 矩阵平移', url: 'translate2.html' },
  { title: '2D 旋转', url: 'rotate2D.html' },
  { title: '3D 旋转', url: 'rotate3D.html' },
  { title: '顶点着色器缩放', url: 'scale1.html' },
  { title: 'glmatrix 矩阵缩放', url: 'scale2.html' },
  { title: '投影与摄像机' },
  { title: '正交投影', url: 'ortho.html' },
  { title: '透视投影', url: 'perspective.html' },
  { title: '摄像机', url: 'camera.html' },
  { title: '纹理贴图' },
  { title: '2D 贴图', url: 'texture.html' },
  { title: '2D 贴图颜色', url: 'texture1.html' },
  { title: '给立方体加贴图', url: 'textureCube.html' },
  { title: '给立方体加动态 Canvas 贴图', url: 'textureCubeCanvas.html' },
  { title: '给立方体加视频贴图', url: 'textureCubeVideo.html' },
  { title: '帧缓冲贴图', url: 'cubeFrameBuffer.html' },
  { title: '光照' },
  { title: '平行漫反射光', url: 'diffuseLight.html' },
  { title: '环境光+平行漫反射光', url: 'ambientDiffuseLight.html' },
  { title: '环境光+点光源漫反射光', url: 'pointAmbientLight.html' },
  { title: '点光源不跟着物体动', url: 'pointLight1.html' },
  { title: '全景图与反射' },
  { title: '全景图', url: 'panorama.html' },
  { title: '反射立方体', url: 'reflectionCube.html' },
  { title: '反射立方体+全景图', url: 'reflectionCube1.html' },
  { title: '透明立方体+全景图', url: 'reflectionCube2.html' },
  { title: '交互' },
  { title: '旋转物体', url: 'actionRotate.html' },
  { title: '选中物体', url: 'actionPick.html' },
  { title: '其他' },
  { title: '雾', url: 'fog.html' },
  { title: '阴影', url: 'shadow.html' },
  { title: 'webgl高级图片滤镜' },
  { title: '美白效果滤镜', url: 'filters/light.html' },
  { title: '对比度效果滤镜', url: 'filters/contract.html' },
  { title: '模糊效果滤镜', url: 'filters/blur.html' },
  { title: '美白磨皮效果滤镜', url: 'filters/soft.html' },
  { title: '柔光磨皮效果滤镜', url: 'filters/soft1.html' },
  { title: 'lomo风格滤镜', url: 'filters/lomo.html' },
  { title: '素描风格滤镜', url: 'filters/line.html' },
  { title: '油画风格滤镜', url: 'filters/paint.html' }
];

const list = [];
const readme = [];
data.forEach((a) => {
  if (a.url) {
    const path = 'src/' + a.url;
    list.push(`<li><a href="${path}" target="_blank">${a.title}</a></li>`);
    readme.push(`- ${a.title}`);
    readme.push(`   - [源码地址:${path}](${path})`);
    readme.push(`   - [预览效果](https://xiaolidan00.github.io/my-webgl/${path})`);
  } else {
    readme.push('');
    readme.push(`## ${a.title}`);
    readme.push('');
    list.push(`<h2>${a.title}</h2>`);
  }
});
const f = `<!DOCTYPE html>
<html":"lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WebGL实践</title>
    <style>
    body{
    padding:0px;
    margin:0px;
    position:absolute;
    height:100%;
    width:100%;
    }
    .content{
    width:800px;
    margin:0 auto;
    padding:20px 0;
    }
    a{
      font-size: 16px;
      line-height: 2;
    }
    </style>
  </head>
  <body>
  <div class="content">
  <h1>WebGL实践</h1>
  <ul>
${list.join('')}
</ul>
</div>  
</body>
</html>
`;
fs.writeFile('./index.html', f, () => {});

fs.writeFile('./README.md', '# WebGL实践\n' + readme.join('\n'), () => {});
