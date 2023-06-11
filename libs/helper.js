function initGUI(setting = {}, isLight) {
  var settings = Object.assign(
    {
      angleX: 1,
      angleY: 1,
      angleZ: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      x: 0,
      y: 0,
      z: -6,
      lightX: 2,
      lightY: 0.5,
      lightZ: -1
    },
    setting
  );

  var gui = new dat.GUI();
  var rotatefolder = gui.addFolder('rotate');
  rotatefolder.add(settings, 'angleX', 0, 2 * Math.PI);
  rotatefolder.add(settings, 'angleY', 0, 2 * Math.PI);
  rotatefolder.add(settings, 'angleZ', 0, 2 * Math.PI);
  var scalefolder = gui.addFolder('scale');
  scalefolder.add(settings, 'scaleX', 0.1, 3);
  scalefolder.add(settings, 'scaleY', 0.1, 3);
  scalefolder.add(settings, 'scaleZ', 0.1, 3);
  var posfolder = gui.addFolder('position');
  posfolder.add(settings, 'x', -2, 2);
  posfolder.add(settings, 'y', -2, 2);
  posfolder.add(settings, 'z', -8, -4);
  if (isLight) {
    var lightfolder = gui.addFolder('light');
    lightfolder.add(settings, 'lightX', -4, 4);
    lightfolder.add(settings, 'lightY', -4, 4);
    lightfolder.add(settings, 'lightZ', -4, 4);
  }
  window.gui = gui;
  return settings;
}
function initModelViewMatrix(gl, settings) {
  var modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [settings.x, settings.y, settings.z]);
  mat4.rotateX(modelViewMatrix, modelViewMatrix, settings.angleX);
  mat4.rotateY(modelViewMatrix, modelViewMatrix, settings.angleY);
  mat4.rotateZ(modelViewMatrix, modelViewMatrix, settings.angleZ);

  mat4.scale(modelViewMatrix, modelViewMatrix, [settings.scaleX, settings.scaleY, settings.scaleZ]);
  if (gl.getUniformLocation(gl.program, 'uModelViewMatrix')) {
    gl.uniformMatrix4fv(
      gl.getUniformLocation(gl.program, 'uModelViewMatrix'),
      false,
      modelViewMatrix
    );
  }

  return modelViewMatrix;
}
