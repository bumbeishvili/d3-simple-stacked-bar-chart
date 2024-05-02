class Chart {
    constructor() {
        // Defining state attributes
        const attrs = {
            id: "ID" + Math.floor(Math.random() * 1000000),
            svgWidth: 400,
            svgHeight: 200,
            marginTop: 15,
            marginBottom: 25,
            marginRight: 5,
            marginLeft: 55,
            colors: {
                neutral10: '#EBEBEB',
            },
            container: "body",
            defaultTextFill: "#2C3E50",
            defaultFont: "Open Sans",
            data: null,
            chartWidth: null,
            chartHeight: null
        };

        // Defining accessors
        this.getState = () => attrs;
        this.setState = (d) => Object.assign(attrs, d);

        // Automatically generate getter and setters for chart object based on the state properties;
        Object.keys(attrs).forEach((key) => {
            //@ts-ignore
            this[key] = function (_) {
                if (!arguments.length) {
                    return attrs[key];
                }
                attrs[key] = _;
                return this;
            };
        });

        // Custom enter exit update pattern initialization (prototype method)
        this.initializeEnterExitUpdatePattern();
    }


    render() {
        this.setDynamicContainer();
        this.calculateProperties();
        this.drawSvgAndWrappers();
        this.drawRects();
        return this;
    }

    calculateProperties() {
        const {
            marginLeft,
            marginTop,
            marginRight,
            marginBottom,
            svgWidth,
            svgHeight
        } = this.getState();

        //Calculated properties
        var calc = {
            id: null,
            chartTopMargin: null,
            chartLeftMargin: null,
            chartWidth: null,
            chartHeight: null
        };
        calc.id = "ID" + Math.floor(Math.random() * 1000000); // id for event handlings
        calc.chartLeftMargin = marginLeft;
        calc.chartTopMargin = marginTop;
        const chartWidth = svgWidth - marginRight - calc.chartLeftMargin;
        const chartHeight = svgHeight - marginBottom - calc.chartTopMargin;

        this.setState({ calc, chartWidth, chartHeight });
    }

    drawRects() {
        const { chart, colors, data, chartWidth, chartHeight } = this.getState();

        data.groups.forEach(group => {
            let val = 0;
            group.values.forEach(valueObj => {
                valueObj.cumsum = val;
                val += valueObj.value;

            })
        })

        // Y Axis
        const scaleY = d3.scaleLinear()
            .domain([data.yMin, data.yMax])
            .range([chartHeight, 0])

        const yAxis = d3.axisLeft(scaleY).tickFormat(d => d + data.unit).ticks(5)
            .tickSize(-chartWidth)

        const yAxisWrapper = chart._add({
            tag: 'g',
            className: 'y-axis-group'
        })
        yAxisWrapper.transition().call(yAxis)
        yAxisWrapper.selectAll('.domain').remove()
        yAxisWrapper.selectAll('text').attr('font-size', 16).attr('font-weight', 300).attr('x', -10)
        yAxisWrapper.selectAll('.tick line')
            .attr('stroke', colors.neutral10)

        // X Axis
        const margin = 20;
        const scaleX = d3.scaleBand()
            .domain(data.groups.map(d => d.name))
            .range([0 + margin, chartWidth - margin])
            .paddingInner(0.5)

        const xAxis = d3.axisBottom(scaleX)

        const xAxisWrapper = chart._add({
            tag: 'g',
            className: 'x-axis-group'
        })
            .attr('transform', `translate(0,${chartHeight})`)

        xAxisWrapper.transition().call(xAxis)
        xAxisWrapper.selectAll('.tick line').remove()
        xAxisWrapper.selectAll('.domain').remove()
        xAxisWrapper.selectAll('text').attr('font-size', 16).attr('font-weight', 300)
        xAxisWrapper._add({
            tag: 'line',
            className: 'horizontal-line'
        })
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y0', 0)
            .attr('y1', 0)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5)


        // Background-rects
        const barWrappers = chart._add({
            tag: 'g',
            className: 'bar-wrappers',
            data: data.groups
        })
            .attr('transform', d => `translate(${scaleX(d.name)},0)`)

        const barBackground = barWrappers._add({
            tag: 'path',
            className: 'bar-background'
        })
            .attr('fill', 'white')
            .attr('d', (d) => {
                const width = scaleX.bandwidth();
                const height = chartHeight - 1;
                const roundness = width / 8;
                return `M0 ${height} 
                        V${roundness} 
                        Q0 0 ${roundness} 0 
                        
                        H${width - roundness}  
                        Q${width} ${0} ${width} ${roundness} 
                        V${height}z`
            })

        barWrappers._add({
            tag: 'path',
            className: 'bars',
            data: d => d.values
        })

            .attr('fill', d => d.color)
            .attr('d', function (d) {
                const initialTransform = `M0 ${chartHeight} V${chartHeight} Q0 ${chartHeight} 0 ${chartHeight} H${scaleX.bandwidth()}  Q${scaleX.bandwidth()} ${chartHeight} ${scaleX.bandwidth()} ${chartHeight}  V${chartHeight}z`
                const currentTransform = d3.select(this).attr('d')
                if (currentTransform) return currentTransform;
                return initialTransform
            })
            .transition()

            .transition()
            .attr('d', (d, i) => {
                const width = scaleX.bandwidth();
                const height = scaleY(0) - scaleY(d.value);
                const y = chartHeight - scaleY(d.cumsum)
                let roundness = width / 8;
                if (height < roundness) {
                    roundness = height;
                }
                let startY = chartHeight - y + roundness
                let roundnessDiff = 0;
                if (startY > chartHeight) {
                    roundnessDiff = startY - chartHeight
                    startY = chartHeight

                }
                const endY = startY - height - roundness - roundnessDiff;
                console.log({ startY, endY, y, height, val: d.value, name: d.name, cumsum: d.cumsum })
                return `M0 ${startY} 
                            V${endY + roundness} 
                            Q0 ${endY} ${roundness} ${endY} 
                            H${width - roundness}  
                            Q${width} ${endY} ${width} ${endY + roundness} 
                            V${startY}z`
            })
            .each(function () {
                d3.select(this).lower()
            })

        barBackground.lower()


    }

    drawSvgAndWrappers() {
        const {
            d3Container,
            svgWidth,
            svgHeight,
            defaultFont,
            calc,
            data,
            chartWidth,
            chartHeight
        } = this.getState();

        // Draw SVG
        const svg = d3Container
            ._add({
                tag: "svg",
                className: "svg-chart-container"
            })
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .attr("font-family", defaultFont);

        //Add container g element
        var chart = svg
            ._add({
                tag: "g",
                className: "chart"
            })
            .attr(
                "transform",
                "translate(" + calc.chartLeftMargin + "," + calc.chartTopMargin + ")"
            );



        this.setState({ chart, svg });
    }

    initializeEnterExitUpdatePattern() {
        d3.selection.prototype._add = function (params) {
            var container = this;
            var className = params.className;
            var elementTag = params.tag;
            var data = params.data || [className];
            var exitTransition = params.exitTransition || null;
            var enterTransition = params.enterTransition || null;
            // Pattern in action
            var selection = container.selectAll("." + className).data(data, (d, i) => {
                if (typeof d === "object") {
                    if (d.id) {
                        return d.id;
                    }
                }
                return i;
            });
            if (exitTransition) {
                exitTransition(selection);
            } else {
                selection.exit().remove();
            }

            const enterSelection = selection.enter().append(elementTag);
            if (enterTransition) {
                enterTransition(enterSelection);
            }
            selection = enterSelection.merge(selection);
            selection.attr("class", className);
            return selection;
        };
    }

    setDynamicContainer() {
        const attrs = this.getState();

        //Drawing containers
        var d3Container = d3.select(attrs.container);
        var containerRect = d3Container.node().getBoundingClientRect();
        if (containerRect.width > 0) attrs.svgWidth = containerRect.width;

        d3.select(window).on("resize." + attrs.id, () => {
            var containerRect = d3Container.node().getBoundingClientRect();
            if (containerRect.width > 0) attrs.svgWidth = containerRect.width;
            this.render();
        });

        this.setState({ d3Container });
    }
}