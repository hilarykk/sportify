// --- PLAYLIST SETUP ---
const playlists = [
  { file: "playlist 1.csv", label: "Low Intensity Workout" },
  { file: "playlist 2.csv", label: "Medium Intensity Workout" },
  { file: "playlist 3.csv", label: "High Intensity Workout" },
];

let currentPlaylistIndex = 0;
let currentData = [];

const chartDiv = d3.select("#areaChart");

// Tooltip (same as before)...
let tooltip = d3.select("#tooltip");
if (tooltip.empty()) {
  tooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "rgba(0,0,0,0.8)")
    .style("color", "#fff")
    .style("padding", "6px 8px")
    .style("border-radius", "4px")
    .style("font-size", "11px")
    .style("line-height", "1.3")
    .style("opacity", 0);
}

// --- CONSTANT SCALES / SVG SETUP ---
const MAX_TIME_MIN = 45;
const MIN_BPM = 80;
const MAX_BPM = 190;

const width = chartDiv.node().clientWidth || 900;
const height = chartDiv.node().clientHeight || 500;
const margin = { top: 40, right: 40, bottom: 50, left: 60 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// --- SPLIT: line chart area + bar chart band ---
const barBandHeight = 50;   // height of the song bar chart
const bandGap = 10;         // gap between line chart and bars
const lineChartHeight = innerHeight - barBandHeight - bandGap;

const svg = chartDiv
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("font-family", "Inter, sans-serif");

const g = svg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Playlist label
const playlistLabelText = g.append("text")
  .attr("x", 0)
  .attr("y", -20)
  .attr("fill", "#000000ff")
  .attr("font-size", "30px")
  .attr("font-weight", "600")
  .attr("font-family", "'Playfair Display, serif")
  .attr("font-style", "italic");

// Scales
const x = d3.scaleLinear()
  .domain([0, MAX_TIME_MIN])
  .range([0, innerWidth]);

// y only uses the lineChartHeight (top area)
const y = d3.scaleLinear()
  .domain([MIN_BPM, MAX_BPM])
  .range([lineChartHeight, 0]);

const baselineY = y(MIN_BPM);
const bisectMinute = d3.bisector(d => d.minute).left;

// Axes
g.append("g")
  .attr("transform", `translate(0,${innerHeight})`)
  .call(d3.axisBottom(x));

g.append("text")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 40)
  .attr("fill", "#000000ff")
  .attr("font-size", "15px")
  .attr("font-weight", "600")
  .attr("text-anchor", "middle")
  .text("Start - End of Workout 🏃🏻‍♀️💪🏼 (minutes)");

g.append("g")
  .attr("transform", `translate(0,0)`)
  .call(d3.axisLeft(y));

g.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -lineChartHeight / 2)
  .attr("y", -40)
  .attr("fill", "#333")
  .attr("font-size", "15px")
  .attr("font-weight", "600")
  .attr("text-anchor", "middle")
  .text("BPM ❤️");

// Generators
const line = d3.line()
  .x(d => x(d.minute))
  .y(d => y(d.bpm))
  .curve(d3.curveMonotoneX);

const area = d3.area()
  .x(d => x(d.minute))
  .y0(baselineY)
  .y1(d => y(d.bpm))
  .curve(d3.curveMonotoneX);

// LIGHT BLUE PALETTE
const mainColor = "#a0c9cb";

// Paths + dots created ONCE
const areaPath = g.append("path")
  .attr("fill", mainColor)
  .attr("opacity", 0.4);

const linePath = g.append("path")
  .attr("fill", "none")
  .attr("stroke", mainColor)
  .attr("stroke-width", 2.5);

let dots = g.append("g").selectAll("circle");

// --- BAR CHART GROUP (under the line) ---
const barGroup = g.append("g").attr("class", "song-bars");
let bars = barGroup.selectAll(".song-bar");
let barLabels = barGroup.selectAll(".song-bar-label");

// --- HELPERS ---
function highlightDot(d) {
  dots
    .attr("r", 4)
    .attr("fill", mainColor);

  const index = currentData.indexOf(d);
  if (index >= 0) {
    d3.select(dots.nodes()[index])
      .attr("r", 7)
      .attr("fill", mainColor);
  }

  // also highlight matching bar
  bars.attr("fill", mainColor);
  bars.filter(b => b === d).attr("fill", mainColor);
}

function getNearestData(xVal) {
  let i = bisectMinute(currentData, xVal);
  if (i <= 0) return currentData[0];
  if (i >= currentData.length) return currentData[currentData.length - 1];

  const d0 = currentData[i - 1];
  const d1 = currentData[i];
  return (xVal - d0.minute > d1.minute - xVal) ? d1 : d0;
}

function selectSong(d, playlistLabel) {
  const mins = d.minute.toFixed(2);
  const durMin = Math.floor(d.dur / 60);
  const durSec = Math.round(d.dur % 60).toString().padStart(2, "0");

  d3.select("#center-info")
    .style("opacity", 1)
    .style("display", "block")
    .html(`
      <div style="font-weight:700; font-size:14px; margin-bottom:2px;">${d.title}</div>
      <div style="font-size:12px; margin-bottom:4px;">${d.artist}</div>
      <div style="font-size:11px; margin-bottom:4px;">
        Genre: ${d.genre || "—"}
      </div>
      <div style="font-size:11px;">
        BPM: ${d.bpm} · Energy: ${d.nrgy} · Valence: ${d.val}<br/>
        Start at: ${mins} min · Duration: ${durMin}:${durSec}
      </div>
      <div style="font-size:10px; margin-top:4px; opacity:0.7;">
        ${playlistLabel}
      </div>
    `);
}

// Interaction overlay ONLY over the line chart area
const overlay = g.append("rect")
  .attr("width", innerWidth)
  .attr("height", lineChartHeight) // stop at bottom of line chart
  .attr("fill", "none")
  .attr("pointer-events", "all")
  .on("mousemove", event => {
    if (!currentData.length) return;
    const [mx] = d3.pointer(event);
    const xVal = x.invert(mx);
    const d = getNearestData(xVal);

    highlightDot(d);

    const mins = d.minute.toFixed(2);
    const durMin = Math.floor(d.dur / 60);
    const durSec = Math.round(d.dur % 60).toString().padStart(2, "0");

    const playlistLabel = playlists[currentPlaylistIndex].label;

    tooltip
      .style("opacity", 1)
      .html(`
        <div style="font-weight:600; margin-bottom:2px;">${d.title}</div>
        <div style="opacity:0.8; margin-bottom:2px;">${d.artist}</div>
        <div>BPM: ${d.bpm} · Energy: ${d.nrgy} · Valence: ${d.val}</div>
        <div>t: ${mins} min · dur: ${durMin}:${durSec}</div>
        <div style="margin-top:2px; font-size:10px; opacity:0.7;">${playlistLabel}</div>
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", () => {
    tooltip.style("opacity", 0);
    dots
      .attr("r", 4)
      .attr("fill", mainColor);
    bars.attr("fill", mainColor);
  })
  .on("click", event => {
    if (!currentData.length) return;
    const [mx] = d3.pointer(event);
    const xVal = x.invert(mx);
    const d = getNearestData(xVal);
    selectSong(d, playlists[currentPlaylistIndex].label);
  });

// --- UPDATE FUNCTION WITH SMOOTH TRANSITION ---
function renderChart(csvFile, playlistLabel) {
  d3.csv(csvFile).then(rawData => {
    let cumulativeSeconds = 0;
    const data = rawData
      .filter(d => d.title && !isNaN(+d.bpm))
      .map(d => {
        const bpm  = +d.bpm;
        const dur  = +d.dur;
        const nrgy = +d.nrgy;
        const val  = +d.val;
        const minute = cumulativeSeconds / 60;
        cumulativeSeconds += dur;

        return { ...d, bpm, dur, nrgy, val, minute };
      });

    currentData = data;

    playlistLabelText.text(playlistLabel);

    // Smooth morph of line + area
    linePath
      .datum(currentData)
      .transition()
      .duration(600)
      .attr("d", line);

    areaPath
      .datum(currentData)
      .transition()
      .duration(600)
      .attr("d", area);

    // Smooth dot move
    dots = dots
      .data(currentData, d => d.title) // key by title if unique
      .join(
        enter => enter.append("circle")
          .attr("r", 0)
          .attr("cx", d => x(d.minute))
          .attr("cy", d => y(d.bpm))
          .attr("fill", mainColor)
          .transition()
          .duration(600)
          .attr("r", 4),
        update => update
          .transition()
          .duration(600)
          .attr("cx", d => x(d.minute))
          .attr("cy", d => y(d.bpm)),
        exit => exit
          .transition()
          .duration(300)
          .attr("r", 0)
          .remove()
      );

    // --- SONG BAR CHART UNDER THE LINE ---
    const barBandTop = lineChartHeight + bandGap;

    // Bars
    bars = bars
      .data(currentData, d => d.title)
      .join(
        enter => enter.append("rect")
          .attr("class", "song-bar")
          .attr("x", d => x(d.minute))
          .attr("y", barBandTop)
          .attr("width", d => {
            const endMinute = d.minute + d.dur / 60;
            return x(endMinute) - x(d.minute);
          })
          .attr("height", barBandHeight)
          .attr("fill", mainColor)
          .attr("stroke", mainColor)
          .attr("stroke-width", 0)
          .on("click", (event, d) => {
            highlightDot(d);
            selectSong(d, playlistLabel);
          })
          .on("mousemove", (event, d) => {
            const mins = d.minute.toFixed(2);
            const durMin = Math.floor(d.dur / 60);
            const durSec = Math.round(d.dur % 60).toString().padStart(2, "0");

            tooltip
              .style("opacity", 1)
              .html(`
                <div style="font-weight:600; margin-bottom:2px;">${d.title}</div>
                <div style="opacity:0.8; margin-bottom:2px;">${d.artist}</div>
                <div>BPM: ${d.bpm} · Energy: ${d.nrgy} · Valence: ${d.val}</div>
                <div>t: ${mins} min · dur: ${durMin}:${durSec}</div>
                <div style="margin-top:2px; font-size:10px; opacity:0.7;">${playlistLabel}</div>
              `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => {
            tooltip.style("opacity", 0);
          }),
        update => update
          .transition()
          .duration(600)
          .attr("x", d => x(d.minute))
          .attr("y", barBandTop)
          .attr("width", d => {
            const endMinute = d.minute + d.dur / 60;
            return x(endMinute) - x(d.minute);
          })
          .attr("height", barBandHeight),
        exit => exit
          .transition()
          .duration(300)
          .attr("opacity", 0)
          .remove()
      );

    // Labels on bars (song titles)
    barLabels = barLabels
      .data(currentData, d => d.title)
      .join(
        enter => enter.append("text")
          .attr("class", "song-bar-label")
          .attr("text-anchor", "middle")
          .attr("font-size", 9.5)
          .attr("font-weight", "500")
          .attr("fill", "#000000")
          .style("dominant-baseline", "middle")
          .attr("x", d => {
            const endMinute = d.minute + d.dur / 60;
            return x(d.minute) + (x(endMinute) - x(d.minute)) / 2;
          })
          .attr("y", barBandTop + barBandHeight / 2)
          .text(d => truncateTitle(d)),
        update => update
          .transition()
          .duration(600)
          .attr("x", d => {
            const endMinute = d.minute + d.dur / 60;
            return x(d.minute) + (x(endMinute) - x(d.minute)) / 2;
          })
          .attr("y", barBandTop + barBandHeight / 2)
          .text(d => truncateTitle(d)),
        exit => exit
          .transition()
          .duration(300)
          .attr("opacity", 0)
          .remove()
      );
  });
}

function truncateTitle(d) {
  const barWidth = x(d.minute + d.dur / 60) - x(d.minute);
  const maxChars = Math.floor(barWidth / 5); // ~5px per char at 9px font

  if (maxChars <= 1) return "…";
  if (d.title.length <= maxChars) return d.title;
  return d.title.slice(0, maxChars - 1) + "…";
}

// --- INITIAL RENDER ---
renderChart(playlists[currentPlaylistIndex].file, playlists[currentPlaylistIndex].label);

// If radar function exists, sync it too
if (typeof renderRadarForPlaylist === "function") {
  renderRadarForPlaylist(playlists[currentPlaylistIndex].file);
}

// --- SCROLL HANDLER (make LOW stay longer) ---
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  const vh = window.innerHeight;

  let index;

  // LOW INTENSITY gets 2 screens of time
  if (scrollY < vh * 2) {
    index = 0; // Low
  }
  // MEDIUM gets next 1 screen
  else if (scrollY < vh * 3) {
    index = 1; // Medium
  }
  // HIGH gets last screen
  else {
    index = 2; // High
  }

  if (index !== currentPlaylistIndex) {
    currentPlaylistIndex = index;
    const playlist = playlists[currentPlaylistIndex];
    renderChart(playlist.file, playlist.label);

    if (typeof renderRadarForPlaylist === "function") {
      renderRadarForPlaylist(playlist.file);
    }
  }
});
