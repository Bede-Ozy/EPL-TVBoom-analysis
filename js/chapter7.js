/**
 * Chapter 7: Valuation Explosion Chart (Dynamic Count-Up / Count-Down)
 * 
 * This file creates the circular average transfer fee visualization.
 * It supports symmetric scroll-linked animations:
 *   - Scrolling down: shows Pre-TV (£5.43M) first, then counts up to Post-TV (£15.77M) at center.
 *   - Scrolling up: shows Post-TV (£15.77M) first, then counts down to Pre-TV (£5.43M) at center.
 */

Promise.all([
    d3.csv("data/ch7_valuation_explosion.csv")
]).then(([data]) => {

    console.log("Chapter 7: Initializing Dynamic Count-Up/Count-Down");

    // 1. Extract values from the CSV
    const explosion = data.map(d => ({
        period: d.period,
        average_fee: +d.average_fee
    }));

    const pre = explosion.find(d => d.period === "pre-tv").average_fee;  // Approx 5,430,000
    const post = explosion.find(d => d.period === "post-tv").average_fee; // Approx 15,770,000
    const growthPct = ((post - pre) / pre) * 100;                        // Approx 190%

    // 2. Select container and calculate dimensions
    const container = d3.select("#ch7");
    const width = container.node().clientWidth || 800;
    const height = container.node().clientHeight || 600;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // 3. Create a central card group
    const centerX = width / 2;
    const centerY = height / 2;

    const cardGroup = svg.append("g")
        .attr("transform", `translate(${centerX}, ${centerY})`);

    // 4. Background circular panel (matching glassmorphism theme)
    cardGroup.append("circle")
        .attr("r", 200)
        .style("fill", "var(--bg-glass)")
        .style("stroke", "var(--border-glass)")
        .style("stroke-width", "2px");

    // 5. Outer glowing ring that changes color during transitions
    const glowCircle = cardGroup.append("circle")
        .attr("r", 200)
        .style("fill", "none")
        .style("stroke", "var(--accent-cyan)")
        .style("stroke-width", "4px")
        .style("opacity", 0.8);

    // 6. Title Text inside the card
    cardGroup.append("text")
        .attr("y", -100)
        .attr("text-anchor", "middle")
        .style("fill", "var(--text-muted)")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("letter-spacing", "2px")
        .text("AVERAGE TRANSFER FEE");

    // 7. Huge central number (This will count up or down)
    const feeText = cardGroup.append("text")
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .style("fill", "var(--text-primary)")
        .style("font-size", "86px")
        .style("font-weight", "800")
        .style("letter-spacing", "-2px")
        .text(`£${(pre / 1000000).toFixed(2)}M`);

    // 8. Dynamic Subtitle Era Label
    const labelText = cardGroup.append("text")
        .attr("y", 70)
        .attr("text-anchor", "middle")
        .style("fill", "var(--accent-cyan)")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("letter-spacing", "1px")
        .text("PRE-TV ERA (2000-2012)");

    // 9. Percentage Growth Display (revealed during count-up)
    const growthText = cardGroup.append("text")
        .attr("y", 130)
        .attr("text-anchor", "middle")
        .style("fill", "var(--accent-gold)")
        .style("font-size", "32px")
        .style("font-weight", "800")
        .style("opacity", 0)
        .text("+0% Growth");

    // Tracker variable for current visual state: "pre" or "post"
    let valuationState = "pre";

    // Helper to format money values
    function formatFee(val) {
        return (val / 1000000).toFixed(2) + "M";
    }

    // Helper to parse displayed fee back into numerical values
    function parseFeeText(text) {
        const num = parseFloat(text.replace("£", "").replace("M", ""));
        return isNaN(num) ? null : num * 1000000;
    }

    // A. INSTANT SET STATE: Instantly configures the visual without transitions
    window.setValuationState = function(state) {
        valuationState = state;

        // Stop active transitions
        feeText.interrupt();
        growthText.interrupt();
        glowCircle.interrupt();
        labelText.interrupt();

        if (state === "pre") {
            feeText.text(`£${formatFee(pre)}`);
            labelText.text("PRE-TV ERA (2000-2012)").style("fill", "var(--accent-cyan)");
            glowCircle.style("stroke", "var(--accent-cyan)");
            growthText.style("opacity", 0).text("+0% Growth").style("fill", "var(--accent-cyan)");
        } else {
            feeText.text(`£${formatFee(post)}`);
            labelText.text("POST-TV BOOM (2013-2025)").style("fill", "var(--accent-gold)");
            glowCircle.style("stroke", "var(--accent-gold)");
            growthText.style("opacity", 1).text(`+${growthPct.toFixed(0)}% Growth`).style("fill", "var(--accent-gold)");
        }
    };

    // B. COUNT-UP TRANSITION: Animates Pre-TV to Post-TV
    window.triggerValuationCountUp = function() {
        if (valuationState === "post") return; // Avoid double triggering
        valuationState = "post";

        console.log("Chapter 7: Animating count-up to Post-TV");

        // Interrupt any current transitions
        feeText.interrupt();
        growthText.interrupt();
        glowCircle.interrupt();
        labelText.interrupt();

        const duration = 1500;

        // 1. Count up central fee number (interpolating from current midpoint if scrolling fast)
        feeText.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .textTween(function() {
                const currentVal = parseFeeText(feeText.text()) || pre;
                const interpolator = d3.interpolateNumber(currentVal, post);
                return function(t) {
                    return `£${formatFee(interpolator(t))}`;
                };
            });

        // 2. Count up and reveal growth percentage text
        growthText.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .style("opacity", 1)
            .textTween(function() {
                const currentGrowth = parseFloat(growthText.text().replace("+", "").replace("% Growth", "")) || 0;
                const interpolator = d3.interpolateNumber(currentGrowth, growthPct);
                return function(t) {
                    return `+${interpolator(t).toFixed(0)}% Growth`;
                };
            });

        // 3. Shift subtitle era labels and colors
        labelText.text("VALUATION EXPLODING...")
            .transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .style("fill", "var(--accent-gold)")
            .on("end", function() {
                labelText.text("POST-TV BOOM (2013-2025)");
            });

        // 4. Interpolate glow border color Cyan -> Gold
        glowCircle.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .styleTween("stroke", function() {
                const currentStroke = glowCircle.style("stroke");
                return d3.interpolateRgb(currentStroke, "#00c6ff");
            });
 
        // 5. Interpolate growth text color Cyan -> Gold
        growthText.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .styleTween("fill", function() {
                const currentFill = growthText.style("fill");
                return d3.interpolateRgb(currentFill, "#00c6ff");
            });
    };

    // C. COUNT-DOWN TRANSITION: Animates Post-TV back to Pre-TV
    window.triggerValuationCountDown = function() {
        if (valuationState === "pre") return; // Avoid double triggering
        valuationState = "pre";

        console.log("Chapter 7: Animating count-down to Pre-TV");

        // Interrupt current transitions
        feeText.interrupt();
        growthText.interrupt();
        glowCircle.interrupt();
        labelText.interrupt();

        const duration = 1500;

        // 1. Count down central fee number
        feeText.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .textTween(function() {
                const currentVal = parseFeeText(feeText.text()) || post;
                const interpolator = d3.interpolateNumber(currentVal, pre);
                return function(t) {
                    return `£${formatFee(interpolator(t))}`;
                };
            });

        // 2. Count down and hide growth percentage text
        growthText.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .style("opacity", 0)
            .textTween(function() {
                const currentGrowth = parseFloat(growthText.text().replace("+", "").replace("% Growth", "")) || growthPct;
                const interpolator = d3.interpolateNumber(currentGrowth, 0);
                return function(t) {
                    return `+${interpolator(t).toFixed(0)}% Growth`;
                };
            });

        // 3. Shift subtitle era labels and colors
        labelText.text("VALUATION DEFLATING...")
            .transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .style("fill", "var(--accent-cyan)")
            .on("end", function() {
                labelText.text("PRE-TV ERA (2000-2012)");
            });

        // 4. Interpolate glow border color Gold -> Cyan
        glowCircle.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .styleTween("stroke", function() {
                const currentStroke = glowCircle.style("stroke");
                return d3.interpolateRgb(currentStroke, "#226ff8");
            });
 
        // 5. Interpolate growth text color Gold -> Cyan
        growthText.transition()
            .duration(duration)
            .ease(d3.easeQuadOut)
            .styleTween("fill", function() {
                const currentFill = growthText.style("fill");
                return d3.interpolateRgb(currentFill, "#226ff8");
            });
    };

    // Initialize the visual state in Pre-TV mode
    window.setValuationState("pre");

});