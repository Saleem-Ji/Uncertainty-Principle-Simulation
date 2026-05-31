// energy_time.js
// Energy-Time uncertainty with wavepacket spreading.
// Two Plotly charts: position density at time t, and Mandelstam-Tamm product curve.
// Depends on: wavepacket.js

window.addEventListener('pageRevealed', () => {
  const sigma2Slider = document.getElementById('sigma2Slider');
  const k02Slider    = document.getElementById('k02Slider');
  const timeSlider   = document.getElementById('timeSlider');

  const deltaESpan          = document.getElementById('deltaEValue');
  const currentDeltaXSpan   = document.getElementById('currentDeltaX');
  const mtProductSpan       = document.getElementById('mtProductValue');
  const spreadingProductSpan = document.getElementById('spreadingProductValue');

  // Compute DE*Dt curve across a range of times
  function buildProductCurve(initialWave, sigma, k0, tMax, nPts) {
    const deltaE = computeEnergySpreadFromWavepacket(sigma, k0);
    const times = [], products = [];
    for (let i = 0; i <= nPts; i++) {
      const t = (i / nPts) * tMax;
      const evolved = evolveWavefunction(initialWave, t, N, dx);
      const { deltaX } = computeProbDensityAndExpectations(evolved.re, evolved.im, evolved.x, dx);
      times.push(t);
      products.push(computeMandelstamTammProduct(deltaE, deltaX, k0));
    }
    return { times, products };
  }

  function updateEnergyTimePlot() {
    const sigma = parseFloat(sigma2Slider.value);
    const k0    = parseFloat(k02Slider.value);
    const t     = parseFloat(timeSlider.value);

    const initialWave = gaussianWavepacket(N, dx, x0, sigma, k0);
    const waveT       = evolveWavefunction(initialWave, t, N, dx);

    const { probDensity, deltaX, meanX } = computeProbDensityAndExpectations(
      waveT.re, waveT.im, waveT.x, dx
    );

    const deltaE           = computeEnergySpreadFromWavepacket(sigma, k0);
    const mtProduct        = computeMandelstamTammProduct(deltaE, deltaX, k0);
    const spreadingProduct = computeSpreadingTimeProduct(sigma, k0);

    // Update info bar
    deltaESpan.textContent           = deltaE.toFixed(4);
    currentDeltaXSpan.textContent    = deltaX.toFixed(4);
    mtProductSpan.textContent        = mtProduct.toFixed(4);
    spreadingProductSpan.textContent = spreadingProduct.toFixed(4);

    // Plot 1: position density at time t
    const maxProb  = Math.max(...probDensity);
    const normProb = probDensity.map(p => p / maxProb);

    const xLo = [], xHi = [], yShade = [];
    for (let i = 0; i < N; i++) {
      if (waveT.x[i] >= meanX - deltaX && waveT.x[i] <= meanX + deltaX) {
        xLo.push(waveT.x[i]);
        xHi.unshift(waveT.x[i]);
        yShade.push(normProb[i]);
      }
    }

    Plotly.react('second_plot', [
      { x: [...xLo, ...xHi], y: [...yShade, ...yShade.map(() => 0)],
        fill: 'toself', fillcolor: 'rgba(99,153,219,0.25)', line: { width: 0 },
        type: 'scatter', mode: 'none', name: '+-DX region', hoverinfo: 'skip' },
      { x: waveT.x, y: normProb, type: 'scatter', mode: 'lines',
        name: `|psi(x, t=${t.toFixed(2)})|^2`, line: { color: 'steelblue', width: 2 } },
      { x: [meanX, meanX], y: [0, 1.05], type: 'scatter', mode: 'lines',
        name: `<x> = ${meanX.toFixed(2)}`, line: { color: 'steelblue', dash: 'dash', width: 1.5 } }
    ], {
      title: { text: `Wavepacket spreading at t = ${t.toFixed(2)}<br><sup>The packet widens over time -- DX grows, but DE stays fixed</sup>`, font: { size: 14 } },
      xaxis: { title: 'Position x' },
      yaxis: { title: 'Probability density (normalised)', range: [0, 1.15] },
      annotations: [{ x: meanX + deltaX, y: 0.85, xref: 'x', yref: 'y',
        text: `DX(t) = ${deltaX.toFixed(2)}`, showarrow: true, arrowhead: 2, ax: 45, ay: -20,
        font: { color: 'steelblue', size: 12 } }],
      legend: { orientation: 'h', y: -0.2 }
    }, { responsive: true });

    // Plot 2: Mandelstam-Tamm product vs time
    const tMax = 5 * (2 * Math.sqrt(3) * sigma * sigma);
    const { times, products } = buildProductCurve(initialWave, sigma, k0, tMax, 200);
    const boundOk = mtProduct >= 0.495;

    Plotly.react('third_plot', [
      { x: times, y: products, type: 'scatter', mode: 'lines',
        name: 'DE*Dt (= DE*DX/v)', line: { color: 'steelblue', width: 2 } },
      { x: [t], y: [mtProduct], type: 'scatter', mode: 'markers',
        marker: { color: 'red', size: 10, symbol: 'circle' }, name: `Current t = ${t.toFixed(2)}` },
      { x: [Math.min(...times), Math.max(...times)], y: [0.5, 0.5], type: 'scatter', mode: 'lines',
        line: { color: 'black', dash: 'dash', width: 1.5 }, name: 'Quantum limit hbar/2 = 0.5' }
    ], {
      title: { text: 'Energy-Time Uncertainty: Mandelstamm-Tamm product<br><sup>DE*Dt >= hbar/2. Here Dt = DX / v_group, v_group = k0</sup>', font: { size: 14 } },
      xaxis: { title: 'Time t' },
      yaxis: { title: 'DE*Dt  =  DE*DX / k0', rangemode: 'tozero' },
      annotations: [
        { x: 0.5, y: 0.56, xref: 'paper', yref: 'y',
          text: 'Quantum lower bound hbar/2 = 0.5', showarrow: false, font: { size: 11, color: '#555' } },
        { x: 0.5, y: 1.06, xref: 'paper', yref: 'paper',
          text: boundOk
            ? `<b>DE*Dt = ${mtProduct.toFixed(3)} >= 0.5  OK  Satisfied</b>`
            : `<b>DE*Dt = ${mtProduct.toFixed(3)}  (Numerical Limit)</b>`,
          showarrow: false, font: { size: 12, color: boundOk ? 'green' : 'orange' } }
      ],
      legend: { orientation: 'h', y: -0.2 },
      margin: { t: 90 }
    }, { responsive: true });
  }

  // Reset time to 0 when packet parameters change
  sigma2Slider.addEventListener('input', () => {
    timeSlider.value = '0';
    updateEnergyTimePlot();
  });

  k02Slider.addEventListener('input', () => {
    timeSlider.value = '0';
    updateEnergyTimePlot();
  });

  timeSlider.addEventListener('input', updateEnergyTimePlot);

  updateEnergyTimePlot();
});
