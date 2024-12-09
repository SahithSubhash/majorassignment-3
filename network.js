function simulate(data, svg) {
    const [width, height] = svg.attr("viewBox").split(' ').slice(2).map(Number);

    const zoomGroup = svg.append("g");
    const mainGroup = zoomGroup.append("g").attr("transform", "translate(0, 50)");

    // Calculate node degrees
    const nodeDegree = {};
    data.links.forEach(({ source, target }) => {
        nodeDegree[source] = (nodeDegree[source] || 0) + 1;
        nodeDegree[target] = (nodeDegree[target] || 0) + 1;
    });

    const radiusScale = d3.scaleSqrt()
        .domain(d3.extent(Object.values(nodeDegree)))
        .range([3, 12]);

    // Calculate top countries
    const countryCounts = data.nodes.reduce((counts, { country }) => {
        if (country) counts[country] = (counts[country] || 0) + 1;
        return counts;
    }, {});

    const topCountries = Object.entries(countryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([country]) => country);

    const colorScale = d3.scaleOrdinal(["#e41a1c", "#377eb8", "#4daf4a", "#984ea3",
        "#ff7f00", "#ffbf00", "#a65628", "#f781bf", "#000000", "#66c2a5"])
        .domain(topCountries);

    const getColor = (country) => topCountries.includes(country) ? colorScale(country) : "#cccccc";

    // Create links
    const links = mainGroup.append("g")
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll("line")
        .data(data.links)
        .enter()
        .append("line")
        .attr("stroke", "grey");

    // Create nodes
    const nodes = mainGroup.append("g")
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll("g")
        .data(data.nodes)
        .enter()
        .append("g")
        .on("mouseover", function (event, d) {
            const { affiliation } = d;
            nodes.selectAll("circle")
                .style("opacity", node => node.affiliation === affiliation ? 1 : 0.2);
        })
        .on("mouseout", () => nodes.selectAll("circle").style("opacity", 1))
        .on("click", function (event, d) {
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`
                Author: ${d.id}<br>
                Affiliation: ${d.affiliation}<br>
                Country: ${d.country}<br>
                Publications: ${d.publications}<br>
                Titles: ${d.titles ? d.titles.join("<br>") : "No titles available"}
            `)
                .style("left", `${event.pageX + 5}px`)
                .style("top", `${event.pageY - 28}px`);

            setTimeout(() => tooltip.transition().duration(500).style("opacity", 0).remove(), 3000);
        });

    nodes.append("circle")
        .attr("r", d => radiusScale(nodeDegree[d.id] || 0))
        .attr("fill", d => getColor(d.country));

    // Drag behaviors
    const drag = d3.drag()
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });

    nodes.call(drag);

    // Simulation setup
    const simulation = d3.forceSimulation(data.nodes)
        .force("collide", d3.forceCollide(d => radiusScale(nodeDegree[d.id]) * 2))
        .force("x", d3.forceX().strength(0.1))
        .force("y", d3.forceY().strength(0.1))
        .force("charge", d3.forceManyBody().strength(-100).distanceMax(300))
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(50).strength(0.3))
        .on("tick", () => {
            nodes.attr('transform', d => `translate(${d.x},${d.y})`);
            links.attr("x1", d => d.source.x)
                .attr("x2", d => d.target.x)
                .attr("y1", d => d.source.y)
                .attr("y2", d => d.target.y);
        });

    // Update forces dynamically
    const updateForces = () => {
        const chargeStrength = +document.getElementById("chargeStrength").value;
        const collisionRadius = +document.getElementById("collisionRadius").value;
        const linkStrength = +document.getElementById("linkStrength").value;

        simulation
            .force("charge", d3.forceManyBody().strength(chargeStrength))
            .force("collide", d3.forceCollide().radius(d => radiusScale(nodeDegree[d.id]) * collisionRadius / 12))
            .force("link", d3.forceLink(data.links).id(d => d.id).strength(linkStrength))
            .alpha(1)
            .restart();

        clearTimeout(forceTimeout);
        forceTimeout = setTimeout(() => simulation.alphaTarget(0), 3000);
    };

    document.querySelectorAll("#chargeStrength, #collisionRadius, #linkStrength")
        .forEach(input => input.addEventListener("input", updateForces));

    // Zoom behavior
    svg.call(d3.zoom()
        .scaleExtent([0.5, 5])
        .on("zoom", (event) => zoomGroup.attr("transform", event.transform)));
}

// Load data and initialize
const forceTimeout = null;
d3.json("author_network.json").then(data => simulate(data, d3.select("svg")));
