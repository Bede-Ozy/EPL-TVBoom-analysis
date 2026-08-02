Promise.all([
    d3.csv("data/ch8a_positional_investment_pre_tv.csv"),
    d3.csv("data/ch8b_positional_investment_post_tv.csv")
]).then(([prePositional, postPositional]) => {

    console.log("=========== chapter 8");

    const prePosition = prePositional.map(d => ({
        general_position: d.general_position,
        spend_millions: +d.spend_millions
    }));

    const postPosition = postPositional.map(d => ({
        general_position: d.general_position,
        spend_millions: +d.spend_millions
    }));

    console.log(prePosition);
    console.log(postPosition);

    // ==========================
    // Combine datasets
    // ==========================

    const combined = prePosition.map(pre => {

        const post = postPosition.find(
            d => d.general_position === pre.general_position
        );

        return {
            position: pre.general_position,
            pre: pre.spend_millions,
            post: post ? post.spend_millions : 0
        };

    });

    // ==========================
    // Sort by total spend
    // ==========================

    combined.sort(
        (a, b) => (b.pre + b.post) - (a.pre + a.post)
    );

    console.log("Combined");
    console.log(combined);

    // ==========================
    // SVG Setup
    // ==========================

    const container = d3.select("#ch8");

    const width = container.node().clientWidth;
    const height = container.node().clientHeight;

    const margin = {
        top: 50,
        right: 100,
        bottom: 50,
        left: 180
    };

    const innerWidth =
        width -
        margin.left -
        margin.right;

    const innerHeight =
        height -
        margin.top -
        margin.bottom;

    const svg = container.append("svg")
        .attr(
            "viewBox",
            `0 0 ${width} ${height}`
        )
        .attr(
            "preserveAspectRatio",
            "xMidYMid meet"
        );

    const chart = svg.append("g")
        .attr(
            "transform",
            `translate(${margin.left},${margin.top})`
        );

    // ==========================
    // Scales
    // ==========================

    const xScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(
                combined,
                d => d.pre + d.post
            )
        ])
        .nice()
        .range([0, innerWidth]);

    const yScale = d3.scaleBand()
        .domain(
            combined.map(
                d => d.position
            )
        )
        .range([0, innerHeight])
        .padding(0.25);

    // ==========================
    // Axes
    // ==========================

    const xAxis = d3.axisBottom(xScale);

    const yAxis = d3.axisLeft(yScale);

    chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", "var(--text-muted)");

    chart.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "var(--text-primary)");

    // ==========================
    // Pre-TV Bars (static segment)
    // ==========================

    const preBars = chart.selectAll(".pre-bar")
        .data(combined)
        .enter()
        .append("rect")
        .attr("class", "pre-bar")
        .attr("x", 0)
        .attr("y", d => yScale(d.position))
        .attr("height", yScale.bandwidth())
        .attr("width", d => xScale(d.pre))
        .attr("fill", "var(--accent-cyan)");

    // ==========================
    // Post-TV Bars (stacked segment - grows on scroll)
    // ==========================

    const postBars = chart.selectAll(".post-bar")
        .data(combined)
        .enter()
        .append("rect")
        .attr("class", "post-bar")
        .attr("x", d => xScale(d.pre))
        .attr("y", d => yScale(d.position))
        .attr("height", yScale.bandwidth())
        .attr("width", 0) // Starts at 0 width in Pre state
        .attr("fill", "var(--accent-gold)");

    // ==========================
    // Percentage Increase Labels (centered inside Post-TV segment)
    // ==========================

    const pctLabels = chart.selectAll(".pct-label")
        .data(combined)
        .enter()
        .append("text")
        .attr("class", "pct-label")
        .attr("y", d => yScale(d.position) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("fill", "#0f172a") // High contrast navy text on gold
        .style("font-size", "12px")
        .style("font-weight", "800")
        .style("opacity", 0); // Starts hidden

    // ==========================
    // Total Labels (slides at the end of the combined bars)
    // ==========================

    const totalLabels = chart.selectAll(".total-label")
        .data(combined)
        .enter()
        .append("text")
        .attr("class", "total-label")
        .attr("y", d => yScale(d.position) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("fill", "var(--text-primary)")
        .style("font-size", "12px")
        .style("font-weight", "600");

    // Helper to format values nicely
    function formatLabelValue(val) {
        return val < 1000 ? `£${Math.round(val)}M` : `£${(val/1000).toFixed(1)}B`;
    }

    // ==========================
    // Legend
    // ==========================

    const legend = svg.append("g")
        .attr("transform", `translate(${width - 180}, 30)`);

    legend.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", "var(--accent-cyan)");

    legend.append("text")
        .attr("x", 22)
        .attr("y", 11)
        .style("fill", "var(--text-primary)")
        .style("font-size", "12px")
        .text("Pre-TV");

    legend.append("rect")
        .attr("x", 90)
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", "var(--accent-gold)");

    legend.append("text")
        .attr("x", 112)
        .attr("y", 11)
        .style("fill", "var(--text-primary)")
        .style("font-size", "12px")
        .text("Post-TV");

    // ==========================
    // Title
    // ==========================

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("fill", "var(--text-primary)")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Investment by Position");

    // ==========================
    // Scroll Transitions & State Controls
    // ==========================

    let chapter8State = "pre";

    // Instantly sets state without animation
    window.setChapter8State = function(state) {
        chapter8State = state;

        postBars.interrupt();
        pctLabels.interrupt();
        totalLabels.interrupt();

        if (state === "pre") {
            postBars.attr("width", 0);
            pctLabels
                .style("opacity", 0)
                .attr("x", d => xScale(d.pre));
            totalLabels
                .attr("x", d => xScale(d.pre) + 8)
                .text(d => formatLabelValue(d.pre));
        } else {
            postBars.attr("width", d => xScale(d.post));
            pctLabels
                .style("opacity", 1)
                .attr("x", d => xScale(d.pre) + xScale(d.post) / 2)
                .text(d => `+${Math.round(((d.post - d.pre) / d.pre) * 100)}%`);
            totalLabels
                .attr("x", d => xScale(d.pre + d.post) + 8)
                .text(d => formatLabelValue(d.pre + d.post));
        }
    };

    // Transitions from Pre-TV to Post-TV (stacked) state
    window.triggerChapter8CountUp = function() {
        if (chapter8State === "post") return;
        chapter8State = "post";

        console.log("Chapter 8: Growing Post-TV stacked bars");

        postBars.interrupt();
        pctLabels.interrupt();
        totalLabels.interrupt();

        const duration = 1500;

        // 1. Animate post bars width growth
        postBars.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .attr("width", d => xScale(d.post));

        // 2. Position and fade in percentage increase labels
        pctLabels
            .attr("x", d => xScale(d.pre) + xScale(d.post) / 2)
            .text(d => `+${Math.round(((d.post - d.pre) / d.pre) * 100)}%`)
            .transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .style("opacity", 1);

        // 3. Slide and count up total labels
        totalLabels.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .attr("x", d => xScale(d.pre + d.post) + 8)
            .textTween(function(d) {
                const interpolator = d3.interpolateNumber(d.pre, d.pre + d.post);
                return function(t) {
                    return formatLabelValue(interpolator(t));
                };
            });
    };

    // Transitions back from Post-TV to Pre-TV state
    window.triggerChapter8CountDown = function() {
        if (chapter8State === "pre") return;
        chapter8State = "pre";

        console.log("Chapter 8: Shrinking Post-TV stacked bars");

        postBars.interrupt();
        pctLabels.interrupt();
        totalLabels.interrupt();

        const duration = 1500;

        // 1. Shrink post bars to 0 width
        postBars.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .attr("width", 0);

        // 2. Fade out percentage increase labels
        pctLabels.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .style("opacity", 0);

        // 3. Slide and count down total labels back to Pre-TV totals
        totalLabels.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .attr("x", d => xScale(d.pre) + 8)
            .textTween(function(d) {
                const interpolator = d3.interpolateNumber(d.pre + d.post, d.pre);
                return function(t) {
                    return formatLabelValue(interpolator(t));
                };
            });
    };

    // Initialize in Pre state
    window.setChapter8State("pre");

});