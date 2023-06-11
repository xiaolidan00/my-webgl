var faceColors = [
  [1.0, 1.0, 1.0], // Front face: white
  [1.0, 0.0, 0.0], // Back face: red
  [0.0, 1.0, 0.0], // Top face: green
  [0.0, 0.0, 1.0], // Bottom face: blue
  [1.0, 1.0, 0.0], // Right face: yellow
  [1.0, 0.0, 1.0] // Left face: purple
];

var positions = [
  // Front face
  [-1.0, -1.0, 1.0],
  [1.0, -1.0, 1.0],
  [1.0, 1.0, 1.0],
  [-1.0, 1.0, 1.0],

  // Back face
  [-1.0, -1.0, -1.0],
  [-1.0, 1.0, -1.0],
  [1.0, 1.0, -1.0],
  [1.0, -1.0, -1.0],

  // Top face
  [-1.0, 1.0, -1.0],
  [-1.0, 1.0, 1.0],
  [1.0, 1.0, 1.0],
  [1.0, 1.0, -1.0],

  // Bottom face
  [-1.0, -1.0, -1.0],
  [1.0, -1.0, -1.0],
  [1.0, -1.0, 1.0],
  [-1.0, -1.0, 1.0],

  // Right face
  [1.0, -1.0, -1.0],
  [1.0, 1.0, -1.0],
  [1.0, 1.0, 1.0],
  [1.0, -1.0, 1.0],

  // Left face
  [-1.0, -1.0, -1.0],
  [-1.0, -1.0, 1.0],
  [-1.0, 1.0, 1.0],
  [-1.0, 1.0, -1.0]
];

var indices = [
  [0, 1, 2],
  [0, 2, 3], // front
  [4, 5, 6],
  [4, 6, 7], // back
  [8, 9, 10],
  [8, 10, 11], // top
  [12, 13, 14],
  [12, 14, 15], // bottom
  [16, 17, 18],
  [16, 18, 19], // right
  [20, 21, 22],
  [20, 22, 23] // left
];

var vertexNormals = [
  // Front
  [0.0, 0.0, 1.0],

  // Back
  [0.0, 0.0, -1.0],

  // Top
  [0.0, 1.0, 0.0],

  // Bottom
  [0.0, -1.0, 0.0],

  // Right
  [1.0, 0.0, 0.0],

  // Left
  [-1.0, 0.0, 0.0]
];
var texCoord = [
  [0.0, 0.0],
  [1.0, 0.0],
  [1.0, 1.0],
  [0.0, 1.0]
];
var textureCoordinates = [];
var colors = [];
var normals = [];
faceColors.forEach((c, i) => {
  colors.push(c, c, c, c);
  let n = vertexNormals[i];
  normals.push(n, n, n, n);
  textureCoordinates.push(...texCoord);
});

var vertexCount = 36;
