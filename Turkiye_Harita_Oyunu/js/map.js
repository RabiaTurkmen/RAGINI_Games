export async function loadMap(container) {
  let svg;
  try {
    const res = await fetch("./assets/turkiye-81-il.svg");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const svgText = await res.text();
    container.innerHTML = svgText;
    svg = container.querySelector("svg");
  } catch (error) {
    svg = await loadSvgWithObject(container);
  }

  if (!svg) {
    throw new Error("SVG haritasi yuklenemedi.");
  }

  const provinceGroups = [...svg.querySelectorAll("g[data-city-code]")];
  const provinces = provinceGroups.map((group) => {
    const path = group.querySelector("path");
    path.classList.add("province");
    path.dataset.cityCode = group.dataset.cityCode;
    path.dataset.cityName = group.dataset.cityName;
    return {
      code: group.dataset.cityCode,
      name: group.dataset.cityName,
      path,
      group
    };
  });

  return {
    svg,
    provinces,
    byCode: Object.fromEntries(provinces.map((p) => [p.code, p]))
  };
}

async function loadSvgWithObject(container) {
  container.innerHTML = "";
  return new Promise((resolve, reject) => {
    const objectEl = document.createElement("object");
    objectEl.type = "image/svg+xml";
    objectEl.data = "./assets/turkiye-81-il.svg";
    objectEl.style.width = "100%";
    objectEl.style.height = "100%";

    objectEl.onload = () => {
      const svg = objectEl.contentDocument?.querySelector("svg");
      if (!svg) {
        reject(new Error("Object SVG parse edilemedi."));
        return;
      }

      const clonedSvg = svg.cloneNode(true);
      container.innerHTML = "";
      container.appendChild(clonedSvg);
      resolve(clonedSvg);
    };

    objectEl.onerror = () => reject(new Error("Object ile SVG yukleme basarisiz."));
    container.appendChild(objectEl);
  });
}

export function analyzeSpatialGraph(provinces) {
  const centers = {};
  const bboxes = {};
  provinces.forEach((p) => {
    const box = p.path.getBBox();
    bboxes[p.code] = box;
    centers[p.code] = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  });

  const adjacency = {};
  const distanceMap = {};
  provinces.forEach((a) => {
    adjacency[a.code] = new Set();
    distanceMap[a.code] = [];
    provinces.forEach((b) => {
      if (a.code === b.code) {
        return;
      }
      const d = distance(centers[a.code], centers[b.code]);
      distanceMap[a.code].push({ code: b.code, distance: d });
      if (boxesClose(bboxes[a.code], bboxes[b.code], 5) && d < 120) {
        adjacency[a.code].add(b.code);
      }
    });
    distanceMap[a.code].sort((x, y) => x.distance - y.distance);
  });
  return { centers, adjacency, distanceMap };
}

function boxesClose(a, b, margin) {
  return !(
    a.x + a.width + margin < b.x ||
    b.x + b.width + margin < a.x ||
    a.y + a.height + margin < b.y ||
    b.y + b.height + margin < a.y
  );
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
