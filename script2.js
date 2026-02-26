const GEOJSON_URL = "indiaTelengana.geojson";

const svg = d3.select("#indiaMap");
const mapWrap = document.querySelector(".map-wrap");
const tooltip = document.getElementById("tooltip");
const beforeBtn = document.getElementById("beforeBtn");
const afterBtn = document.getElementById("afterBtn");
const controlsPanel = document.querySelector(".controls");
const editPlacementBtn = document.getElementById("editPlacementBtn");
const savePlacementBtn = document.getElementById("savePlacementBtn");
const resetPlacementBtn = document.getElementById("resetPlacementBtn");
const placementStatus = document.getElementById("placementStatus");

const NET_CHANGE_MIN = -11;
const NET_CHANGE_MID = 0;
const NET_CHANGE_MAX = 11;
const MAP_ZOOM_FACTOR = 0.93;
const SCENARIO_TRANSITION_MS = 900;
const SIZE_CHANGE_MULTIPLIER = 1.4;
const FIXED_MAP_VIEWBOX_WIDTH = 1600;
const FIXED_MAP_VIEWBOX_HEIGHT = 960;
const LAYOUT_RANDOM_SEED = 0.3141592653589793;

// Collision spacing controls puzzle-piece separation.
const COLLISION_PADDING = 10;
const COLLISION_TICKS = 620;
const COLLISION_ITERATIONS = 10;
const AREA_RADIUS_FACTOR = 1.38;
const BBOX_RADIUS_FACTOR = 0.5;
const LOSS_CLUSTER_X_RATIO = 0.27;
const GAIN_CLUSTER_X_RATIO = 0.73;
const CLUSTER_Y_RATIO = 0.58;
const CLUSTER_EDGE_MARGIN = 18;
const CLUSTER_INTER_GAP = 24;
const CLUSTER_PACKING_DENSITY = 0.72;
const MODES = ["before", "after"];
const MANUAL_LAYOUT_STORAGE_KEY = "india-delimitation-layout-v2";
const LABEL_LAYOUT_STORAGE_KEY = "india-delimitation-label-layout-v1";
const CLUSTER_CAPTION_TEXT = {
  loss: "States Losing Seats",
  gain: "States Gaining Seats",
};
const CLUSTER_CAPTION_MARGIN = 34;
const LOCKED_CAPTION_OFFSET_BY_SIDE = {
  loss: { dx: -25.80000000000001, dy: -6.18716258997074 },
  gain: { dx: -36.200000000000045, dy: 70.79905774971428 },
};
const LOCKED_CONTROLS_OFFSET = { dx: 251, dy: 3 };

// Hardcode your seats here by state name.
// Any state not listed here will show as N/A.
const CUSTOM_SEATS = {
  before: {
    "Andaman and Nicobar Islands": "1",
    "Andhra Pradesh": "25",
    "Arunachal Pradesh": "2",
    "Assam": "14",
    "Bihar": "40",
    "Chandigarh": "1",
    "Chhattisgarh": "11",
    "Dadra and Nagar Haveli and Daman and Diu": "2",
    "Delhi": "7",
    "Goa": "2",
    "Gujarat": "26",
    "Haryana": "10",
    "Himachal Pradesh": "4",
    "Jammu and Kashmir": "5",
    "Jharkhand": "14",
    "Karnataka": "28",
    "Kerala": "20",
    "Ladakh": "1",
    "Lakshadweep": "1",
    "Madhya Pradesh": "29",
    "Maharashtra": "48",
    "Manipur": "2",
    "Meghalaya": "2",
    "Mizoram": "1",
    "Nagaland": "1",
    "Odisha": "21",
    "Puducherry": "1",
    "Punjab": "13",
    "Rajasthan": "25",
    "Sikkim": "1",
    "Tamil Nadu": "39",
    "Telangana": "17",
    "Tripura": "2",
    "Uttar Pradesh": "80",
    "Uttarakhand": "5",
    "West Bengal": "42",
  },
  after: {
    "Andaman and Nicobar Islands": "1",
    "Andhra Pradesh": "20",
    "Arunachal Pradesh": "2",
    "Assam": "14",
    "Bihar": "49",
    "Chandigarh": "1",
    "Chhattisgarh": "12",
    "Dadra and Nagar Haveli and Daman and Diu": "2",
    "Delhi": "7",
    "Goa": "2",
    "Gujarat": "28",
    "Haryana": "12",
    "Himachal Pradesh": "3",
    "Jammu and Kashmir": "5",
    "Jharkhand": "15",
    "Karnataka": "26",
    "Kerala": "14",
    "Ladakh": "1",
    "Lakshadweep": "1",
    "Madhya Pradesh": "33",
    "Maharashtra": "48",
    "Manipur": "2",
    "Meghalaya": "2",
    "Mizoram": "1",
    "Nagaland": "1",
    "Odisha": "18",
    "Puducherry": "1",
    "Punjab": "12",
    "Rajasthan": "31",
    "Sikkim": "1",
    "Tamil Nadu": "29",
    "Telangana": "14",
    "Tripura": "2",
    "Uttar Pradesh": "91",
    "Uttarakhand": "4",
    "West Bengal": "38",
  },
};

const STATE_NAME_ALIASES = {
  "nct of delhi": "delhi",
  "delhi nct": "delhi",
  orissa: "odisha",
  "orissa state": "odisha",
  pondicherry: "puducherry",
  uttaranchal: "uttarakhand",
  "himachal pradesh state": "himachal pradesh",
  himachalpradesh: "himachal pradesh",
  "telangana state": "telangana",
  telegana: "telangana",
  teleganna: "telangana",
  telengana: "telangana",
  telenganna: "telangana",
  "dadra and nagar haveli": "dadra and nagar haveli and daman and diu",
  "daman and diu": "dadra and nagar haveli and daman and diu",
  "andaman and nicobar island": "andaman and nicobar islands",
};

const STATE_DISPLAY_NAMES = {
  orissa: "Odisha",
};

const projection = d3.geoMercator();
const path = d3.geoPath(projection);
const fillScale = d3
  .scaleLinear()
  .domain([NET_CHANGE_MIN, NET_CHANGE_MID, NET_CHANGE_MAX])
  .range(["#7f0000", "#ffffff", "#083b9a"])
  .clamp(true);
const beforeFillColor = "#b8b8b8";
const fallbackColor = "#f2f2f2";

const scenarioByState = {
  before: new Map(),
  after: new Map(),
};
const netChangeByState = new Map();
const sizeRatioByState = new Map();
const geometryByState = new Map();
const manualOverrideByMode = {
  before: new Map(),
  after: new Map(),
};
const layoutByMode = {
  before: new Map(),
  after: new Map(),
};
const labelOffsetByMode = {
  before: new Map(),
  after: new Map(),
};
const captionOffsetBySide = {
  loss: { ...LOCKED_CAPTION_OFFSET_BY_SIDE.loss },
  gain: { ...LOCKED_CAPTION_OFFSET_BY_SIDE.gain },
};
const controlsOffset = { ...LOCKED_CONTROLS_OFFSET };

let stateFeatures = [];
let visibleStateFeatures = [];
let statePaths;
let labelTexts;
let labelsLayer;
let captionLayer;
let captionTexts;
let clusterAnchorPlan = null;
let currentMode = "before";
let mapViewport = { width: 0, height: 0 };
let isPlacementEditMode = false;

init();

async function init() {
  try {
    let geojson = null;
    try {
      geojson = await d3.json(GEOJSON_URL);
    } catch (loadError) {
      console.warn(`Could not load ${GEOJSON_URL}, falling back to embedded map data.`, loadError);
      geojson = window.INDIA_GEOJSON || null;
    }

    if (!geojson || !Array.isArray(geojson.features)) {
      throw new Error("Invalid GeoJSON response");
    }

    const rawStateFeatures = geojson.features
      .map((feature) => ({ ...feature, stateName: getStateName(feature) }))
      .filter((feature) => feature.stateName);

    stateFeatures = selectOneFeaturePerState(rawStateFeatures).sort((a, b) =>
      a.stateName.localeCompare(b.stateName)
    );

    if (!stateFeatures.length) {
      throw new Error("No states were found in the map data");
    }

    buildScenarioData();
    fitProjection();
    captureGeometry();
    loadManualOverridesFromStorage();
    computeLayouts();
    loadLabelOffsetsFromStorage();
    renderMap();
    wireControls();
    applyControlsOffset();
    applyMode("before", { animate: false });
  } catch (error) {
    console.error(error);
    renderLoadError();
  }
}

function getStateName(feature) {
  const keys = ["st_nm", "ST_NM", "name", "NAME_1", "state", "STATE"];
  for (const key of keys) {
    if (feature.properties && feature.properties[key]) {
      return String(feature.properties[key]).trim();
    }
  }
  return "";
}

function selectOneFeaturePerState(features) {
  const groupedByState = new Map();

  for (const feature of features) {
    const stateName = feature.stateName;
    if (!stateName) continue;
    const stateKey = canonicalizeStateName(stateName);
    if (!groupedByState.has(stateKey)) {
      groupedByState.set(stateKey, []);
    }
    groupedByState.get(stateKey).push(feature);
  }

  const selected = [];
  for (const [stateKey, group] of groupedByState.entries()) {
    const stateLevel = group.filter((feature) => !hasDistrictProperty(feature));
    const candidates = stateLevel.length ? stateLevel : group;

    let bestFeature = candidates[0];
    let bestScore = getFeatureArea(bestFeature) + getStateIdMatchScore(bestFeature, stateKey);

    for (let i = 1; i < candidates.length; i += 1) {
      const feature = candidates[i];
      const score = getFeatureArea(feature) + getStateIdMatchScore(feature, stateKey);
      if (score > bestScore) {
        bestFeature = feature;
        bestScore = score;
      }
    }

    selected.push(bestFeature);
  }

  return selected;
}

function getFeatureArea(feature) {
  try {
    const area = d3.geoArea(feature);
    return Number.isFinite(area) ? area : 0;
  } catch (error) {
    return 0;
  }
}

function hasDistrictProperty(feature) {
  const properties = feature && feature.properties ? feature.properties : {};
  return Boolean(properties.district || properties.DISTRICT || properties.dt_code || properties.DT_CODE);
}

function getStateIdMatchScore(feature, stateKey) {
  const idKey = canonicalizeStateName(feature && feature.id ? feature.id : "");
  return idKey && idKey === stateKey ? 0.5 : 0;
}

function buildScenarioData() {
  scenarioByState.before.clear();
  scenarioByState.after.clear();
  netChangeByState.clear();
  sizeRatioByState.clear();
  visibleStateFeatures = [];

  const parsedBefore = parseCustomScenario(CUSTOM_SEATS.before);
  const parsedAfter = parseCustomScenario(CUSTOM_SEATS.after);
  const missingBefore = [];
  const missingAfter = [];

  for (const { stateName } of stateFeatures) {
    const beforeValue = getScenarioValueForState(stateName, parsedBefore);
    const afterValue = getScenarioValueForState(stateName, parsedAfter);

    if (Number.isFinite(beforeValue)) {
      scenarioByState.before.set(stateName, beforeValue);
    } else {
      missingBefore.push(stateName);
    }

    if (Number.isFinite(afterValue)) {
      scenarioByState.after.set(stateName, afterValue);
    } else {
      missingAfter.push(stateName);
    }

    const netChange = Number.isFinite(beforeValue) && Number.isFinite(afterValue) ? afterValue - beforeValue : null;
    netChangeByState.set(stateName, netChange);

    let ratio = 1;
    if (Number.isFinite(beforeValue) && beforeValue !== 0 && Number.isFinite(afterValue)) {
      const baseRatio = afterValue / beforeValue;
      const percentDelta = baseRatio - 1;
      ratio = 1 + percentDelta * SIZE_CHANGE_MULTIPLIER;
      ratio = Math.max(0.05, ratio);
    }
    sizeRatioByState.set(stateName, ratio);
  }

  if (missingBefore.length || missingAfter.length) {
    console.info(
      `CUSTOM_SEATS missing states -> before: ${missingBefore.length}, after: ${missingAfter.length}`,
      { beforeMissing: missingBefore, afterMissing: missingAfter }
    );
  }

  const hasTelanganaFeature = stateFeatures.some(
    (feature) => simplifyStateName(feature.stateName) === "telangana"
  );
  if (!hasTelanganaFeature) {
    console.warn(
      "GeoJSON does not include a Telangana feature label. Current labels:",
      stateFeatures.map((feature) => feature.stateName)
    );
  }
  const matchedTelanganaBefore = [...scenarioByState.before.keys()].some(
    (name) => simplifyStateName(name) === "telangana"
  );
  const matchedTelanganaAfter = [...scenarioByState.after.keys()].some(
    (name) => simplifyStateName(name) === "telangana"
  );
  if (!matchedTelanganaBefore || !matchedTelanganaAfter) {
    console.warn("Telangana seats were not matched to a GeoJSON state label.", {
      matchedBefore: matchedTelanganaBefore,
      matchedAfter: matchedTelanganaAfter,
    });
  }

  visibleStateFeatures = stateFeatures.filter((feature) => {
    const netChange = netChangeByState.get(feature.stateName);
    return Number.isFinite(netChange) && netChange !== 0;
  });
}

function fitProjection() {
  const width = FIXED_MAP_VIEWBOX_WIDTH;
  const height = FIXED_MAP_VIEWBOX_HEIGHT;
  mapViewport = { width, height };

  const collection = {
    type: "FeatureCollection",
    features: stateFeatures,
  };

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.attr("preserveAspectRatio", "xMidYMid meet");
  projection.fitSize([width, height], collection);
  projection.scale(projection.scale() * MAP_ZOOM_FACTOR);

  const [[x0, y0], [x1, y1]] = path.bounds(collection);
  const [tx, ty] = projection.translate();
  projection.translate([
    tx + (width / 2 - (x0 + x1) / 2),
    ty + (height / 2 - (y0 + y1) / 2),
  ]);
}

function captureGeometry() {
  geometryByState.clear();

  for (const feature of stateFeatures) {
    const stateName = feature.stateName;
    const [[x0, y0], [x1, y1]] = path.bounds(feature);
    const width = Math.max(2, x1 - x0);
    const height = Math.max(2, y1 - y0);
    const bboxRadius = (Math.hypot(width, height) / 2) * BBOX_RADIUS_FACTOR;
    const areaRadius = Math.sqrt(Math.max(1, path.area(feature)) / Math.PI) * AREA_RADIUS_FACTOR;
    const baseRadius = Math.max(bboxRadius, areaRadius);
    const cx = x0 + width / 2;
    const cy = y0 + height / 2;

    geometryByState.set(stateName, {
      cx,
      cy,
      baseRadius,
    });
  }
}

function computeLayouts() {
  const positionLayout = computeStablePositionLayout();
  layoutByMode.before = buildModeTransforms(positionLayout, "before");
  layoutByMode.after = buildModeTransforms(positionLayout, "after");
  applyManualOverridesToLayouts();
}

function computeStablePositionLayout() {
  const lossNodes = [];
  const gainNodes = [];

  for (const feature of visibleStateFeatures) {
    const stateName = feature.stateName;
    const geometry = geometryByState.get(stateName);
    const envelopeScale = Math.max(1, getScaleRatio(stateName));
    const netChange = netChangeByState.get(stateName);
    // Left cluster is strict net-loss; right cluster is strict net-gain.
    const group = Number.isFinite(netChange) && netChange < 0 ? "loss" : "gain";

    const node = {
      stateName,
      x: geometry.cx,
      y: geometry.cy,
      baseX: geometry.cx,
      baseY: geometry.cy,
      anchorX: geometry.cx,
      anchorY: geometry.cy,
      r: geometry.baseRadius * envelopeScale + COLLISION_PADDING,
      group,
    };

    if (group === "loss") {
      lossNodes.push(node);
    } else {
      gainNodes.push(node);
    }
  }

  const anchorPlan = buildClusterAnchors(lossNodes, gainNodes);
  clusterAnchorPlan = anchorPlan;
  applyCircularAnchors(lossNodes, anchorPlan.left.cx, anchorPlan.left.cy, anchorPlan.left.radius);
  applyCircularAnchors(gainNodes, anchorPlan.right.cx, anchorPlan.right.cy, anchorPlan.right.radius);

  simulateClusterInBounds(lossNodes, anchorPlan.left);
  simulateClusterInBounds(gainNodes, anchorPlan.right);

  const nodes = [...lossNodes, ...gainNodes];

  const transforms = new Map();
  for (const node of nodes) {
    transforms.set(node.stateName, {
      dx: node.x - node.baseX,
      dy: node.y - node.baseY,
      cx: node.baseX,
      cy: node.baseY,
    });
  }

  return transforms;
}

function buildModeTransforms(positionLayout, mode) {
  const transforms = new Map();

  for (const [stateName, position] of positionLayout.entries()) {
    transforms.set(stateName, {
      ...position,
      scale: mode === "after" ? getScaleRatio(stateName) : 1,
    });
  }

  return transforms;
}

function buildClusterAnchors(lossNodes, gainNodes) {
  const width = mapViewport.width;
  const height = mapViewport.height;
  const y = clamp(height * CLUSTER_Y_RATIO, CLUSTER_EDGE_MARGIN, height - CLUSTER_EDGE_MARGIN);

  const leftRadius = estimateClusterRadius(lossNodes);
  const rightRadius = estimateClusterRadius(gainNodes);
  const leftMaxNodeRadius = getMaxNodeRadius(lossNodes);
  const rightMaxNodeRadius = getMaxNodeRadius(gainNodes);

  let leftContainerRadius = leftRadius + COLLISION_PADDING * 1.5;
  let rightContainerRadius = rightRadius + COLLISION_PADDING * 1.5;

  const availableWidth = width - CLUSTER_EDGE_MARGIN * 2;
  const radialSpan = leftContainerRadius + rightContainerRadius;
  const maxRadialSpan = Math.max(12, availableWidth - CLUSTER_INTER_GAP);
  if (radialSpan > maxRadialSpan && radialSpan > 0) {
    const shrink = Math.max(0.72, maxRadialSpan / radialSpan);
    leftContainerRadius *= shrink;
    rightContainerRadius *= shrink;
  }

  const leftX = clamp(
    width * LOSS_CLUSTER_X_RATIO,
    CLUSTER_EDGE_MARGIN + leftContainerRadius,
    width - CLUSTER_EDGE_MARGIN - leftContainerRadius
  );
  const rightX = clamp(
    width * GAIN_CLUSTER_X_RATIO,
    CLUSTER_EDGE_MARGIN + rightContainerRadius,
    width - CLUSTER_EDGE_MARGIN - rightContainerRadius
  );

  let finalLeftX = leftX;
  let finalRightX = rightX;
  const minCenterGap = leftContainerRadius + rightContainerRadius + CLUSTER_INTER_GAP;
  if (finalRightX - finalLeftX < minCenterGap) {
    finalLeftX = CLUSTER_EDGE_MARGIN + leftContainerRadius;
    finalRightX = width - CLUSTER_EDGE_MARGIN - rightContainerRadius;
  }

  const leftAnchorRadius = Math.max(14, leftContainerRadius * 0.76);
  const rightAnchorRadius = Math.max(14, rightContainerRadius * 0.76);

  return {
    left: {
      cx: finalLeftX,
      cy: y,
      radius: leftAnchorRadius,
      containerRadius: leftContainerRadius,
    },
    right: {
      cx: finalRightX,
      cy: y,
      radius: rightAnchorRadius,
      containerRadius: rightContainerRadius,
    },
  };
}

function estimateClusterRadius(nodes) {
  if (!nodes.length) return 0;
  if (nodes.length === 1) return 0;

  const totalArea = d3.sum(nodes, (node) => Math.PI * node.r * node.r);
  const packedArea = totalArea / CLUSTER_PACKING_DENSITY;
  const idealRadius = Math.sqrt(packedArea / Math.PI);
  const densityBuffer = Math.sqrt(nodes.length) * 4.5;
  return Math.max(42, idealRadius + densityBuffer);
}

function applyCircularAnchors(nodes, cx, cy, radius) {
  if (!nodes.length) return;

  const ordered = [...nodes].sort((a, b) => b.r - a.r);
  if (ordered.length === 1) {
    ordered[0].anchorX = cx;
    ordered[0].anchorY = cy;
    ordered[0].x = cx;
    ordered[0].y = cy;
    return;
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < ordered.length; i += 1) {
    const t = (i + 0.5) / ordered.length;
    const radial = radius * Math.sqrt(t);
    const angle = -Math.PI / 2 + i * goldenAngle;
    const ox = cx + radial * Math.cos(angle);
    const oy = cy + radial * Math.sin(angle);

    ordered[i].anchorX = ox;
    ordered[i].anchorY = oy;
    ordered[i].x = ox;
    ordered[i].y = oy;
  }
}

function getMaxNodeRadius(nodes) {
  if (!nodes.length) return 0;
  return d3.max(nodes, (node) => node.r) || 0;
}

function simulateClusterInBounds(nodes, cluster) {
  if (!nodes.length) return;

  const simulation = d3.forceSimulation(nodes);
  if (typeof simulation.randomSource === "function" && typeof d3.randomLcg === "function") {
    simulation.randomSource(d3.randomLcg(LAYOUT_RANDOM_SEED));
  }

  simulation
    .force("x", d3.forceX((d) => d.anchorX).strength(0.3))
    .force("y", d3.forceY((d) => d.anchorY).strength(0.3))
    .force("collide", d3.forceCollide((d) => d.r).iterations(COLLISION_ITERATIONS))
    .stop();

  for (let i = 0; i < COLLISION_TICKS; i += 1) {
    simulation.tick();
    containNodesInCircle(nodes, cluster);
  }
  simulation.stop();
}

function containNodesInCircle(nodes, cluster) {
  const maxY = mapViewport.height - CLUSTER_EDGE_MARGIN;
  const minY = CLUSTER_EDGE_MARGIN;

  for (const node of nodes) {
    const allowedRadius = Math.max(4, cluster.containerRadius - node.r);
    const dx = node.x - cluster.cx;
    const dy = node.y - cluster.cy;
    const dist = Math.hypot(dx, dy);

    if (dist > allowedRadius && dist > 0) {
      const k = allowedRadius / dist;
      node.x = cluster.cx + dx * k;
      node.y = cluster.cy + dy * k;
    }

    node.y = clamp(node.y, minY + node.r, maxY - node.r);
  }
}

function renderMap() {
  const initialTransforms = layoutByMode.before || new Map();

  statePaths = svg
    .append("g")
    .attr("class", "states")
    .selectAll("path")
    .data(visibleStateFeatures)
    .enter()
    .append("path")
    .attr("class", "state")
    .attr("d", path)
    .attr("transform", (d) => transformToString(initialTransforms.get(d.stateName)))
    .attr("fill", () => beforeFillColor)
    .on("mouseenter", onStateEnter)
    .on("mousemove", onStateMove)
    .on("mouseleave", hideTooltip)
    .call(
      d3
        .drag()
        .on("start", onStateDragStart)
        .on("drag", onStateDrag)
        .on("end", onStateDragEnd)
    );

  labelsLayer = svg.append("g").attr("class", "labels");

  labelTexts = labelsLayer
    .selectAll("g")
    .data(visibleStateFeatures)
    .enter()
    .append("g")
    .attr("class", "state-label-group")
    .attr("transform", (d) => labelPositionToTransform(getLabelPosition(d.stateName, "before")))
    .call(
      d3
        .drag()
        .on("start", onLabelDragStart)
        .on("drag", onLabelDrag)
        .on("end", onLabelDragEnd)
    );

  labelTexts
    .append("text")
    .attr("class", "state-label-name")
    .attr("x", 0)
    .attr("y", -2)
    .text((d) => getDisplayStateName(d.stateName));

  labelTexts
    .append("text")
    .attr("class", "state-label-change")
    .attr("x", 0)
    .attr("y", 11)
    .text((d) => getNetChangeLabel(d.stateName))
    .attr("opacity", 0);

  renderClusterCaptions();
}

function wireControls() {
  beforeBtn.addEventListener("click", () => applyMode("before", { animate: true }));
  afterBtn.addEventListener("click", () => applyMode("after", { animate: true }));
  if (editPlacementBtn) {
    editPlacementBtn.addEventListener("click", () => {
      setPlacementEditMode(!isPlacementEditMode);
    });
  }
  if (savePlacementBtn) {
    savePlacementBtn.addEventListener("click", () => {
      persistManualOverridesToStorage();
      persistLabelOffsetsToStorage();
      setPlacementEditMode(false);
    });
  }
  if (resetPlacementBtn) {
    resetPlacementBtn.addEventListener("click", () => {
      clearManualOverrides(false, currentMode);
      clearLabelOffsets(false, currentMode);
      persistManualOverridesToStorage();
      persistLabelOffsetsToStorage();
      computeLayouts();
      applyMode(currentMode, { animate: false });
      setPlacementEditMode(false);
    });
  }
  setPlacementEditMode(false);
  window.addEventListener("resize", debounce(reprojectMap, 140));
}

function applyMode(mode, options = {}) {
  const { animate = false } = options;
  currentMode = mode;
  hideTooltip();
  setScenarioSelection(mode);
  updatePlacementStatus();

  const transforms = layoutByMode[mode] || new Map();
  const target = animate
    ? statePaths.interrupt().transition().duration(SCENARIO_TRANSITION_MS).ease(d3.easeCubicInOut)
    : statePaths.interrupt();

  target
    .attr("transform", (d) => transformToString(transforms.get(d.stateName)))
    .attr("fill", (d) => getFillForMode(mode, d.stateName));

  updateLabels({ animate });
  updateClusterCaptions({ animate });
}

function setScenarioSelection(mode) {
  beforeBtn.classList.toggle("is-selected", mode === "before");
  afterBtn.classList.toggle("is-selected", mode === "after");
}

function setPlacementEditMode(isEditing) {
  isPlacementEditMode = Boolean(isEditing);

  if (statePaths) {
    statePaths.classed("is-editing", isPlacementEditMode);
  }
  if (labelsLayer) {
    labelsLayer.classed("is-editing", isPlacementEditMode);
  }

  if (editPlacementBtn) {
    editPlacementBtn.classList.toggle("is-selected", isPlacementEditMode);
  }
  if (savePlacementBtn) {
    savePlacementBtn.disabled = !isPlacementEditMode;
  }
  updatePlacementStatus();
}

function updatePlacementStatus() {
  if (!placementStatus) return;
  const modeLabel = currentMode === "before" ? "Before Delimitation" : "After Delimitation";
  placementStatus.textContent = isPlacementEditMode
    ? `${modeLabel} placement editable. Drag states/labels, then click Save Placement.`
    : `${modeLabel} placement locked`;
}

function updateLabels(options = {}) {
  if (!labelTexts) return;

  const { animate = false } = options;
  const netChangeOpacity = currentMode === "after" ? 1 : 0;
  const target = animate
    ? labelTexts.interrupt().transition().duration(SCENARIO_TRANSITION_MS).ease(d3.easeCubicInOut)
    : labelTexts.interrupt();

  target.attr("transform", (d) => labelPositionToTransform(getLabelPosition(d.stateName, currentMode)));

  const changeTarget = animate
    ? labelTexts
        .selectAll(".state-label-change")
        .interrupt()
        .transition()
        .duration(SCENARIO_TRANSITION_MS)
        .ease(d3.easeCubicInOut)
    : labelTexts.selectAll(".state-label-change").interrupt();
  changeTarget.attr("opacity", netChangeOpacity);
}

function renderClusterCaptions() {
  captionLayer = svg.append("g").attr("class", "cluster-captions");

  const captionData = [
    { key: "loss", text: CLUSTER_CAPTION_TEXT.loss },
    { key: "gain", text: CLUSTER_CAPTION_TEXT.gain },
  ];

  captionTexts = captionLayer
    .selectAll("text")
    .data(captionData)
    .enter()
    .append("text")
    .attr("class", "cluster-caption")
    .attr("transform", (d) => captionPositionToTransform(getCaptionPosition(d.key)))
    .text((d) => d.text);
}

function updateClusterCaptions(options = {}) {
  if (!captionTexts) return;

  const { animate = false } = options;
  const target = animate
    ? captionTexts.interrupt().transition().duration(SCENARIO_TRANSITION_MS).ease(d3.easeCubicInOut)
    : captionTexts.interrupt();

  target.attr("transform", (d) => captionPositionToTransform(getCaptionPosition(d.key)));
}

function applyControlsOffset() {
  if (!controlsPanel) return;
  controlsPanel.style.transform = `translate(${toFinite(controlsOffset.dx)}px, ${toFinite(controlsOffset.dy)}px)`;
}

function getCaptionBasePosition(side) {
  const fallbackX = side === "loss" ? mapViewport.width * LOSS_CLUSTER_X_RATIO : mapViewport.width * GAIN_CLUSTER_X_RATIO;
  const fallbackY = mapViewport.height * 0.2;

  if (!clusterAnchorPlan) {
    return { x: fallbackX, y: fallbackY };
  }

  const cluster = side === "loss" ? clusterAnchorPlan.left : clusterAnchorPlan.right;
  if (!cluster) {
    return { x: fallbackX, y: fallbackY };
  }

  const y = clamp(
    cluster.cy - cluster.containerRadius - CLUSTER_CAPTION_MARGIN,
    CLUSTER_EDGE_MARGIN + 16,
    mapViewport.height - CLUSTER_EDGE_MARGIN - 16
  );

  return { x: cluster.cx, y };
}

function getCaptionPosition(side) {
  const base = getCaptionBasePosition(side);
  const offset = captionOffsetBySide[side] || { dx: 0, dy: 0 };
  return {
    x: base.x + toFinite(offset.dx),
    y: base.y + toFinite(offset.dy),
  };
}

function getLabelAnchor(stateName, mode = currentMode) {
  const geometry = geometryByState.get(stateName);
  if (!geometry) {
    return { x: 0, y: 0 };
  }

  const transforms = layoutByMode[mode] || layoutByMode.before;
  const record = transforms.get(stateName);
  const dx = record ? toFinite(record.dx) : 0;
  const dy = record ? toFinite(record.dy) : 0;

  return {
    x: geometry.cx + dx,
    y: geometry.cy + dy,
  };
}

function getLabelPosition(stateName, mode = currentMode) {
  const anchor = getLabelAnchor(stateName, mode);
  const modeOffsets = labelOffsetByMode[mode] || labelOffsetByMode.before;
  const offset = modeOffsets.get(stateName) || { dx: 0, dy: 0 };

  return {
    x: anchor.x + toFinite(offset.dx),
    y: anchor.y + toFinite(offset.dy),
  };
}

function onStateDragStart() {
  if (!isPlacementEditMode) return;
  hideTooltip();
  d3.select(this).classed("dragging", true);
}

function onStateDrag(event, d) {
  if (!isPlacementEditMode) return;

  const dx = toFinite(event.dx);
  const dy = toFinite(event.dy);
  if (!dx && !dy) return;

  const mode = currentMode;
  const layout = layoutByMode[mode];
  if (!layout || !layout.has(d.stateName)) return;

  const record = layout.get(d.stateName);
  record.dx = toFinite(record.dx) + dx;
  record.dy = toFinite(record.dy) + dy;
  layout.set(d.stateName, record);
  manualOverrideByMode[mode].set(d.stateName, {
    dx: record.dx,
    dy: record.dy,
  });

  d3.select(this).attr("transform", () =>
    transformToString((layoutByMode[currentMode] || new Map()).get(d.stateName))
  );
  updateLabels({ animate: false });
}

function onStateDragEnd() {
  if (!isPlacementEditMode) return;
  d3.select(this).classed("dragging", false);
}

function onLabelDragStart() {
  if (!isPlacementEditMode) return;
  hideTooltip();
  d3.select(this).classed("dragging", true);
}

function onLabelDrag(event, d) {
  if (!isPlacementEditMode) return;

  const anchor = getLabelAnchor(d.stateName, currentMode);
  const offset = {
    dx: event.x - anchor.x,
    dy: event.y - anchor.y,
  };
  const modeOffsets = labelOffsetByMode[currentMode] || labelOffsetByMode.before;
  modeOffsets.set(d.stateName, offset);

  d3.select(this).attr("transform", labelPositionToTransform({ x: event.x, y: event.y }));
}

function onLabelDragEnd() {
  if (!isPlacementEditMode) return;
  d3.select(this).classed("dragging", false);
}

function transformToString(record) {
  if (!record) return "";

  const { dx, dy, cx, cy, scale } = record;
  return `translate(${dx},${dy}) translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})`;
}

function getFillForMode(mode, stateName) {
  if (mode !== "after") return beforeFillColor;

  const netChange = netChangeByState.get(stateName);
  return Number.isFinite(netChange) ? fillScale(netChange) : fallbackColor;
}

function applyManualOverridesToLayouts() {
  for (const mode of MODES) {
    const layout = layoutByMode[mode];
    for (const [stateName, override] of manualOverrideByMode[mode].entries()) {
      if (!layout.has(stateName)) continue;
      const record = layout.get(stateName);
      record.dx = toFinite(override.dx);
      record.dy = toFinite(override.dy);
      layout.set(stateName, record);
    }
  }
}

function loadManualOverridesFromStorage() {
  clearManualOverrides(false);

  let parsed;
  try {
    const raw = localStorage.getItem(MANUAL_LAYOUT_STORAGE_KEY);
    if (!raw) return;
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn("Could not parse saved manual layout.", error);
    return;
  }

  for (const mode of MODES) {
    const modeEntries = parsed && typeof parsed === "object" ? parsed[mode] : null;
    if (!modeEntries || typeof modeEntries !== "object") continue;

    for (const [stateName, override] of Object.entries(modeEntries)) {
      if (!override || typeof override !== "object") continue;
      manualOverrideByMode[mode].set(stateName, {
        dx: toFinite(override.dx),
        dy: toFinite(override.dy),
      });
    }
  }
}

function persistManualOverridesToStorage() {
  const payload = { before: {}, after: {} };

  for (const mode of MODES) {
    for (const [stateName, override] of manualOverrideByMode[mode].entries()) {
      payload[mode][stateName] = {
        dx: toFinite(override.dx),
        dy: toFinite(override.dy),
      };
    }
  }

  try {
    localStorage.setItem(MANUAL_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Could not save manual layout.", error);
  }
}

function clearManualOverrides(removeStorage = true, mode = null) {
  if (mode && MODES.includes(mode)) {
    manualOverrideByMode[mode].clear();
  } else {
    for (const modeName of MODES) {
      manualOverrideByMode[modeName].clear();
    }
  }

  if (removeStorage) {
    try {
      localStorage.removeItem(MANUAL_LAYOUT_STORAGE_KEY);
    } catch (error) {
      console.warn("Could not clear saved manual layout.", error);
    }
  }
}

function loadLabelOffsetsFromStorage() {
  clearLabelOffsets(false);

  let parsed;
  try {
    const raw = localStorage.getItem(LABEL_LAYOUT_STORAGE_KEY);
    if (!raw) return;
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn("Could not parse saved label layout.", error);
    return;
  }

  if (!parsed || typeof parsed !== "object") return;

  const hasModeShape =
    (parsed.before && typeof parsed.before === "object") ||
    (parsed.after && typeof parsed.after === "object");

  if (hasModeShape) {
    for (const mode of MODES) {
      const modeEntries = parsed[mode];
      if (!modeEntries || typeof modeEntries !== "object") continue;
      for (const [stateName, value] of Object.entries(modeEntries)) {
        if (!value || typeof value !== "object") continue;
        labelOffsetByMode[mode].set(stateName, {
          dx: toFinite(value.dx),
          dy: toFinite(value.dy),
        });
      }
    }
    return;
  }

  // Legacy format fallback: one shared map gets copied into both modes.
  for (const [stateName, value] of Object.entries(parsed)) {
    if (!value || typeof value !== "object") continue;
    const normalized = {
      dx: toFinite(value.dx),
      dy: toFinite(value.dy),
    };
    labelOffsetByMode.before.set(stateName, normalized);
    labelOffsetByMode.after.set(stateName, normalized);
  }
}

function persistLabelOffsetsToStorage() {
  const payload = { before: {}, after: {} };

  for (const mode of MODES) {
    for (const [stateName, offset] of labelOffsetByMode[mode].entries()) {
      payload[mode][stateName] = {
        dx: toFinite(offset.dx),
        dy: toFinite(offset.dy),
      };
    }
  }

  try {
    localStorage.setItem(LABEL_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Could not save label layout.", error);
  }
}

function clearLabelOffsets(removeStorage = true, mode = null) {
  if (mode && MODES.includes(mode)) {
    labelOffsetByMode[mode].clear();
  } else {
    for (const modeName of MODES) {
      labelOffsetByMode[modeName].clear();
    }
  }

  if (removeStorage) {
    try {
      localStorage.removeItem(LABEL_LAYOUT_STORAGE_KEY);
    } catch (error) {
      console.warn("Could not clear saved label layout.", error);
    }
  }
}

function reprojectMap() {
  if (!visibleStateFeatures.length || !statePaths) return;

  fitProjection();
  captureGeometry();
  computeLayouts();

  statePaths.attr("d", path);
  applyMode(currentMode, { animate: false });
}

function onStateEnter(event, d) {
  if (isPlacementEditMode) return;
  showTooltip(event, d.stateName);
}

function onStateMove(event, d) {
  if (isPlacementEditMode) return;
  showTooltip(event, d.stateName);
}

function showTooltip(event, stateName) {
  const beforeSeats = scenarioByState.before.get(stateName);
  const afterSeats = scenarioByState.after.get(stateName);
  const currentSeats = currentMode === "after" ? afterSeats : beforeSeats;
  const netChange = netChangeByState.get(stateName);
  const displayStateName = getDisplayStateName(stateName);

  const seatsLabel = Number.isFinite(currentSeats) ? formatNumber(currentSeats) : "N/A";
  const netLabel = Number.isFinite(netChange) ? formatSigned(netChange) : "N/A";

  tooltip.innerHTML = `<strong>${displayStateName}</strong><br />Seats: ${seatsLabel}<br />Net change: ${netLabel}`;
  tooltip.style.opacity = "1";

  const mapRect = mapWrap.getBoundingClientRect();
  let x = mapRect.width / 2;
  let y = mapRect.height / 2;

  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    x = event.clientX - mapRect.left;
    y = event.clientY - mapRect.top;
  } else if (event.target && typeof event.target.getBBox === "function") {
    const box = event.target.getBBox();
    x = box.x + box.width / 2;
    y = box.y + box.height / 2;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip() {
  tooltip.style.opacity = "0";
}

function renderLoadError() {
  const width = 640;
  const height = 120;

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", "Arial, sans-serif")
    .attr("font-size", 16)
    .attr("fill", "#3f5f9c")
    .text("Could not load map data. Check internet access and refresh.");
}

function parseCustomScenario(rawScenario) {
  const parsed = new Map();

  for (const [stateName, rawValue] of Object.entries(rawScenario)) {
    const parsedValue = parseSeatValue(rawValue);
    if (Number.isFinite(parsedValue)) {
      const canonical = canonicalizeStateName(stateName);
      const simplified = simplifyStateName(canonical);
      parsed.set(canonical, parsedValue);
      parsed.set(simplified, parsedValue);
    }
  }

  return parsed;
}

function getScenarioValueForState(stateName, parsedScenario) {
  const canonicalState = canonicalizeStateName(stateName);
  const simplifiedState = simplifyStateName(canonicalState);

  if (parsedScenario.has(canonicalState)) {
    return parsedScenario.get(canonicalState);
  }
  if (parsedScenario.has(simplifiedState)) {
    return parsedScenario.get(simplifiedState);
  }

  const alias = STATE_NAME_ALIASES[canonicalState];
  if (alias && parsedScenario.has(alias)) {
    return parsedScenario.get(alias);
  }
  const aliasFromSimplified = STATE_NAME_ALIASES[simplifiedState];
  if (aliasFromSimplified && parsedScenario.has(aliasFromSimplified)) {
    return parsedScenario.get(aliasFromSimplified);
  }

  for (const [candidateKey, candidateValue] of parsedScenario.entries()) {
    const simplifiedCandidate = simplifyStateName(candidateKey);
    if (
      simplifiedCandidate &&
      simplifiedState &&
      (simplifiedCandidate === simplifiedState ||
        simplifiedCandidate.includes(simplifiedState) ||
        simplifiedState.includes(simplifiedCandidate))
    ) {
      return candidateValue;
    }
  }

  return null;
}

function getScaleRatio(stateName) {
  const ratio = sizeRatioByState.get(stateName);
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  return ratio;
}

function getDisplayStateName(stateName) {
  const canonical = canonicalizeStateName(stateName);
  return STATE_DISPLAY_NAMES[canonical] || stateName;
}

function getNetChangeLabel(stateName) {
  const netChange = netChangeByState.get(stateName);
  return Number.isFinite(netChange) ? formatSigned(netChange) : "N/A";
}

function labelPositionToTransform(position) {
  const x = position && Number.isFinite(position.x) ? position.x : 0;
  const y = position && Number.isFinite(position.y) ? position.y : 0;
  return `translate(${x},${y})`;
}

function captionPositionToTransform(position) {
  const x = position && Number.isFinite(position.x) ? position.x : 0;
  const y = position && Number.isFinite(position.y) ? position.y : 0;
  return `translate(${x},${y})`;
}

function canonicalizeStateName(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function simplifyStateName(name) {
  return canonicalizeStateName(name)
    .replace(/\b(state|union territory|territory|ut|nct)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSeatValue(rawValue) {
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric : null;
}

function toFinite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return value;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return value;
  if (min > max) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return "N/A";
  if (value === 0) return "0";

  const absolute = formatNumber(Math.abs(value));
  return value > 0 ? `+${absolute}` : `-${absolute}`;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
