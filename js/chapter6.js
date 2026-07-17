/**
 * Chapter 6: Global Transfer Flow Map
 * 
 * This file sets up a D3 world map projection and visualizes the movement of players
 * into and out of England. Instead of drawing thousands of separate lines, the transfers
 * are aggregated by country pair to show volume and total spending.
 */

// 1. Load the world map geometry and the transfer flow dataset
// Note: Path is relative to the HTML document loading this script (index.html)
Promise.all([
    d3.json("data/world.geojson"),
    d3.csv("data/ch6_transfer_flow.csv")
]).then(([world, transfers]) => {

    console.log("Chapter 6: Initializing Transfer Flow Map");

    // 2. Select container and calculate dimensions
    const container = d3.select("#ch6");
    const width = container.node().clientWidth || 960;
    const height = container.node().clientHeight || 600;

    // 3. Create SVG element with responsive viewBox
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // 4. Set up a zoom behavior and attach it to a main "g" container.
    // This allows panning and zooming the map using mouse scroll or dragging.
    const mapGroup = svg.append("g");

    const zoom = d3.zoom()
        .scaleExtent([1, 8]) // limit zoom level from 1x to 8x
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });

    svg.call(zoom);

    // 5. Define Map Projection and Path Generator
    // We use a Mercator projection, centered around longitude 0, latitude 35 to focus on Europe/Americas
    const projection = d3.geoMercator()
        .scale(150)
        .translate([width / 2, height / 1.4]);

    const path = d3.geoPath()
        .projection(projection);

    // 6. Coordinates dictionary for country centers
    // Maps each country in the dataset to [longitude, latitude]
    const countryCoords = {
        "England": [-1.2649062, 52.5310214],
        "Spain": [-4.8379791, 39.3260685],
        "Italy": [12.56417, 41.8739875],
        "Germany": [10.4478313, 51.1638175],
        "France": [2.209667, 46.232193],
        "Netherlands": [5.634323, 52.243498],
        "Portugal": [-8.135352, 39.662165],
        "Russia": [97.745306, 64.686314],
        "Brazil": [-53.25, -14.0],
        "Qatar": [51.22953, 25.333698],
        "Togo": [1.019977, 8.780027],
        "Scotland": [-4.251806, 57.149651],
        "Argentina": [-64.967282, -34.996496],
        "Denmark": [10.333328, 55.670249],
        "United States": [-100.445882, 39.78373],
        "Switzerland": [8.231974, 46.798562],
        "South Africa": [24.991639, -28.816624],
        "Israel": [34.859476, 30.812425],
        "Ireland": [-7.97946, 52.865196],
        "Australia": [134.755, -24.776109],
        "Chile": [-71.31877, -31.761337],
        "Slovenia": [14.815333, 46.119944],
        "Türkiye": [35.231663, 39.294076],
        "Latvia": [24.753765, 56.840649],
        "Bulgaria": [25.485662, 42.607398],
        "Slovakia": [19.452865, 48.741152],
        "Belgium": [4.666715, 50.640281],
        "Ukraine": [31.271832, 49.487197],
        "Norway": [8.787665, 61.152939],
        "Croatia": [15.657521, 45.365844],
        "Greece": [21.987713, 38.995368],
        "Sweden": [14.520858, 59.674971],
        "Serbia": [20.55144, 44.153412],
        "Czech Republic": [15.338106, 49.743905],
        "Wales": [-3.73893, 52.292812],
        "Cote d'Ivoire": [-5.567946, 7.989737],
        "Mexico": [-102.00771, 23.658512],
        "Egypt": [29.267547, 26.254049],
        "China": [104.999927, 35.000074],
        "Austria": [14.12456, 47.59397],
        "Poland": [19.134422, 52.215933],
        "Trinidad and Tobago": [-61.084008, 10.746691],
        "Hungary": [19.506094, 47.181759],
        "Japan": [139.239418, 36.574844],
        "Uruguay": [-56.020153, -32.875555],
        "Colombia": [-72.908813, 4.099917],
        "Korea, South": [127.696119, 36.638392],
        "Costa Rica": [-84.07391, 10.273563],
        "Romania": [24.685923, 45.985213],
        "Northern Ireland": [-6.959155, 54.585984],
        "Cyprus": [33.145129, 34.982302],
        "United Arab Emirates": [54.5, 23.75],
        "Venezuela": [-66.110932, 8.001871],
        "Paraguay": [-58.169345, -23.316594],
        "Finland": [25.920916, 63.246778],
        "Angola": [17.569124, -11.877577],
        "Honduras": [-86.075515, 15.257243],
        "Nigeria": [7.999972, 9.600036],
        "Ecuador": [-79.366697, -1.339767],
        "Saudi Arabia": [42.352833, 25.624262]
    };

    // Helper to resolve coordinates including spelling mismatches
    function getCoords(countryName) {
        if (countryName === "USA") return countryCoords["United States"];
        if (countryName === "South Korea") return countryCoords["Korea, South"];
        if (countryName === "Ivory Coast") return countryCoords["Cote d'Ivoire"];
        if (countryName === "Republic of Serbia") return countryCoords["Serbia"];
        if (countryName === "Turkey" || countryName.includes("rkiye") || countryName.includes("rkye")) {
            return countryCoords["Türkiye"];
        }
        return countryCoords[countryName];
    }

    // Helper mapping CSV names to GeoJSON country identifiers
    function csvToGeoJsonName(name) {
        if (name === "England" || name === "Scotland" || name === "Wales" || name === "Northern Ireland") {
            return "England";
        }
        if (name === "United States") return "USA";
        if (name === "Korea, South") return "South Korea";
        if (name === "Cote d'Ivoire") return "Ivory Coast";
        if (name === "Serbia") return "Republic of Serbia";
        if (name === "Türkiye" || name.includes("rkiye") || name.includes("rkye")) return "Turkey";
        return name;
    }

    // 7. Aggregate individual transfers into country-to-country flows
    const flows = [];
    const flowMap = {};
    const countryStats = {}; // Tracks totals for each country

    transfers.forEach(d => {
        const from = d.from_country;
        const to = d.to_country;
        
        // Ignore domestic transfers within England
        if (from === "England" && to === "England") return;
        if (!from || !to) return;

        const fee = +d.fee_clean || 0;
        const key = `${from}->${to}`;

        // Initialize unique flow records
        if (!flowMap[key]) {
            flowMap[key] = {
                from: from,
                to: to,
                count: 0,
                totalFee: 0,
                players: []
            };
            flows.push(flowMap[key]);
        }

        flowMap[key].count += 1;
        flowMap[key].totalFee += fee;
        flowMap[key].players.push({
            name: d.player_name,
            fee: fee,
            season: d.season_start,
            position: d.player_position
        });

        // Accumulate country statistics
        const mappedFrom = csvToGeoJsonName(from);
        const mappedTo = csvToGeoJsonName(to);

        if (!countryStats[mappedFrom]) {
            countryStats[mappedFrom] = { name: mappedFrom, exportedCount: 0, exportedFee: 0, importedCount: 0, importedFee: 0 };
        }
        countryStats[mappedFrom].exportedCount += 1;
        countryStats[mappedFrom].exportedFee += fee;

        if (!countryStats[mappedTo]) {
            countryStats[mappedTo] = { name: mappedTo, exportedCount: 0, exportedFee: 0, importedCount: 0, importedFee: 0 };
        }
        countryStats[mappedTo].importedCount += 1;
        countryStats[mappedTo].importedFee += fee;
    });

    // Sort players in each flow by fee descending
    flows.forEach(f => {
        f.players.sort((a, b) => b.fee - a.fee);
    });

    // 8. Scales for line thickness based on total flow size
    const maxFee = d3.max(flows, f => f.totalFee);
    const strokeWidthScale = d3.scaleSqrt()
        .domain([0, maxFee])
        .range([1.2, 7]); // Line width will vary from 1.2px to 7px depending on total volume

    // Helper formatting money values
    function formatFee(val) {
        if (val >= 1000000000) return (val / 1000000000).toFixed(2) + "B";
        if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
        if (val >= 1000) return (val / 1000).toFixed(0) + "k";
        return val > 0 ? val.toString() : "0";
    }

    // 9. Tooltip Helpers
    const tooltip = d3.select("#tooltip");

    function showTooltip(event, content) {
        tooltip.style("opacity", 1)
            .html(content)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 20) + "px");
    }

    function hideTooltip() {
        tooltip.style("opacity", 0);
    }

    // 10. Draw Countries on the Map
    const countries = mapGroup.append("g")
        .attr("class", "countries-layer")
        .selectAll("path")
        .data(world.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", d => {
            const name = d.properties.name;
            if (name === "England") {
                return "country epicenter"; // Color the epicenter (UK/England) uniquely
            }
            if (countryStats[name]) {
                return "country active-partner"; // Highlights countries that trade players with England
            }
            return "country"; // Standard color for other countries
        })
        .on("mouseover", function(event, d) {
            const name = d.properties.name;
            const stats = countryStats[name];

            d3.select(this).style("fill", "#475569"); // Highlight country boundary
            
            // Build rich info popup
            let htmlContent = `<strong>${name}</strong>`;
            if (name === "England") {
                htmlContent += `<br><span style='color:#e2e8f0;'>Epicenter of English football transfers.</span>`;
            } else if (stats) {
                htmlContent += `
                    <br>Players Sent to England: <strong>${stats.exportedCount}</strong>
                    <br>Total Sent Value: <strong>£${formatFee(stats.exportedFee)}</strong>
                    <br>Players Bought from England: <strong>${stats.importedCount}</strong>
                    <br>Total Bought Value: <strong>£${formatFee(stats.importedFee)}</strong>
                `;
            } else {
                htmlContent += `<br><span style='color:#94a3b8;'>No transfer flows recorded.</span>`;
            }
            showTooltip(event, htmlContent);

            // Highlight connected flow lines, dim everything else
            d3.selectAll(".flow-line").style("opacity", 0.03);
            d3.selectAll(".flow-animation-line").style("opacity", 0);
            
            d3.selectAll(`.flow-from-${escapeClass(name)}`).style("opacity", 0.95).style("stroke-width", d => strokeWidthScale(d.totalFee) * 1.5);
            d3.selectAll(`.flow-to-${escapeClass(name)}`).style("opacity", 0.95).style("stroke-width", d => strokeWidthScale(d.totalFee) * 1.5);
            
            d3.selectAll(`.flow-anim-from-${escapeClass(name)}`).style("opacity", 0.85);
            d3.selectAll(`.flow-anim-to-${escapeClass(name)}`).style("opacity", 0.85);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("fill", null); // Reset country fill
            hideTooltip();
            
            // Reset flow line styling
            d3.selectAll(".flow-line")
                .style("opacity", 0.3)
                .style("stroke-width", d => strokeWidthScale(d.totalFee));
            d3.selectAll(".flow-animation-line")
                .style("opacity", 0.7);
        })
        .on("click", function(event, d) {
            // Zoom in on clicked country
            event.stopPropagation();
            const bounds = path.bounds(d);
            const dx = bounds[1][0] - bounds[0][0];
            const dy = bounds[1][1] - bounds[0][1];
            const x = (bounds[0][0] + bounds[1][0]) / 2;
            const y = (bounds[0][1] + bounds[1][1]) / 2;
            const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
            const translate = [width / 2 - scale * x, height / 2 - scale * y];

            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        });

    // Helper to sanitize name strings for CSS class selectors
    function escapeClass(val) {
        return val.replace(/[^a-zA-Z0-9]/g, "-");
    }

    // Reset zoom when clicking on empty map regions
    svg.on("click", () => {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    });

    // 11. Draw Transfer Flow Curves
    const flowsGroup = mapGroup.append("g").attr("class", "flows-layer");

    flows.forEach(flow => {
        const sourceCoord = getCoords(flow.from);
        const targetCoord = getCoords(flow.to);

        if (!sourceCoord || !targetCoord) return; // Skip missing coordinate links

        const source = projection(sourceCoord);
        const target = projection(targetCoord);

        // Calculate a perpendicular curved midpoint to bend the transfer paths beautifully
        const midX = (source[0] + target[0]) / 2;
        const midY = (source[1] + target[1]) / 2;
        const dx = target[0] - source[0];
        const dy = target[1] - source[1];
        
        // Bend curves offset perpendicular to the direction vector
        const angle = Math.atan2(dy, dx);
        const bendOffset = 40; // Bend amount in pixels
        const bendX = midX - bendOffset * Math.sin(angle);
        const bendY = midY + bendOffset * Math.cos(angle);

        const pathData = `M ${source[0]},${source[1]} Q ${bendX},${bendY} ${target[0]},${target[1]}`;

        // Direction classification
        const isIncoming = flow.to === "England";
        const flowClass = isIncoming ? "incoming" : "outgoing";

        // Escaped names for class highlights
        const fromEsc = escapeClass(csvToGeoJsonName(flow.from));
        const toEsc = escapeClass(csvToGeoJsonName(flow.to));

        // Draw static background flow line (width scaled by volume)
        flowsGroup.append("path")
            .datum(flow)
            .attr("d", pathData)
            .attr("class", `flow-line ${flowClass} flow-from-${fromEsc} flow-to-${toEsc}`)
            .style("stroke-width", strokeWidthScale(flow.totalFee))
            .style("opacity", 0.3)
            .on("mouseover", function(event, d) {
                d3.select(this).style("opacity", 0.95).style("stroke-width", strokeWidthScale(d.totalFee) * 1.5);
                
                // Highlight source and target country elements
                d3.selectAll(".country").style("opacity", 0.4);
                d3.selectAll(".country").filter(c => c.properties.name === csvToGeoJsonName(d.from) || c.properties.name === csvToGeoJsonName(d.to))
                    .style("opacity", 1)
                    .style("fill", "#475569");

                // Dim other lines
                d3.selectAll(".flow-line").filter(l => l !== d).style("opacity", 0.03);
                d3.selectAll(".flow-animation-line").filter(l => l.datum() !== d).style("opacity", 0);

                // Build detailed HTML tooltip showing players transferred
                const topPlayers = d.players.slice(0, 4).map(p => `
                    <div style="margin-top:4px; font-size:11px; display:flex; justify-content:space-between; gap:10px;">
                        <span style="color:#f8fafc;">${p.name} (${p.season})</span>
                        <span style="color:#2ca6a4; font-weight:600;">£${formatFee(p.fee)}</span>
                    </div>
                `).join("");

                const tooltipHtml = `
                    <div style="font-weight:600; font-size:13px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:4px; margin-bottom:6px;">
                        ${d.from} ➔ ${d.to}
                    </div>
                    Total Volume: <strong style="color:#fff;">${d.count} players</strong><br>
                    Total Fees: <strong style="color:#fff;">£${formatFee(d.totalFee)}</strong>
                    <div style="margin-top:10px;">
                        <div style="font-size:11px; text-transform:uppercase; color:#94a3b8; font-weight:600; letter-spacing:0.5px;">Top Transfers:</div>
                        ${topPlayers}
                    </div>
                `;
                showTooltip(event, tooltipHtml);
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this).style("stroke-width", strokeWidthScale(d.totalFee)).style("opacity", 0.3);
                d3.selectAll(".country").style("opacity", null).style("fill", null);
                d3.selectAll(".flow-line").style("opacity", 0.3).style("stroke-width", d => strokeWidthScale(d.totalFee));
                d3.selectAll(".flow-animation-line").style("opacity", 0.7);
                hideTooltip();
            });

        // Draw animated overlay dashed line for particle movement flow direction
        flowsGroup.append("path")
            .datum(flow)
            .attr("d", pathData)
            .attr("class", `flow-animation-line ${flowClass} flow-anim-from-${fromEsc} flow-anim-to-${toEsc}`)
            .style("stroke-width", 1.2)
            .style("opacity", 0.7);
    });

    // 12. Add HUD zoom control buttons
    const controls = container.append("div")
        .attr("class", "zoom-controls");

    controls.append("button")
        .attr("class", "zoom-btn")
        .html("+")
        .attr("title", "Zoom In")
        .on("click", (event) => {
            event.stopPropagation();
            svg.transition().duration(300).call(zoom.scaleBy, 1.5);
        });

    controls.append("button")
        .attr("class", "zoom-btn")
        .html("-")
        .attr("title", "Zoom Out")
        .on("click", (event) => {
            event.stopPropagation();
            svg.transition().duration(300).call(zoom.scaleBy, 0.75);
        });

    controls.append("button")
        .attr("class", "zoom-btn")
        .html("⟲")
        .attr("title", "Reset Zoom")
        .on("click", (event) => {
            event.stopPropagation();
            svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        });

});
