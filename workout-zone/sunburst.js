const bpmZones = [
  { name: "Zone 1", min: 0, max: 115 },
  { name: "Zone 2", min: 116, max: 135 },
  { name: "Zone 3", min: 136, max: 150 },
  { name: "Zone 4", min: 151, max: 165 },
  { name: "Zone 5", min: 166, max: 250 }
];

function getZone(bpm) {
  const z = bpmZones.find(zone => bpm >= zone.min && bpm <= zone.max);
  return z ? z.name : "Uncategorized";
}
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

let currentFocus = null;

d3.csv("workout-zone/spotify_data.csv").then(raw => {
  console.log("CSV loaded:", raw[0]); // ✅ Check a sample row in console

  // Convert numeric columns and map correct field names
  raw.forEach(d => {
    d.bpm = +d.bpm;
    d.energy = +d.nrgy;
if (d.energy > 1) d.energy = d.energy / 100;        // ✅ change: 'nrgy' column → 'energy'
    d.val = +d.val;
if (d.val > 1) d.val = d.val / 100; // normalize if data uses 0–100
    d.year = +d.year;
    d.zone = getZone(d.bpm);
    d.genre = mapGenreFamily(d["top genre"]); // ✅ change: add new 'genre' property
  });

  // Group: Zone → Genre → Songs
  const grouped = d3.rollups(
    raw,
    v => v,
    d => d.zone,
    d => d.genre              // ✅ change: use new 'genre'
  );

  // Convert to nested JSON
  const data = {
    name: "Workout Zones",
    children: grouped.map(([zone, genres]) => ({
      name: zone,
      children: genres.map(([genre, songs]) => ({
        name: genre,
        children: songs.map(song => ({
          name: song.title,
          artist: song.artist,
          bpm: song.bpm,
          year: song.year,
          energy: song.energy,
          valence: song.val,
          value: 1
        }))
      }))
    }))
  };

  console.log("Data prepared:", data);
  drawSunburst(data);
});

function drawSunburst(data) {
  const width = 928;
  const height = width;
  const radius = width / 6;

// 🎨 Custom 3-ring color palette (Zone, Genre, Song)
const colorSets = {
  // Already updated Zone colors elsewhere
  zone: [
    "#c4d5e9", // Zone 1
    "#ed6c46", // Zone 2
    "#c8e05e", // Zone 3
    "#c5c0c9", // Zone 4
    "#1f415b"  // Zone 5
  ],

  // ⭐ NEW GENRE RING COLORS
  genre: [
    "#9db5d1", // Zone 1
    "#b44625", // Zone 2
    "#a4bd36", // Zone 3
    "#a29aa9", // Zone 4
    "#091d2c"  // Zone 5
  ],

  // ⭐ NEW SONG RING COLORS
  song: [
    "#758eac", // Zone 1
    "#8b2c10", // Zone 2
    "#8da42a", // Zone 3
    "#82768b", // Zone 4
    "#030d14"  // Zone 5
  ]
};

// assign base colors by zone name order (Zone 1–5)
const color = d3.scaleOrdinal()
  .domain([
    "Zone 1 (Recovery)",
    "Zone 2 (Endurance)",
    "Zone 3 (Tempo)",
    "Zone 4 (Threshold)",
    "Zone 5 (Sprint)"
  ])
  .range(colorSets.zone);

  // Compute the layout.
  const hierarchy = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => {
  if (a.depth === 1 && b.depth === 1) {
    const order = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"];
    return order.indexOf(a.data.name) - order.indexOf(b.data.name);
  }
  return b.value - a.value; // keep existing sorting for genres + songs
});
  const root = d3.partition()
      .size([2 * Math.PI, hierarchy.height + 1])
    (hierarchy);
  root.each(d => d.current = d);

  // Create the arc generator.
const arc = d3.arc() .startAngle(d => d.x0) 
.endAngle(d => d.x1) 
.padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005)) 
.padRadius(radius * 1.5) 
.innerRadius(d => d.y0 * radius) 
.outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));




  // Create the SVG container.
  const svg = d3.select("#zone-chart")
      .append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, width])
      .style("font", "10px sans-serif");

  // Append the arcs.
  const container = svg.append("g").attr("id", "sunburst-container");

function showSongInfo(d) {
  const info = d.data;

  /* SONG INFO FONT (SUNBURST) */
  d3.select("#zone-center-info").html(`
    <div style="font-weight:700; font-family: 'Inter', sans-serif;font-size:14px; margin-bottom:4px;">
      ${info.name}
    </div>
    <div style="font-size:12px; font-family: 'Inter', sans-serif;margin-bottom:2px; color: #999;">
      Artist: ${info.artist}
    </div>
    <div style="font-size:12px; font-family: 'Inter', sans-serif; margin-bottom:2px; color: #999;">
      BPM: ${info.bpm} 
    </div>
    <div style="font-size:12px; font-family: 'Inter', sans-serif;margin-bottom:2px; color: #999;">
      Energy: ${(info.energy * 100).toFixed(0)}%
    </div>
    <div style="font-size:12px; font-family: 'Inter', sans-serif;margin-bottom:2px; color: #999">
      Valence: ${(info.valence * 100).toFixed(0)}%
    </div>
    <div style="font-size:12px; font-family: 'Inter', sans-serif;color: #999">
      Year: ${info.year}
    </div>
  `);

  d3.select("#zone-center-info")
    .interrupt()
    .style("opacity", 0)
    .transition()
    .duration(200)
    .style("opacity", 1);
}

  
const path = container
  .append("g")
  .selectAll("path")
  .data(root.descendants().slice(1))
  .join("path")
  .attr("fill", d => {
  // Find the top-level ancestor (the zone)
  let ancestor = d;
  while (ancestor.depth > 1) ancestor = ancestor.parent;

  // Get the index of that zone (so we pick matching colors)
  const zoneIndex = data.children.findIndex(z => z.name === ancestor.data.name);

  if (zoneIndex === -1) return "#ccc"; // fallback color

  // Pick color based on depth (ring level)
  if (d.depth === 1) {
  const zoneColors = [
    "#c4d5e9", // Zone 1
    "#ed6c46", // Zone 2
    "#c8e05e", // Zone 3
    "#c5c0c9", // Zone 4
    "#1f415b"  // Zone 5
  ];
  return zoneColors[zoneIndex];
}   
// Zone level
  if (d.depth === 2) return colorSets.genre[zoneIndex];  // Genre level
  if (d.depth === 3) return colorSets.song[zoneIndex];})
      .attr("fill-opacity", d => {
  if (d.depth === 1) return 1;        // Zones full
  if (d.depth === 2) return 0.25;     // Genres faded at root
  if (d.depth === 3) return 0;        // Songs hidden
  return 1;
})
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
      .attr("d", d => arc(d.current));

  // Make them clickable if they have children.
  path.filter(d => d.children)
  .style("cursor", "pointer")
  .on("click", clicked);

/// 🔹 SONG hover + click interaction
path.filter(d => !d.children)
  .style("cursor", "pointer")

  // ⭐ HOVER → preview song info
  .on("mouseover", function(event, d) {
    showSongInfo(d);

    d3.select(this)
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);
  })

  // ⭐ MOUSE OUT → remove highlight
  .on("mouseout", function() {
    d3.select(this)
      .attr("stroke", "none");
  })

  // ⭐ CLICK → optional lock-in (keeps behavior)
  .on("click", function(event, d) {
    showSongInfo(d);
  });



const label = container.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
      .attr("dy", "0.25em")
      .attr("fill-opacity", d => {
  if (!labelVisible(d.current)) return 0;
  if (d.depth === 2) return 0.25;  // ⭐ genre text faded
  return 1;
})
      .attr("transform", d => labelTransform(d.current))
      .each(function(d) {
  const text = d3.select(this);

  if (d.depth === 3) {
    // Song names: single line only, truncate with ellipsis
    const name = d.data.name;
    const maxChars = 20; // Maximum characters for one line
    
    if (name.length > maxChars) {
      text.text(name.substring(0, maxChars) + "...");
    } else {
      text.text(name);
    }
  } else {
    text.text(d.data.name);
  }
})
.style("fill", d => {
  // Zone text (already defined earlier)
  const zoneText = [
    "#ffffff",
    "#ffffff",
    "#ffffff",
    "#ffffff",
    "#ffffff"
  ];

  // ⭐ NEW genre+song text colors by zone
  const ringText = [
    "#ffffff", // Zone 1
    "#ffffff", // Zone 2
    "#ffffff", // Zone 3
    "#ffffff", // Zone 4
    "#ffffff"  // Zone 5
  ];

  // Identify which zone this slice belongs to:
  let ancestor = d;
  while (ancestor.depth > 1) ancestor = ancestor.parent;

  const zoneIndex = ["Zone 1","Zone 2","Zone 3","Zone 4","Zone 5"]
                    .indexOf(ancestor.data.name);

  if (d.depth === 1) return zoneText[zoneIndex];   // zone labels
  if (d.depth === 2) return ringText[zoneIndex];   // genre labels
  if (d.depth === 3) return ringText[zoneIndex];   // song labels

  return "white";
})

.style("text-anchor", "middle")
.style("font-size", d => {
  if (d.depth === 1) return "12px";   // Zone labels (Zone 1–5)
  if (d.depth === 3) return "9px";    // Song labels
  return "10px";                      // Genre labels
})
.style("font-weight", d => d.depth === 1 ? "700" : "400");
;



  const parent = svg.append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

  parent
  .style("fill", "none")
  .style("pointer-events", "all")
  .attr("fill-opacity", 1);

  // Handle zoom on click.
  function clicked(event, p) {
    currentFocus = p;

// 🔥 CHANGE PAGE TEXT BASED ON CLICK DEPTH
if (p.depth === 1) {
    // User clicked a ZONE
    d3.select("#main-label").text("Pick a genre:");
    d3.select("#sub-label").text("What kind of music drives your workout?");
}
else if (p.depth === 2) {
    // User clicked a GENRE
    d3.select("#main-label").text("Pick your songs:");
    d3.select("#sub-label").text("Which track feels like your pace today?");
}
else if (p.depth === 0) {
    // User clicked BACK to root (center circle)
    d3.select("#main-label").text("Pick a zone:");
    d3.select("#sub-label").text("What kind of energy do you want to train in?");
}


    d3.select("#zone-center-info").html("");
    parent.datum(p.parent || root);

    parent
  .attr("fill", "white")
  .style("fill", "white")
  .attr("fill-opacity", 1)
  .style("pointer-events", "all");

    root.each(d => {
  let x0 = Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI;
  let x1 = Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI;
  let y0 = Math.max(0, d.y0 - p.depth);
  let y1 = Math.max(0, d.y1 - p.depth);

  d.target = { x0, x1, y0, y1 };
});


// ⭐ OPTION A — Expand Zone 1 → Pop songs to GENRE ring size
// ⭐ Expand Zone 1 > Pop AND Zone 2 > Pop songs to OUTER ring
// ⭐ Expand Zone 1 > Pop AND Zone 2 > Pop songs to BOTH rings (split proportionately)
// ⭐ Expand Zone 1 > Pop AND Zone 2 > Pop songs to use BOTH rings (full thickness)
// ⭐ Expand Zone 1 > Pop AND Zone 2 > Pop songs - use BOTH rings (double stacking)
// ⭐ Expand Zone 1 > Pop AND Zone 2 > Pop songs - use BOTH full rings (double stacking)
if (
  p.depth === 2 &&                   // user clicked a genre
  p.data.name === "Pop" &&           // genre is Pop
  p.parent && 
  (p.parent.data.name === "Zone 1" || p.parent.data.name === "Zone 2")  // Zone 1 OR Zone 2
) {
  console.log("🔥 Double-stacking Pop songs on BOTH FULL rings for", p.parent.data.name);

  // Get all song nodes for this genre
  const songs = root.descendants().filter(d => 
    d.depth === 3 && 
    d.data && 
    d.data.artist && 
    d.parent === p
  );
  
  const totalSongs = songs.length;
  const halfPoint = Math.ceil(totalSongs / 2); // Split in half
  
  songs.forEach((d, i) => {
    if (i < halfPoint) {
      // First half: INNER ring - redistribute around full circle
      const anglePerSong = (2 * Math.PI) / halfPoint;
      d.target.x0 = i * anglePerSong;
      d.target.x1 = (i + 1) * anglePerSong;
      d.target.y0 = 1;   // Inner ring start
      d.target.y1 = 2;   // Inner ring end
    } else {
      // Second half: OUTER ring - redistribute around full circle
      const outerIndex = i - halfPoint;
      const outerCount = totalSongs - halfPoint;
      const anglePerSong = (2 * Math.PI) / outerCount;
      d.target.x0 = outerIndex * anglePerSong;
      d.target.x1 = (outerIndex + 1) * anglePerSong;
      d.target.y0 = 2;   // Outer ring start
      d.target.y1 = 3;   // Outer ring end
    }
  });
}



    const t = svg.transition().duration(event.altKey ? 7500 : 750);

    path.transition(t)
  .tween("data", d => {
  const i = d3.interpolate(d.current, d.target);
  return t => {
    d.current = i(t);
  };
})


      .filter(function(d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
        .attr("fill-opacity", d => {

  // ⭐ ROOT VIEW (depth = 0)
  if (p.depth === 0) {
    if (d.depth === 1) return 1;      // Zones full
    if (d.depth === 2) return 0.25;   // Genres faded
    if (d.depth === 3) return 0;      // Songs hidden
  }

  // ⭐ ZONE VIEW (depth = 1)
  if (p.depth === 1) {
    if (d.depth === 1) return 1;      // Zone slice full
    if (d.depth === 2) return 1;      // Genres full now
    if (d.depth === 3) return 0.25;   // Songs dimmed
  }

  // ⭐ GENRE VIEW (depth = 2)
  if (p.depth === 2) {
    if (d.depth === 3) return 1;      // Songs full visible
    return 1;
  }

  return arcVisible(d.target) ? 1 : 0;
})
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none") 
        .attrTween("d", d => () => arc(d.current));

    label.filter(function(d) {
    return +this.getAttribute("fill-opacity") || labelVisible(d.target);
}).transition(t)
  .attr("fill-opacity", d => {

  // Root view
  if (p.depth === 0) {
    if (!labelVisible(d.target)) return 0;
    if (d.depth === 1) return 1;      // Zone labels full
    if (d.depth === 2) return 0.35;   // Genre labels faded
    if (d.depth === 3) return 0;      // Song labels hidden
  }

  // Zone view
  if (p.depth === 1) {
    if (!labelVisible(d.target)) return 0;
    if (d.depth === 2) return 1;      // Genres full
    if (d.depth === 3) return 0.25;   // Songs dimmed
  }

  // Genre view
  if (p.depth === 2) {
    if (!labelVisible(d.target)) return 0;
    if (d.depth === 3) return 1;      // Songs full
  }

  return labelVisible(d.target) ? 1 : 0;
})

  .attrTween("transform", d => () => labelTransform(d.current));
  }

  // Helper functions
  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }
  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }
  function labelTransform(d) {
  const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
  const y = (d.y0 + d.y1) / 2 * radius;

  // 🔥 ALWAYS rotate text upright, matching Zone 1
  return `rotate(${x - 90}) translate(${y},0) rotate(0)`;
}
}

let rotation = 0;

window.addEventListener("wheel", (event) => {
  const delta = event.deltaY;

  // Scroll down → clockwise (+)
  // Scroll up → counterclockwise (−)
  rotation += delta * 0.05;

  d3.select("#sunburst-container")
    .attr("transform", `rotate(${rotation})`);
});
