function createFilled3D(width, depth, height, fillValue) {
  return Array.from({ length: height }, () =>
    Array.from({ length: depth }, () => Array.from({ length: width }, () => fillValue))
  );
}

function toOddWithinRange(value, min, max) {
  const clamped = Math.max(min, Math.min(max, value));
  return clamped % 2 === 0 ? clamped - 1 : clamped;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generate3DMaze(width, depth, height) {
  const maze = createFilled3D(width, depth, height, 1);
  const dirs = [
    [2, 0, 0],
    [-2, 0, 0],
    [0, 2, 0],
    [0, -2, 0],
    [0, 0, 2],
    [0, 0, -2],
  ];

  function inRange(x, y, z) {
    return x > 0 && x < width - 1 && y > 0 && y < depth - 1 && z > 0 && z < height - 1;
  }

  function carve(x, y, z) {
    maze[z][y][x] = 0;
    const order = shuffle([...dirs]);

    for (const [dx, dy, dz] of order) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;

      if (!inRange(nx, ny, nz) || maze[nz][ny][nx] === 0) {
        continue;
      }

      maze[z + dz / 2][y + dy / 2][x + dx / 2] = 0;
      carve(nx, ny, nz);
    }
  }

  carve(1, 1, 1);

  const start = { x: 1, y: 1, z: 1 };
  const goal = { x: width - 2, y: depth - 2, z: height - 2 };

  maze[start.z][start.y][start.x] = "S";
  maze[goal.z][goal.y][goal.x] = "G";

  return { maze, start, goal };
}

function renderLayers(maze) {
  const layersEl = document.getElementById("layers");
  layersEl.innerHTML = "";

  maze.forEach((layer, z) => {
    const card = document.createElement("article");
    card.className = "layer-card";

    const title = document.createElement("h3");
    title.textContent = `Z=${z}`;

    const pre = document.createElement("pre");
    pre.className = "layer-grid";
    pre.textContent = layer
      .map((row) =>
        row
          .map((cell) => {
            if (cell === 1) return "#";
            if (cell === 0) return ".";
            return cell;
          })
          .join("")
      )
      .join("\n");

    card.appendChild(title);
    card.appendChild(pre);
    layersEl.appendChild(card);
  });
}

function exportAsJson(mazeData) {
  const output = document.getElementById("jsonOutput");
  output.value = JSON.stringify(mazeData, null, 2);
}

function onGenerate() {
  const widthInput = document.getElementById("width");
  const depthInput = document.getElementById("depth");
  const heightInput = document.getElementById("height");

  const width = toOddWithinRange(Number(widthInput.value), 5, 61);
  const depth = toOddWithinRange(Number(depthInput.value), 5, 61);
  const height = toOddWithinRange(Number(heightInput.value), 3, 31);

  widthInput.value = String(width);
  depthInput.value = String(depth);
  heightInput.value = String(height);

  const mazeData = generate3DMaze(width, depth, height);
  renderLayers(mazeData.maze);
  exportAsJson({
    dimensions: { width, depth, height },
    start: mazeData.start,
    goal: mazeData.goal,
    maze: mazeData.maze,
    blockLegend: {
      wall: 1,
      path: 0,
      start: "S",
      goal: "G",
    },
  });
}

document.getElementById("generateBtn").addEventListener("click", onGenerate);
onGenerate();
