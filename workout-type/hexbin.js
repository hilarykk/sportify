function initSportifyHexbin() {
  const container = d3.select("#chart");
  if (container.empty()) {
    console.error("[hexbin] #chart container not found. Make sure your Type section has <div id=\"chart\"></div>.");
    return;
  }

  // Clear any previous render (prevents duplicates when switching dropdowns)
  container.selectAll("*").remove();

const width = 900;
const height = 650;
const margin = { top: 60, right: 30, bottom: 80, left: 50 };

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background", "white");

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Load CSV
d3.csv("workout-type/spotify_data.csv").then(data => {
  console.log("✅ Loaded CSV:", data[0]);

  // Parse numeric fields
  data.forEach(d => {
    d.bpm = +d.bpm;
    d.energy = +d.nrgy;
  });

  // Remove invalid rows
  data = data.filter(d => d.bpm > 0 && d.energy >= 0);
  console.log("✅ Valid rows:", data.length);

  // Normalize energy if needed
  const maxEnergy = d3.max(data, d => d.energy);
  const energyNormalized = maxEnergy > 1
    ? data.map(d => ({ ...d, energy: d.energy / 100 }))
    : data;

  // ✅ Get BPM range (only once!)
  const bpmExtent = d3.extent(data, d => d.bpm);
  console.log("🎵 BPM range in data:", bpmExtent);

  // ✅ Scales
  const buffer = 10; // adds visibility beyond min/max
  const x = d3.scaleLinear()
    .domain([Math.floor(bpmExtent[0] - buffer), Math.ceil(bpmExtent[1] + buffer)])
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, 1])
    .range([innerHeight, 0]);

  // ✅ Hexbin setup
  const hexbin = d3.hexbin()
    .x(d => x(d.bpm))
    .y(d => y(d.energy))
    .radius(20)
    .extent([[0, 0], [innerWidth, innerHeight]]);

  const bins = hexbin(energyNormalized);
  bins.forEach(bin => bin.forEach(p => p.bpm = +p.bpm));

  const color = d3.scaleSequential(d3.interpolateBuPu)
    .domain([0, d3.max(bins, d => d.length) || 10]);

  const hexes = g.append("g")
    .selectAll("path")
    .data(bins)
    .join("path")
    .attr("d", hexbin.hexagon())
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("fill", d => color(d.length))
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("opacity", 0.9)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      if (!zoomedIn) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#fff")
          .attr("stroke-width", 3.7)
          .attr("opacity", 1);
      }
    })
    .on("mouseout", function(event, d) {
      if (!zoomedIn) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5)
          .attr("opacity", 0.9);
      }
    });

// === 🪄 Hex click-to-zoom interaction ===

// Store zoom state
let zoomedIn = false;
let activeHex = null;

// Create a layer for song dots (keeps them above hexes)
const songLayer = g.append("g").attr("class", "song-layer");

// On click event for hexes
hexes.on("click", function(event, d) {
  if (zoomedIn && activeHex === d) {
    // --- Click again = zoom out ---
    zoomedIn = false;
    activeHex = null;

    // Remove dots
    songLayer.selectAll("circle")
      .transition().duration(400)
      .attr("r", 0)
      .remove();

    // Reset view
    g.transition().duration(800)
      .attr("transform", `translate(${margin.left},${margin.top}) scale(1)`);

    // Bring hexes back
    hexes.transition().duration(600)
      .attr("opacity", 0.9)
      .attr("fill", bin => color(bin.length))
      .attr("stroke", "#fff");

  } else {
    // --- Zoom in on clicked hex ---
    zoomedIn = true;
    activeHex = d;

    const [cx, cy] = [d.x, d.y];
    const scale = 5; // 🔍 zoom factor

    // Fade out other hexes
    hexes.transition().duration(500)
      .attr("opacity", h => (h === d ? 1 : 0.1));

    // Zoom to clicked hex
    g.transition().duration(800)
      .attr("transform", `translate(${margin.left - cx * (scale - 1)},${margin.top - cy * (scale - 1)}) scale(${scale})`);

    // Highlight the selected hex
d3.select(this)
  .transition().duration(400)
  .attr("fill", "white")
  .attr("stroke", "none");

// REMOVE THIS BROKEN LINE
// d3.select("#song-info").remove();

// Remove any existing circles
songLayer.selectAll("circle").remove();

// Plot dots for songs in that hex
// CREATE SONG DOTS (no transition yet)
const circles = songLayer.selectAll("circle")
  .data(d)
  .join("circle")
  .attr("cx", p => x(p.bpm))
  .attr("cy", p => y(p.energy))
  .attr("r", 0)
  .attr("fill", "#4A90E2")
  .attr("opacity", 0.85)
  .style("cursor", "pointer");

// === HOVER INFO (FIXED POSITION BOX) ===
circles
  .on("mouseover", function (event, d) {
  d3.select("#song-info-fixed")
    .html(`
      <div style="font-size:14px; font-weight:600; margin-bottom:4px; color:#000;">
          ${d.title || d.name}
        </div>
      <div style="font-size:12px; color:#999; margin-bottom:2px;">
          Artist: ${d.artist}
        </div>
      <div style="font-size:12px; color:#999; margin-bottom:2px;">
          BPM: ${d.bpm}
        </div>
      <div style="font-size:12px; color:#999; margin-bottom:2px;">
          Energy: ${(d.energy * 100).toFixed(0)}%
        </div>
      <div style="font-size:12px; color:#999; margin-bottom:2px;">
          Valence: ${d.val}%
        </div>
      <div style="font-size:12px; color:#999;">
          Year: ${d.year}
        </div>
    `)
    .style("opacity", 1);

  d3.select(this)
    .attr("opacity", 1);
})

  .on("mouseout", function () {
    d3.select("#song-info-fixed")
      .style("opacity", 0);
    
    d3.select(this)
      .attr("opacity", 0.85);
  });

// === ANIMATE DOTS IN ===
circles
  .transition()
  .delay((p, i) => i * 10)
  .duration(400)
  .attr("r", 1.8);


}

});  

// ======================
// CLEAN MINIMAL X-AXIS
// ======================
const xAxis = g.append("g")
  .attr("transform", `translate(0,${innerHeight})`)
  .call(
    d3.axisBottom(x)
      .ticks(5)
      .tickSize(0)
  );

// Remove axis baseline
xAxis.select(".domain").remove();

// Style X tick labels
xAxis.selectAll("text")
  .attr("font-size", "12px")
  .attr("fill", "#6e6e6e")
  .attr("font-weight", "500")
  .attr("opacity", 0.6);


// X label (must be appended to svg, not g)
svg.append("text")
  .attr("x", margin.left + innerWidth / 2)
  .attr("y", margin.top + innerHeight + 55)
  .attr("text-anchor", "middle")
  .attr("font-size", "13px")
  .attr("fill", "#3b3b3b")
  .attr("font-weight", "600")
  .text("BPM");



// ======================
// CLEAN MINIMAL Y-AXIS
// ======================
const yAxis = g.append("g")
  .call(
    d3.axisLeft(y)
      .ticks(2)
      .tickSize(0)
      .tickFormat(d3.format(".1f"))
  );

// Remove axis line
yAxis.select(".domain").remove();

// Style Y tick labels
yAxis.selectAll("text")
  .attr("font-size", "12px")
  .attr("fill", "#6e6e6e")
  .attr("font-weight", "500")
  .attr("opacity", 0.6);


// Y label (must be appended to svg)
svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -(margin.top + innerHeight / 2))
  .attr("y", margin.left - 35)
  .attr("text-anchor", "middle")
  .attr("font-size", "13px")
  .attr("fill", "#3b3b3b")
  .attr("font-weight", "600")
  .text("Energy");


  
  // ✅ Workout BPM ranges (auto-adjusted from dataset)
  const [minBPM, maxBPM] = bpmExtent;
  const workoutTypes = {
  Yoga: [60, 105],
  Pilates: [70, 110],
  Walking: [70, 115],
  Strength: [90, 130],
  Elliptical: [90, 140],
  Stepper: [100, 140],
  Cycling: [100, 150],
  Dance: [110, 160],
  Running: [115, 175],
  HIIT: [120,175]
};
  console.log("🎯 Auto-adjusted workout BPM ranges:", workoutTypes);

  // ✅ Highlight by workout type
function highlightWorkout(type) {
  const [minB, maxB] = workoutTypes[type];
  console.log(`Highlighting ${type}: ${minB}-${maxB}`);

  hexes.transition().duration(600)
    .attr("fill", d => {
      const avgBPM = d3.mean(d, p => +p.bpm);
      return avgBPM >= minB && avgBPM <= maxB ? color(d.length) : "none";
    })
    .attr("stroke", d => {
      const avgBPM = d3.mean(d, p => +p.bpm);
      return avgBPM >= minB && avgBPM <= maxB ? "#fff" : "none";
    })
    .attr("stroke-width", 0.5)
    .attr("opacity", d => {
      const avgBPM = d3.mean(d, p => +p.bpm);
      return avgBPM >= minB && avgBPM <= maxB ? 1 : 0;
    });
}


// ================================
// BUTTON CLICK → highlight workout
// ================================
d3.selectAll(".button-wrap").on("click", function() {

  console.log("Button clicked!");

  d3.selectAll(".button-wrap").classed("selected", false);

  d3.select(this).classed("selected", true);

  const type = d3.select(this).attr("data-type");
  console.log("Selected workout:", type);

  highlightWorkout(type);

  // SHOW reset button
  d3.select("#type-reset-button")
    .style("opacity", 1)
    .style("pointer-events", "auto");

});   // closes button click handler


// ==========================================
// RESET BUTTON → return to showing all songs
// ==========================================
d3.select("#type-reset-button").on("click", function() {

  // Remove selection styling from buttons
  d3.selectAll(".button-wrap").classed("selected", false);

  // Reset all hexes to default appearance
  hexes.transition().duration(600)
    .attr("fill", d => color(d.length))
    .attr("stroke", "#fff")
    .attr("opacity", 0.9);

  // Hide reset button again
d3.select("#type-reset-button")
  .style("opacity", 0)
  .style("pointer-events", "none");
});


});   // closes d3.csv().then()

}

// If loaded dynamically after DOM is ready, run immediately.
try {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSportifyHexbin, { once: true });
  } else {
    initSportifyHexbin();
  }
} catch (e) {
  console.error("[hexbin] init failed:", e);
}
