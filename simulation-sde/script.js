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