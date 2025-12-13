// --- Mood → Genre → Texture → Danceability → Workout Phase Sankey Visualization ---

d3.select("#vibe-chart").selectAll("*").remove();

setTimeout(() => {
const width = 2800;  // ← FORCE IT TO 2800px
const height = 1200;  // ← FORCE IT TO 1200px

// 🎨 Color palette
const colorScale = d3.scaleOrdinal()
  .domain([
    "Euphoric", "Energetic", "Balanced", "Chill", "Reflective", "Moody",
    "Pop", "Indie / Alternative", "R&B / Soul", "Hip-Hop / Rap", "EDM / Electronic",
    "Rock", "Latin / Global Pop", "Country / Folk", "Jazz / Blues / Funk", "Other / Soundtrack / Misc.",
    "Synthetic", "Percussive", "Hybrid", "Ambient", "Organic",
    "Groovy", "Steady", "Still",
    "High Intensity", "Peak Zone", "Tempo Riser", "Warm-Up & Recovery"
  ])
  .range([
    "#ff7675", "#fdcb6e", "#74b9ff", "#a29bfe", "#6c5ce7", "#b39ddb",
    "#ff9ff3", "#00cec9", "#fab1a0", "#ffeaa7", "#0984e3",
    "#fd79a8", "#e17055", "#55efc4", "#636e72", "#b2bec3",
    "#74b9ff", "#f6b93b", "#b2ff9e", "#81ecec", "#55efc4",
    "#f6b93b", "#60a3bc", "#1e3799",
    "#e17055", "#fdcb6e", "#ffeaa7", "#b2bec3"
  ]);

// --- Map micro-genres to broad families ---
function mapGenreFamily(genre) {
  genre = genre.toLowerCase();

  // -------------------------- POP --------------------------
  if (
    genre.includes("pop") ||
    genre.includes("boy band") ||
    genre.includes("candy pop") ||
    genre.includes("folk-pop") ||
    genre.includes("barbadian pop") ||
    genre.includes("colombian pop") ||
    genre.includes("australian pop") ||
    genre.includes("canadian pop") ||
    genre.includes("art pop") ||
    genre.includes("indie pop") ||
    genre.includes("permanent wave") ||
    genre.includes("baroque pop") ||
    genre.includes("moroccan pop")
  ) return "Pop";

  // ----------------------- INDIE / ALT -----------------------
  if (
    genre.includes("indie") ||
    genre.includes("alaska indie") ||
    genre.includes("escape room") ||
    genre.includes("neo mellow") ||
    genre.includes("alternative")
  ) return "Indie / Alternative";

  // ---------------------- R&B / SOUL -------------------------
  if (
    genre.includes("r&b") ||
    genre.includes("soul") ||
    genre.includes("british soul") ||
    genre.includes("canadian contemporary r&b") ||
    genre.includes("alternative r&b")
  ) return "R&B / Soul";

  // -------------------- HIP-HOP / RAP -----------------------
  if (
    genre.includes("hip hop") ||
    genre.includes("hip-pop") ||
    genre.includes("hip pop") ||
    genre.includes("rap") ||
    genre.includes("trap") ||
    genre.includes("brostep") ||       // dubstep variant, but close to trap-bass
    genre.includes("electronic trap") ||
    genre.includes("detroit hip hop") ||
    genre.includes("atl hip hop") ||
    genre.includes("canadian hip hop")
  ) return "Hip-Hop / Rap";

  // -------------------- EDM / ELECTRONIC --------------------
  if (
    genre.includes("dance pop") ||
    genre.includes("big room") ||
    genre.includes("complextro") ||
    genre.includes("electro") ||
    genre.includes("electropop") ||
    genre.includes("edm") ||
    genre.includes("house") ||
    genre.includes("electronic") ||
    genre.includes("australian dance") ||
    genre.includes("tropical house") ||
    genre.includes("downtempo") ||
    genre.includes("electro house") ||
    genre.includes("metropopolis")
  ) return "EDM / Electronic";

  // --------------------------- ROCK --------------------------
  if (
    genre.includes("rock") ||
    genre.includes("celtic rock") ||
    genre.includes("permanent wave") // new-wave, rock-adjacent
  ) return "Rock";

  // ------------------ LATIN / GLOBAL POP ---------------------
  if (
    genre.includes("latin") ||
    genre.includes("canadian latin")
  ) return "Latin / Global Pop";

  // ----------------------- COUNTRY / FOLK --------------------
  if (
    genre.includes("folk") ||
    genre.includes("country") ||
    genre.includes("irish singer-songwriter")
  ) return "Country / Folk";

  // ------------------- JAZZ / BLUES / FUNK -------------------
  if (
    genre.includes("jazz") ||
    genre.includes("funk")
  ) return "Jazz / Blues / Funk";

  // ------------------------ OTHER / MISC ----------------------
  return "Other / Soundtrack / Misc.";
}

// --- Mood centers ---
const moodCenters = {
  Euphoric:   { v: 0.9,  e: 80 },
  Energetic:  { v: 0.75, e: 70 },
  Balanced:   { v: 0.55, e: 65 },
  Chill:      { v: 0.45, e: 50 },
  Reflective: { v: 0.35, e: 45 },
  Moody:      { v: 0.2,  e: 60 }
};

// --- Texture classification ---
function getTexture(d) {
  const a = +d.acous / 100;
  if (a > 0.75) return "Organic";
  if (a > 0.55) return "Ambient";
  if (a > 0.35) return "Hybrid";
  if (a > 0.2) return "Percussive";
  return "Synthetic";
}

// --- Danceability tiers ---
function getDanceability(d) {
  const dn = +d.dnce;
  if (dn > 80) return "Groovy";
  if (dn > 60) return "Steady";
  return "Still";
}

// --- Workout phase tiers ---
function getWorkoutPhase(d) {
  const bpm = +d.bpm;
  if (bpm > 150) return "High Intensity";
  if (bpm > 125) return "Peak Zone";
  if (bpm > 100) return "Tempo Riser";
  return "Warm-Up & Recovery";
}

// --- Fuzzy weighting by mood similarity ---
function moodWeights(song) {
  const val = +song.val / 100;
  const e = +song.nrgy;
  const weights = {};
  for (const [m, c] of Object.entries(moodCenters)) {
    const dist = Math.sqrt((val - c.v) ** 2 + ((e - c.e) / 100) ** 2);
    const w = Math.exp(-dist * 10);
    weights[m] = w;
  }
  return weights;
}

function primaryMood(song) {
  const mw = moodWeights(song);
  return Object.entries(mw).sort((a, b) => b[1] - a[1])[0][0];
}

// --- Load dataset ---

d3.csv("workout-vibe/spotify_data.csv").then(data => {console.log("Loaded CSV:", data.length);

// Adjust these until each layer is perfectly centered
const MANUAL_CENTER = {
    0: 0,        // Mood – already centered
    1: 625,      // Genre – ADJUST THIS
    2: 1265,     // Texture – ADJUST THIS
    3: 1920,     // Danceability – ADJUST THIS
    4: 2680      // Phase – already centered?
};



const linkMap = {};
    function addLink(src, tgt, val) {
  const key = src + "→" + tgt;
  if (!linkMap[key]) linkMap[key] = { source: src, target: tgt, value: 0 };
linkMap[key].value += val * 0.2;
}
    const nodesSet = new Set();

    data.forEach(d => {
  const genre = mapGenreFamily(d["top genre"]);
  const texture = getTexture(d);
  const danceability = getDanceability(d);
  const phase = getWorkoutPhase(d);

  const mood = primaryMood(d);

  // --- add nodes ---
  nodesSet.add(mood);
  nodesSet.add(genre);
  nodesSet.add(texture);
  nodesSet.add(danceability);
  nodesSet.add(phase);

  // --- add links ---
  addLink(mood, genre, 1);
  addLink(genre, texture, 1);
  addLink(texture, danceability, 1);
  addLink(danceability, phase, 1);
});

      const links = Object.values(linkMap);
      const maxVal = d3.max(links, d => d.value);
links.forEach(l => { l.value = l.value / maxVal; });
    const nodes = Array.from(nodesSet).map(id => ({ id }));

    // --- Assign each node to a fixed Sankey column (VERY IMPORTANT) ---
nodes.forEach(n => {
  if (["Euphoric","Energetic","Balanced","Chill","Reflective","Moody"].includes(n.id)) {
    n.layer = 0;
  } else if (["Pop","Indie / Alternative","R&B / Soul","Hip-Hop / Rap","EDM / Electronic","Rock","Latin / Global Pop","Country / Folk","Jazz / Blues / Funk","Other / Soundtrack / Misc."].includes(n.id)) {
    n.layer = 1;
  } else if (["Synthetic","Percussive","Hybrid","Ambient","Organic"].includes(n.id)) {
    n.layer = 2;
  } else if (["Groovy","Steady","Still"].includes(n.id)) {
    n.layer = 3;
  } else {
    n.layer = 4; // Workout Phase
  }
});


    const sankey = d3.sankey()
      .nodeId(d => d.id)
      .nodeWidth(14)
.nodePadding(25)
      .nodeSort((a, b) => a.layer - b.layer)
      .extent([[1, 1], [width - 1, height - 6]]);

    const graph = sankey({
      nodes: nodes.map(d => ({ ...d })),
  links: links.map(d => ({ ...d, value: d.value * 20 })) 
    });

    // -----------------------------------------
// FORCE UNIFORM COLUMN POSITIONS (IMPORTANT)
// -----------------------------------------
const FIXED_GAP = 760;

graph.nodes.forEach(n => {
  const col = n.layer;
  const width = n.x1 - n.x0;
  const newX0 = col * FIXED_GAP;
  n.x0 = newX0;
  n.x1 = newX0 + width;
});

// Update link coordinates to match overridden node positions
graph.links.forEach(l => {
  l.source.x1 = l.source.x0 + (l.source.x1 - l.source.x0);
  l.target.x0 = l.target.x0;
});

// -----------------------------------------
// Compute average column center positions
// -----------------------------------------
const columnCenters = {};

graph.nodes.forEach(n => {
    const center = n.x0 + (n.x1 - n.x0) / 2;
    if (!columnCenters[n.layer]) columnCenters[n.layer] = [];
    columnCenters[n.layer].push(center);
});

Object.keys(columnCenters).forEach(layer => {
    const arr = columnCenters[layer];
    columnCenters[layer] = arr.reduce((a, b) => a + b, 0) / arr.length;
});

console.log("Column center positions:", columnCenters);


console.log("Column center positions:", columnCenters);


    // Measure distance between column 0 (emotion) and column 1 (genre)
const col0 = graph.nodes.find(n => n.layer === 0);
const col1 = graph.nodes.find(n => n.layer === 1);
const columnDistance = col1.x0 - col0.x0;   // 760px in your chart


    d3.select("#vibe-chart").selectAll("*").remove();

const LEFT_PAD = 140;   // extra white space on left
const RIGHT_PAD = 140;  // extra white space on right

const svg = d3.select("#sankey")
    .attr("width", width + LEFT_PAD + RIGHT_PAD)
    .attr("height", null)
    .style("height", "auto")
.attr("viewBox", `0 0 ${width + LEFT_PAD + RIGHT_PAD} ${height}`);


    // --- Draw links ---
    const link = svg.append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", d => colorScale(d.source.id))
.attr("stroke-width", d => d.width)

      .attr("stroke-opacity", 0.15)
        .attr("fill", "none");  // ← ADD THIS LINE
;

    // --- Draw nodes ---
    const node = svg.append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => colorScale(d.id));

    // --- Labels ---
    const label = svg.append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .attr("x", d => d.x0 < width/2 ? d.x1 + 8 : d.x0 - 8)
      .attr("y", d => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width/2 ? "start" : "end")
      .text(d => d.id);

  // --- Drill-down Path Logic ---
  // --- Drill-down Path Logic ---
let selectedPath = [];

// --- Highlight exact sequential path ---
function highlightPath(path) {
  const activeNodes = new Set(path);
  const activeLinks = new Set();

  graph.links.forEach(l => {
    for (let i = 0; i < path.length - 1; i++) {
      if (l.source.id === path[i] && l.target.id === path[i + 1]) {
        activeLinks.add(l);
      }
    }
  });

  node.transition().duration(400)
    .attr("opacity", d => activeNodes.has(d.id) ? 1 : 0.1);

  link.transition().duration(400)
    .attr("stroke-opacity", l => activeLinks.has(l) ? 0.8 : 0.05);
}

function highlightPreview(nodeId) {
    const activeNodes = new Set([nodeId]);
    const activeLinks = new Set();

    graph.links.forEach(l => {
        if (l.source.id === nodeId) {
            activeNodes.add(l.target.id);
            activeLinks.add(l);
        }
    });

    node.transition().duration(300)
        .attr("opacity", d => activeNodes.has(d.id) ? 1 : 0.1);

    link.transition().duration(300)
        .attr("stroke-opacity", l => activeLinks.has(l) ? 0.25 : 0.05);
}

// --- SUBSEQUENT CLICKS: keep path + preview next layer ---
function highlightPathAndNext(path) {
    const last = path[path.length - 1];

    // keep path nodes
    const activeNodes = new Set(path);
    const activeLinks = new Set();

    // highlight exact path connections
    graph.links.forEach(l => {
        for (let i = 0; i < path.length - 1; i++) {
            if (l.source.id === path[i] && l.target.id === path[i+1]) {
                activeLinks.add(l);
            }
        }
    });

    // preview next column
    graph.links.forEach(l => {
        if (l.source.id === last) {
            activeNodes.add(l.target.id);
            activeLinks.add(l);
        }
    });

    node.transition().duration(300)
        .attr("opacity", d => activeNodes.has(d.id) ? 1 : 0.1);

    link.transition().duration(300)
        .attr("stroke-opacity", l => activeLinks.has(l) ? 0.25 : 0.05);
}

// --- Downstream highlighting ---
function highlightAllDownstream(nodeId) {
  const activeNodes = new Set([nodeId]);
  const activeLinks = new Set();

  graph.links.forEach(l => {
    if (l.source.id === nodeId) {
      activeLinks.add(l);
      activeNodes.add(l.target.id);
    }
  });

  return { activeNodes, activeLinks };
}

// --- Upstream highlighting ---
function highlightAllUpstream(nodeId) {
  const activeNodes = new Set([nodeId]);
  const activeLinks = new Set();

  graph.links.forEach(l => {
    if (l.target.id === nodeId) {
      activeLinks.add(l);
      activeNodes.add(l.source.id);
    }
  });

  return { activeNodes, activeLinks };
}

// --- Combine BOTH upstream + downstream ---
function highlightConnected(nodeId) {
  const down = highlightAllDownstream(nodeId);
  const up = highlightAllUpstream(nodeId);

  const activeNodes = new Set([...down.activeNodes, ...up.activeNodes]);
  const activeLinks = new Set([...down.activeLinks, ...up.activeLinks]);

  node.transition().duration(400)
    .attr("opacity", d => activeNodes.has(d.id) ? 1 : 0.1);

  link.transition().duration(400)
    .attr("stroke-opacity", l => activeLinks.has(l) ? 0.8 : 0.05);
}



node.on("click", (event, d) => {
    event.stopPropagation();
    const clickedId = d.id;

    // FIRST CLICK → PREVIEW NEXT COLUMN
    if (selectedPath.length === 0) {
        selectedPath = [clickedId];
        highlightPreview(clickedId);
        centerColumn(d.layer);  // ← ADD THIS LINE
        return;
    }

    const last = selectedPath[selectedPath.length - 1];

    // check if valid downstream choice
    const isDownstream = graph.links.some(l =>
        l.source.id === last && l.target.id === clickedId
    );

    if (isDownstream) {
        // extend path
        selectedPath.push(clickedId);
        highlightPathAndNext(selectedPath);
        centerColumn(d.layer);  // ← THIS ONE ALREADY EXISTS

    } else {
        // restart preview mode
        selectedPath = [clickedId];
        highlightPreview(clickedId);
        centerColumn(d.layer);  // ← ADD THIS LINE TOO
    }
});

function centerColumn(layer) {
    // Don't scroll if it's the last column
    if (layer === 4) return;
    
    const wrapper = document.getElementById("sankey-scroll");
    const svg = document.getElementById("sankey");

    // Show current column and NEXT column (if it exists)
    const leftCol = layer;
    const rightCol = layer < 4 ? layer + 1 : layer; // layer 4 is the last column

    const leftColX = columnCenters[leftCol];
    const rightColX = columnCenters[rightCol];
    
    // Find the midpoint between current and next column
    const midpoint = (leftColX + rightColX) / 2;

    const svgRect = svg.getBoundingClientRect();
    const scale = svgRect.width / svg.viewBox.baseVal.width;
    
    const midpointScreen = midpoint * scale;

    // Center the midpoint in the 900px viewport
    const targetScroll = midpointScreen - (500 / 2);

    wrapper.scrollTo({
        left: targetScroll,
        behavior: "smooth"
    });
}













  // --- Reset on background click ---
  svg.on("click", (event) => {
    if (event.target.tagName === "svg") {
      selectedPath = [];
      node.transition().duration(400).attr("opacity", 1);
      link.transition().duration(400).attr("stroke-opacity", 0.15);
    }
  });

// Add click handlers to mood buttons (add this at the END of sankey.js, inside the d3.csv().then() block)
document.querySelectorAll('.mood-label').forEach(button => {
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', function() {
        const moodText = this.textContent.trim();
        
        // Find the corresponding node in the Sankey chart
        const moodNode = graph.nodes.find(n => n.id === moodText);
        
        if (moodNode) {
            // Simulate the exact same logic as clicking a node
            const clickedId = moodNode.id;
            
            // FIRST CLICK → PREVIEW NEXT COLUMN (same as node click handler)
            selectedPath = [clickedId];
            highlightPreview(clickedId);
            centerColumn(moodNode.layer);
        }
}); // ← CLOSE addEventListener
}); // ← CLOSE forEach


// Add click handlers to genre buttons (add this after the mood button code)
document.querySelectorAll('.genre-label').forEach(button => {
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', function() {
        const genreText = this.textContent.trim();
        
        // Find the corresponding node in the Sankey chart
        const genreNode = graph.nodes.find(n => n.id === genreText);
        
        if (genreNode) {
            // Check if we already have a mood selected
            if (selectedPath.length >= 1) {
                // Keep only the first item (mood) and replace everything after
                selectedPath = [selectedPath[0], genreText];
                highlightPathAndNext(selectedPath);
                centerColumn(genreNode.layer);
            } else {
                // If no mood selected, just preview this genre
                selectedPath = [genreText];
                highlightPreview(genreText);
                centerColumn(genreNode.layer);
            }
        }
    });
});

// Add click handlers to texture buttons
document.querySelectorAll('.texture-label').forEach(button => {
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', function() {
        const textureText = this.textContent.trim();
        
        const textureNode = graph.nodes.find(n => n.id === textureText);
        
        if (textureNode) {
            if (selectedPath.length >= 2) {
                // Keep mood and genre, replace texture
                selectedPath = [selectedPath[0], selectedPath[1], textureText];
                highlightPathAndNext(selectedPath);
                centerColumn(textureNode.layer);
            } else if (selectedPath.length === 1) {
                selectedPath.push(textureText);
                highlightPathAndNext(selectedPath);
                centerColumn(textureNode.layer);
            } else {
                selectedPath = [textureText];
                highlightPreview(textureText);
                centerColumn(textureNode.layer);
            }
        }
    });
});


// Dance button handlers - PUT IT HERE ↓
    console.log('Looking for dance buttons...');
    const danceButtons = document.querySelectorAll('.dance-label');
    console.log('Found dance buttons:', danceButtons.length);
    
    danceButtons.forEach(button => {
        button.addEventListener('click', function() {
            const danceText = this.textContent.trim();
            const danceNode = graph.nodes.find(n => n.id === danceText);
            
            if (danceNode) {
                if (selectedPath.length >= 3) {
                    selectedPath = [selectedPath[0], selectedPath[1], selectedPath[2], danceText];
                    highlightPathAndNext(selectedPath);
                    centerColumn(danceNode.layer);
                } else if (selectedPath.length >= 1) {
                    selectedPath.push(danceText);
                    highlightPathAndNext(selectedPath);
                    centerColumn(danceNode.layer);
                } else {
                    selectedPath = [danceText];
                    highlightPreview(danceText);
                    centerColumn(danceNode.layer);
                }
            }
        });
    });

// Add click handlers to phase buttons
console.log('Looking for phase buttons...');
const phaseButtons = document.querySelectorAll('.phase-label');
console.log('Found phase buttons:', phaseButtons.length);

phaseButtons.forEach(button => {
    button.addEventListener('click', function() {
        const phaseText = this.textContent.trim();
        const phaseNode = graph.nodes.find(n => n.id === phaseText);
        
        if (phaseNode) {
            if (selectedPath.length >= 4) {
                // Keep mood, genre, texture, dance, replace phase
                selectedPath = [selectedPath[0], selectedPath[1], selectedPath[2], selectedPath[3], phaseText];
                highlightPathAndNext(selectedPath);
                centerColumn(phaseNode.layer);
            } else if (selectedPath.length >= 1) {
                selectedPath.push(phaseText);
                highlightPathAndNext(selectedPath);
                centerColumn(phaseNode.layer);
            } else {
                selectedPath = [phaseText];
                highlightPreview(phaseText);
                centerColumn(phaseNode.layer);
            }
        }
    });
});

// Make filtering function globally accessible
window.filterAndShowSongs = function() {
    console.log('filterAndShowSongs called!');
    console.log('Selected path:', selectedPath);
    
    if (selectedPath.length === 0) {
        alert('Please select your preferences first!');
        return;
    }
    
    const filteredSongs = data.filter(song => {
        let matches = true;
        
        selectedPath.forEach((selection, index) => {
            if (index === 0) {
                const songMood = primaryMood(song);
                const weights = moodWeights(song);
                const maxWeight = Math.max(...Object.values(weights));
                const selectedWeight = weights[selection] || 0;
                
                if (selectedWeight < maxWeight * 0.2) {
                    matches = false;
                }
            } else if (index === 1) {
                const songGenre = mapGenreFamily(song["top genre"]);
                if (songGenre !== selection) matches = false;
            } else if (index === 2) {
                const songTexture = getTexture(song);
                if (songTexture !== selection) matches = false;
            } else if (index === 3) {
                const songDance = getDanceability(song);
                if (songDance !== selection) matches = false;
            } else if (index === 4) {
                const songPhase = getWorkoutPhase(song);
                if (songPhase !== selection) matches = false;
            }
        });
        
        return matches;
    });
    
    console.log('Filtered songs:', filteredSongs.length);
    
    const resultsList = document.getElementById('songs-list');
    resultsList.innerHTML = '';
    
    if (filteredSongs.length === 0) {
        resultsList.innerHTML = '<p style="font-size: 16px; color: #666;">No songs found matching your criteria. Try going back and adjusting your selections!</p>';
    } else {
        filteredSongs.sort((a, b) => b.nrgy - a.nrgy);
        
        filteredSongs.slice(0, 20).forEach(song => {
            const songDiv = document.createElement('div');
            songDiv.className = 'song-item';
            songDiv.innerHTML = `
                <div class="song-title">${song.title}</div>
                <div class="song-details">
                Artist: ${song.artist} |    
                BPM: ${song.bpm} | 
                    Energy: ${song.nrgy}% | 
                    Valence: ${song.val}% |
                    Year: ${song.year} 
                </div>
            `;
            resultsList.appendChild(songDiv);
        });
        
        if (filteredSongs.length > 20) {
            resultsList.innerHTML += `<p style="margin-top: 20px; color: #666; font-style: italic;">Showing 20 of ${filteredSongs.length} matching songs</p>`;
        }
    }
};

}); // ← THIS CLOSES THE .then() - make sure dance code is BEFORE this

}, 100); // delay helps rendering when tab becomes visible
