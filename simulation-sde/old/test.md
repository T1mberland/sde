I have the following simple web app to simulate stochastic processes. However, Javascript is slow so I want to use Web Assembly with Rust. Can you help?

### `index.html`
```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stochastic Integration Simulator</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.js"></script>
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>

<body>
    <div class="header">
        <h1>Stochastic Integration Simulator</h1>
        <p>Simulating the stochastic process \( dX_t = f(t, B_t) dB_t + g(t, B_t) dt \)</p>
    </div>
    <div class="container">
        <div class="controls">
            <label for="function">Function f(t, B_t):</label>
            <input type="text" id="function" value="sin(2 * pi * t) * B_t" />

            <label for="functionG">Function g(t, B_t):</label>
            <input type="text" id="functionG" value="cos(2 * pi * t)" />

            <label for="tMax">Time Range (0 to):</label>
            <input type="number" id="tMax" value="1" min="0.1" step="0.1" />

            <label for="numSamples">Number of Samples:</label>
            <input type="number" id="numSamples" value="1000" min="100" step="100" />

            <label for="numTrajectories">Number of Trajectories:</label>
            <input type="number" id="numTrajectories" value="10" min="1" max="50" step="1" />

            <label for="numBins">Number of Histogram Bins:</label>
            <input type="number" id="numBins" value="30" min="5" max="100" step="1" />

            <label for="animationSpeed">Animation Speed:</label>
            <input type="range" id="animationSpeed" min="1" max="100" value="50" />
            <span id="speedValue">50</span>

            <button onclick="startSimulation()">Start Animation</button>
            <button onclick="stopSimulation()">Stop Animation</button>
            <button onclick="calculateWithoutAnimation()">Calculate Without Animation</button>

            <p id="integralResult"></p>
        </div>
        <div class="plots">
            <div id="trajectoryPlot" class="plot"></div>
            <div id="histogramPlot" class="plot"></div>
        </div>
    </div>

    <script src="script.js"></script>
</body>

</html>
```


### `script.js`
```javascript
let animationInterval;
let currentStep = 0;
let allBrownianMotions = [];
let allIntegrals = [];
let timePoints = [];
let finalValues = [];
let isSimulationRunning = false;

function startSimulation() {
    if (isSimulationRunning) return;
    isSimulationRunning = true;

    // Clear previous simulation
    clearInterval(animationInterval);
    currentStep = 0;
    allBrownianMotions = [];
    allIntegrals = [];
    finalValues = [];

    const tMax = parseFloat(document.getElementById('tMax').value);
    const n = parseInt(document.getElementById('numSamples').value);
    const numTrajectories = parseInt(document.getElementById('numTrajectories').value);
    const dt = tMax / n;
    timePoints = Array.from({ length: n + 1 }, (_, i) => i * dt);

    const functionStringF = document.getElementById('function').value;
    const compiledFunctionF = math.compile(functionStringF);

    const functionStringG = document.getElementById('functionG').value;
    const compiledFunctionG = math.compile(functionStringG);

    // Initialize trajectories
    for (let traj = 0; traj < numTrajectories; traj++) {
        allBrownianMotions.push([0]);
        allIntegrals.push([0]);
    }

    // Set up the plots
    setupPlots();

    // Start the animation
    updateAnimationInterval();
}

function stopSimulation() {
    if (!isSimulationRunning) return;
    isSimulationRunning = false;
    clearInterval(animationInterval);
    animationInterval = null;
    finalizeSimulation();
}

function calculateWithoutAnimation() {
    // Clear previous simulation
    clearInterval(animationInterval);
    isSimulationRunning = false;
    allBrownianMotions = [];
    allIntegrals = [];
    finalValues = [];

    const tMax = parseFloat(document.getElementById('tMax').value);
    const n = parseInt(document.getElementById('numSamples').value);
    const numTrajectories = parseInt(document.getElementById('numTrajectories').value);
    const dt = tMax / n;
    timePoints = Array.from({ length: n + 1 }, (_, i) => i * dt);

    const functionStringF = document.getElementById('function').value;
    const compiledFunctionF = math.compile(functionStringF);

    const functionStringG = document.getElementById('functionG').value;
    const compiledFunctionG = math.compile(functionStringG);

    for (let traj = 0; traj < numTrajectories; traj++) {
        let brownianMotion = [0];
        let integral = [0];

        for (let i = 1; i <= n; i++) {
            const dW = Math.sqrt(dt) * normalRandom();
            const newB = brownianMotion[i - 1] + dW;
            brownianMotion.push(newB);

            const scope = {
                t: timePoints[i - 1],
                B_t: brownianMotion[i - 1],
                pi: Math.PI,
                e: Math.E
            };
            const integrandF = compiledFunctionF.evaluate(scope);
            const integrandG = compiledFunctionG.evaluate(scope);
            integral.push(integral[i - 1] + integrandF * dW + integrandG * dt);
        }

        allBrownianMotions.push(brownianMotion);
        allIntegrals.push(integral);
    }

    plotTrajectories();
    finalizeSimulation();
}

function updateAnimationInterval() {
    if (!isSimulationRunning) return;
    const speed = parseInt(document.getElementById('animationSpeed').value);

    const interval = Math.max(1, 101 - speed); // Invert the scale so higher value means faster
    clearInterval(animationInterval);
    animationInterval = setInterval(updateSimulation, interval);
}

function updateSimulation() {
    const tMax = parseFloat(document.getElementById('tMax').value);
    const n = parseInt(document.getElementById('numSamples').value);
    const dt = tMax / n;
    const functionStringF = document.getElementById('function').value;
    const compiledFunctionF = math.compile(functionStringF);

    const functionStringG = document.getElementById('functionG').value;
    const compiledFunctionG = math.compile(functionStringG);

    if (currentStep >= n) {
        stopSimulation();
        return;
    }

    for (let traj = 0; traj < allBrownianMotions.length; traj++) {
        const dW = Math.sqrt(dt) * normalRandom();
        const newB = allBrownianMotions[traj][currentStep] + dW;
        allBrownianMotions[traj].push(newB);

        const scope = {
            t: timePoints[currentStep],
            B_t: allBrownianMotions[traj][currentStep],
            pi: Math.PI,
            e: Math.E
        };
        const integrandF = compiledFunctionF.evaluate(scope);
        const integrandG = compiledFunctionG.evaluate(scope);
        const newIntegral = allIntegrals[traj][currentStep] + integrandF * dW + integrandG * dt;
        allIntegrals[traj].push(newIntegral);
    }

    currentStep++;
    updatePlots();
}

function setupPlots() {
    const brownianTraces = allBrownianMotions.map((_, i) => ({
        x: [timePoints[0]],
        y: [0],
        mode: 'lines',
        name: `Brownian Motion ${i + 1}`,
        opacity: 0.5
    }));

    const integralTraces = allIntegrals.map((_, i) => ({
        x: [timePoints[0]],
        y: [0],
        mode: 'lines',
        name: `Stochastic Integral ${i + 1}`,
        opacity: 0.5
    }));

    const layout = {
        title: 'Brownian Motion and Stochastic Integral',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Value' },
        showlegend: true
    };

    Plotly.newPlot('trajectoryPlot', [...brownianTraces, ...integralTraces], layout);
}

function updatePlots() {
    const update = {
        x: allBrownianMotions.map(bm => [timePoints[currentStep]]),
        y: allBrownianMotions.map(bm => [bm[currentStep]])
    };

    const integralUpdate = {
        x: allIntegrals.map(integral => [timePoints[currentStep]]),
        y: allIntegrals.map(integral => [integral[currentStep]])
    };

    Plotly.extendTraces('trajectoryPlot', update, Array.from(Array(allBrownianMotions.length).keys()));
    Plotly.extendTraces('trajectoryPlot', integralUpdate, Array.from(Array(allIntegrals.length).keys()).map(i => i + allBrownianMotions.length));
}

function plotTrajectories() {
    const brownianTraces = allBrownianMotions.map((bm, i) => ({
        x: timePoints,
        y: bm,
        mode: 'lines',
        name: `Brownian Motion ${i + 1}`,
        opacity: 0.5
    }));

    const integralTraces = allIntegrals.map((integral, i) => ({
        x: timePoints,
        y: integral,
        mode: 'lines',
        name: `Stochastic Integral ${i + 1}`,
        opacity: 0.5
    }));

    const layout = {
        title: 'Brownian Motion and Stochastic Integral',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Value' },
        showlegend: true
    };

    Plotly.newPlot('trajectoryPlot', [...brownianTraces, ...integralTraces], layout);
}

function finalizeSimulation() {
    finalValues = allIntegrals.map(integral => integral[integral.length - 1]);
    const numBins = parseInt(document.getElementById('numBins').value);
    plotHistogram(finalValues, 'Distribution of Final Integral Values', 'Value', 'Frequency', 'histogramPlot', numBins);

    const mean = finalValues.reduce((a, b) => a + b) / finalValues.length;
    const stdDev = Math.sqrt(finalValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / finalValues.length);
    document.getElementById('integralResult').textContent = `Mean final value: ${mean.toFixed(4)}, Standard Deviation: ${stdDev.toFixed(4)}`;
}

function normalRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function plotHistogram(data, title, xaxis, yaxis, plotId, numBins) {
    const trace = {
        x: data,
        type: 'histogram',
        nbinsx: numBins
    };

    const layout = {
        title: title,
        xaxis: { title: xaxis },
        yaxis: { title: yaxis }
    };

    Plotly.newPlot(plotId, [trace], layout);
}

// Update animation speed when slider changes
document.getElementById('animationSpeed').onchange = function () {
    document.getElementById('speedValue').textContent = this.value;
    if (isSimulationRunning) {
        updateAnimationInterval();
    }
};

// Update animation speed when slider changes
document.getElementById('animationSpeed').onchange = updateAnimationInterval;
```
