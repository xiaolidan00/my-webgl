var faceColors = [
  [1, 0.6470588235294118, 0], // Front face: orange
  [1.0, 0.0, 0.0], // Back face: red
  [0.0, 1.0, 0.0], // Top face: green
  [0.0, 0.0, 1.0], // Bottom face: blue
  [1.0, 1.0, 0.0], // Right face: yellow
  [1.0, 0.0, 1.0] // Left face: purple
];

// Convert the array of colors into a table for all the vertices.

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
const faceNormals = [
  [0.0, 0.0, 1.0], // front
  [0.0, 0.0, -1.0][(0.0, 1.0, 0.0)], // back //  up
  [0.0, -1.0, 0.0], //  down
  [1.0, 0.0, 0.0], //  right
  [-1.0, 0.0, 0.0] // left
];
const textureCoord = [
  [0.0, 0.0],
  [1.0, 0.0],
  [1.0, 1.0],
  [0.0, 1.0]
];
var textureCoordinates = [];
faceColors.forEach((a) => {
  textureCoordinates.push(textureCoord);
});

var colors = [];
var normals = [];
var vertexCount = faceColors.length * faceColors.length;
for (var j = 0; j < vertexCount; ++j) {
  let i = parseInt(j / 4);
  colors.push(faceColors[i % faceColors.length]);
  normals.push(faceNormals[i % faceNormals.length]);
}
