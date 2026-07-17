/**
 * Chapter 4 & 5: Spending Line/Area Chart (Dynamic Drawing Animation)
 * 
 * This file creates the Premier League transfer spending line/area chart.
 * It connects the Pre-TV line and the Post-TV line seamlessly, and exposes:
 *   - `window.setLineChartState("pre" | "post")` - instantly sets the visual state.
 *   - `window.triggerLineChartCountUp()` - runs a dot forward from 2012 to 2025,
 *     drawing the line and filling the area dynamically behind it.
 *   - `window.triggerLineChartCountDown()` - runs the dot backward, erasing the post-TV line.
 */

Promise.all([
    d3.csv("data/ch4_pre_tv_spend.csv"),
    d3.csv("data/ch5_post_tv_spend.csv")
]).then(([preData, postData]) => {

    console.log("Chapter 4x5: Initializing Spending Chart drawing animations");

    // 1. Process data inputs
    const pre_tv = preData.map(d => ({
        season_start: +d.season_start,
        spend_millions: +d.spend_millions,
        type: "pre"
    }));

    const post_tv = postData.map(d => ({
        season_start: +d.season_start,
        spend_millions: +d.spend_millions,
        type: "post"
    }));

    // Prepend the last Pre-TV point to the Post-TV data so the line is continuous
    const postTVLineData = [pre_tv[pre_tv.length - 1], ...post_tv];

    // 2. Select container and calculate dimensions
    const container = d3.select("#ch4");
    const width = container.node().clientWidth || 800;
    const height = container.node().clientHeight || 500;

    const margin = {
        top: 40,
        right: 40,
        bottom: 50,
        left: 80
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const allData = [...pre_tv, ...post_tv];

    // 3. Define Scales and Axes
    const xScale = d3.scaleLinear()
        .domain(d3.extent(allData, d => d.season_start))
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d.spend_millions)])
        .range([innerHeight, 0]);

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale).tickFormat(d => d < 1000 ? `£${d.toFixed(0)}M` : `£${(d/1000).toFixed(1)}B`);

    chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis);

    chart.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

    // Chart Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Premier League Transfer Spending");
    
    // 4. Area and Line generators
    const area = d3.area()
        .x(d => xScale(d.season_start))
        .y0(innerHeight)
        .y1(d => yScale(d.spend_millions))
        .curve(d3.curveMonotoneX);

    const line = d3.line()
        .x(d => xScale(d.season_start))
        .y(d => yScale(d.spend_millions))
        .curve(d3.curveMonotoneX);

    // 5. Draw Pre-TV Path (always visible)
    const preArea = chart.append("path")
        .datum(pre_tv)
        .attr("d", area)
        .style("fill", "rgba(44,166,164,0.25)")
        .style("stroke-width", "none");

    const prePath = chart.append("path")
        .datum(pre_tv)
        .attr("d", line)
        .style("stroke", "var(--accent-cyan)")
        .style("stroke-width", "2px")
        .style("fill", "none");

    // 6. Draw Post-TV Path (Clipped and revealed dynamically)
    const postArea = chart.append("path")
        .datum(postTVLineData)
        .attr("d", area)
        .style("fill", "rgba(244,185,66,0.15)") // translucent gold fill
        .style("stroke-width", "none")
        .style("pointer-events", "none");

    const postPath = chart.append("path")
        .datum(postTVLineData)
        .attr("d", line)
        .style("stroke", "var(--accent-gold)") // Gold accent line
        .style("stroke-width", "3px")
        .style("fill", "none")
        .style("pointer-events", "none");

    // 7. Setup clipping mask for the Post-TV elements
    const clipPath = svg.append("defs")
        .append("clipPath")
        .attr("id", "post-chart-clip");

    const clipRect = clipPath.append("rect")
        .attr("x", xScale(2012))
        .attr("y", -margin.top)
        .attr("width", 0) // Starts at 0 width (fully clipped)
        .attr("height", height);

    postArea.attr("clip-path", "url(#post-chart-clip)");
    postPath.attr("clip-path", "url(#post-chart-clip)");

    // 8. Tooltip Line Tracer
    const tracer = chart.append("line")
        .style("stroke", "white")
        .style("stroke-width", 1)
        .style("stroke-dasharray", "4 4")
        .style("opacity", 0);

    // Reveal ToolTip Function
    function showTooltip(event, d) {
        d3.select(this)
            .style("opacity", 1)
            .attr("r", 7);

        tracer
            .style("opacity", 1)
            .attr("x1", xScale(d.season_start))
            .attr("x2", xScale(d.season_start))
            .attr("y1", yScale(d.spend_millions))
            .attr("y2", innerHeight);

        d3.select("#tooltip")
            .style("opacity", 1)
            .html(`
                <strong>${d.season_start}</strong><br>
                £${d.spend_millions < 1000 ? d.spend_millions.toFixed(2) + 'M' : (d.spend_millions / 1000).toFixed(2) + 'B'}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
    }

    function hideTooltip() {
        d3.select(this)
            .style("opacity", 0.6)
            .attr("r", 3);

        tracer.style("opacity", 0);
        d3.select("#tooltip").style("opacity", 0);
    }

    // 9. Tooltip dots
    const preDots = chart.selectAll(".pre-dot")
        .data(pre_tv)
        .enter()
        .append("circle")
        .attr("class", "pre-dot")
        .attr("cx", d => xScale(d.season_start))
        .attr("cy", d => yScale(d.spend_millions))
        .attr("r", 3)
        .style("fill", "var(--accent-cyan)")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("opacity", 0.6)
        .on("mouseover", showTooltip)
        .on("mouseout", hideTooltip);

    const postDots = chart.selectAll(".post-dot")
        .data(post_tv)
        .enter()
        .append("circle")
        .attr("class", "post-dot")
        .attr("cx", d => xScale(d.season_start))
        .attr("cy", d => yScale(d.spend_millions))
        .attr("r", 3)
        .style("fill", "var(--accent-gold)")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("opacity", 0) // Starts hidden
        .style("pointer-events", "none")
        .on("mouseover", showTooltip)
        .on("mouseout", hideTooltip);

    // 10. TV Boom Vertical Marker Line
    chart.append("line") 
        .attr("x1", xScale(2013)) 
        .attr("x2", xScale(2013))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "rgba(255,255,255,0.2)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

    d3.select("#page_label")
        .html("TV Boom Begins");

    // 11. Orchestrate state transitions
    let lineChartState = "pre"; // Tracker for current visual state

    // Create the running tracer dot
    const runningDot = chart.append("circle")
        .attr("class", "running-dot")
        .attr("r", 6)
        .style("fill", "var(--accent-gold)")
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .style("opacity", 0)
        .style("pointer-events", "none");

    // A. INSTANT SET STATE: Instantly configures the visual without transitions
    window.setLineChartState = function(state) {
        lineChartState = state;

        // Stop active transitions
        clipRect.interrupt();
        runningDot.interrupt();
        postDots.interrupt();

        if (state === "pre") {
            clipRect.attr("width", 0);
            runningDot.style("opacity", 0);
            postDots.style("opacity", 0).style("pointer-events", "none");
        } else {
            clipRect.attr("width", xScale(2025) - xScale(2012));
            runningDot.style("opacity", 0);
            postDots.style("opacity", 0.6).style("pointer-events", "auto");
        }
    };

    // B. COUNT-UP TRANSITION: Runs the dot forward and draws the line/area
    window.triggerLineChartCountUp = function() {
        if (lineChartState === "post") return; // Avoid double triggering
        lineChartState = "post";

        console.log("Chapter 4x5: Drawing post-TV line forward");

        clipRect.interrupt();
        runningDot.interrupt();
        postDots.interrupt();

        const length = postPath.node().getTotalLength();
        const duration = 2000; // 2.0 seconds

        d3.transition()
            .duration(duration)
            .ease(d3.easeLinear)
            .tween("draw-line", () => {
                return function(t) {
                    // Get point coordinate on post path at progress t (0.0 to 1.0)
                    const point = postPath.node().getPointAtLength(t * length);
                    
                    // Position running tracer dot
                    runningDot
                        .attr("cx", point.x)
                        .attr("cy", point.y)
                        .style("opacity", 1);

                    // Expand clip path rect to reveal line/area up to current point
                    const currentClipWidth = Math.max(0, point.x - xScale(2012));
                    clipRect.attr("width", currentClipWidth);

                    // Reveal dots as tracer dot passes their positions
                    postDots.each(function(d) {
                        const dot = d3.select(this);
                        if (point.x >= xScale(d.season_start)) {
                            dot.style("opacity", 0.6);
                        } else {
                            dot.style("opacity", 0);
                        }
                    });
                };
            })
            .on("end", () => {
                // Fade out tracer dot and make data dots interactive
                runningDot.transition().duration(200).style("opacity", 0);
                postDots.style("opacity", 0.6).style("pointer-events", "auto");
            });
    };

    // C. COUNT-DOWN TRANSITION: Runs the dot backward, erasing the line/area
    window.triggerLineChartCountDown = function() {
        if (lineChartState === "pre") return; // Avoid double triggering
        lineChartState = "pre";

        console.log("Chapter 4x5: Erasing post-TV line backward");

        clipRect.interrupt();
        runningDot.interrupt();
        postDots.interrupt();

        const length = postPath.node().getTotalLength();
        const duration = 1600; // 1.6 seconds

        d3.transition()
            .duration(duration)
            .ease(d3.easeLinear)
            .tween("erase-line", () => {
                return function(t) {
                    // Reverse interpolation (1.0 to 0.0)
                    const factor = 1 - t;
                    const point = postPath.node().getPointAtLength(factor * length);
                    
                    // Position running tracer dot
                    runningDot
                        .attr("cx", point.x)
                        .attr("cy", point.y)
                        .style("opacity", 1);

                    // Shrink clip path rect
                    const currentClipWidth = Math.max(0, point.x - xScale(2012));
                    clipRect.attr("width", currentClipWidth);

                    // Hide dots as tracer passes them going backward
                    postDots.each(function(d) {
                        const dot = d3.select(this);
                        if (point.x >= xScale(d.season_start)) {
                            dot.style("opacity", 0.6);
                        } else {
                            dot.style("opacity", 0);
                        }
                    });
                };
            })
            .on("end", () => {
                // Fade out tracer dot and hide data dots
                runningDot.transition().duration(200).style("opacity", 0);
                postDots.style("opacity", 0).style("pointer-events", "none");
            });
    };

    // Initialize line chart in Pre-TV mode
    window.setLineChartState("pre");

});