// position_momentum.js
// Position-Momentum uncertainty visualization.
// Uses Plotly to show |psi(x)|^2 and |phi(k)|^2 side by side,
// with shaded uncertainty regions and a Heisenberg bound check.
// Depends on: wavepacket.js

const PLOT_CONFIG = { responsive: true };
const N  = 512;
const dx = 0.1;
const x0 = N * dx / 2;  // center of position window

function updatePlot(sigma, k0) {
  const wave  = gaussianWavepacket(N, dx, x0, sigma, k0);
  const probX = wave.re.map((r, i) => r * r + wave.im[i] * wave.im[i]);
  const mom   = computeMomentumSpace(wave, N, dx);

  // Delta X - standard deviation of position
  let norm = 0, meanX = 0, meanX2 = 0;
  for (let i = 0; i < N; i++) {
    norm   += probX[i] * dx;
    meanX  += wave.x[i] * probX[i] * dx;
    meanX2 += wave.x[i] * wave.x[i] * probX[i] * dx;
  }
  meanX /= norm; meanX2 /= norm;
  const deltaX = Math.sqrt(Math.max(0, meanX2 - meanX * meanX));

  // Delta K - standard deviation of wave number
  const halfN = N / 2;
  const magUnshifted = [...mom.magnitude.slice(halfN), ...mom.magnitude.slice(0, halfN)];
  const dk_step = (2 * Math.PI) / (N * dx);
  let normK = 0, meanK = 0, meanK2 = 0;
  for (let i = 0; i < N; i++) {
    const kval = (i < N / 2 ? i : i - N) * dk_step;
    normK  += magUnshifted[i] * dk_step;
    meanK  += kval * magUnshifted[i] * dk_step;
    meanK2 += kval * kval * magUnshifted[i] * dk_step;
  }
  meanK /= normK; meanK2 /= normK;
  const deltaK  = Math.sqrt(Math.max(0, meanK2 - meanK * meanK));
  const product = deltaX * deltaK;

  // Normalize to unit peak for display
  const maxProbX = Math.max(...probX);
  const normProbX = probX.map(v => v / maxProbX);
  const maxMom    = Math.max(...mom.magnitude);
  const normMom   = mom.magnitude.map(v => v / maxMom);

  // Delta X shaded band
  const xLo = [], xHi = [], yShade = [];
  for (let i = 0; i < N; i++) {
    if (wave.x[i] >= meanX - deltaX && wave.x[i] <= meanX + deltaX) {
      xLo.push(wave.x[i]);
      xHi.unshift(wave.x[i]);
      yShade.push(normProbX[i]);
    }
  }
  const tracePosShade = {
    x: [...xLo, ...xHi],
    y: [...yShade, ...yShade.map(() => 0)],
    fill: 'toself', fillcolor: 'rgba(99,153,219,0.25)',
    line: { width: 0 }, type: 'scatter', mode: 'none',
    name: '+-DX region', hoverinfo: 'skip'
  };

  // Delta K shaded band
  const kShifted = mom.k;
  const kLo = [], kHi = [], kShade = [];
  for (let i = 0; i < N; i++) {
    if (kShifted[i] >= meanK - deltaK && kShifted[i] <= meanK + deltaK) {
      kLo.push(kShifted[i]);
      kHi.unshift(kShifted[i]);
      kShade.push(normMom[i]);
    }
  }
  const traceMomShade = {
    x: [...kLo, ...kHi],
    y: [...kShade, ...kShade.map(() => 0)],
    fill: 'toself', fillcolor: 'rgba(230,130,80,0.25)',
    line: { width: 0 }, type: 'scatter', mode: 'none',
    xaxis: 'x2', yaxis: 'y2', name: '+-DK region', hoverinfo: 'skip'
  };

  const boundOk    = product >= 0.499;
  const boundLabel = boundOk ? 'Satisfied' : 'Below Limit';

  const layout = {
    title: { text: 'Position and Momentum Probability Densities', font: { size: 16 } },
    grid: { rows: 1, columns: 2, pattern: 'independent' },
    xaxis:  { title: 'Position x' },
    yaxis:  { title: 'Probability density (normalised)', range: [0, 1.15] },
    xaxis2: { title: 'Wave number k' },
    yaxis2: { title: 'Probability density (normalised)', range: [0, 1.15] },
    annotations: [
      { x: meanX + deltaX, y: 0.85, xref: 'x', yref: 'y',
        text: `DX = ${deltaX.toFixed(2)}`, showarrow: true, arrowhead: 2, ax: 40, ay: -20,
        font: { color: 'steelblue', size: 12 } },
      { x: meanK + deltaK, y: 0.85, xref: 'x2', yref: 'y2',
        text: `DK = ${deltaK.toFixed(2)}`, showarrow: true, arrowhead: 2, ax: 40, ay: -20,
        font: { color: 'darkorange', size: 12 } },
      { x: 0.5, y: 1.08, xref: 'paper', yref: 'paper',
        text: `<b>${boundLabel}</b>  (Heisenberg: DX*DK >= 1/2)`,
        showarrow: false, font: { size: 13, color: boundOk ? 'green' : 'red' }, align: 'center' }
    ],
    legend: { orientation: 'h', y: -0.18 },
    margin: { t: 80 }
  };

  Plotly.react('first_plot', [
    tracePosShade,
    { x: wave.x, y: normProbX, type: 'scatter', mode: 'lines',
      name: '|psi(x)|^2', line: { color: 'steelblue', width: 2 } },
    { x: [meanX, meanX], y: [0, 1.05], type: 'scatter', mode: 'lines',
      name: `<x> = ${meanX.toFixed(2)}`, line: { color: 'steelblue', dash: 'dash', width: 1.5 } },
    traceMomShade,
    { x: kShifted, y: normMom, xaxis: 'x2', yaxis: 'y2', type: 'scatter', mode: 'lines',
      name: '|phi(k)|^2', line: { color: 'darkorange', width: 2 } },
    { x: [meanK, meanK], y: [0, 1.05], xaxis: 'x2', yaxis: 'y2', type: 'scatter', mode: 'lines',
      name: `<k> = ${meanK.toFixed(2)}`, line: { color: 'darkorange', dash: 'dash', width: 1.5 } }
  ], layout, PLOT_CONFIG);
}

// Initialize after page reveal (so the Plotly container is visible)
window.addEventListener('pageRevealed', () => {
  const sigmaSlider = document.getElementById('sigmaSlider');
  const k0Slider    = document.getElementById('k0Slider');

  const redraw = () => updatePlot(parseFloat(sigmaSlider.value), parseFloat(k0Slider.value));

  sigmaSlider.addEventListener('input', redraw);
  k0Slider.addEventListener('input', redraw);

  updatePlot(2.0, 5.0);
});
