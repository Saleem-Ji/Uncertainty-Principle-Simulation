// wavepacket.js
// Gaussian wavepacket math + FFT for position-momentum and energy-time sims.
// This is the shared math layer. Other sim files depend on functions here.
//
// DO NOT MESS WITH IT IF YOU DON'T KNOW WHAT YOU'RE DOING

function gaussianWavepacket(N, dx, x_0, sigma, k_0) {
  const x = new Array(N)
  const re = new Array(N)
  const im = new Array(N)
  const fftInput = new Float64Array(2 * N)

  const A = Math.pow(2 * Math.PI * sigma * sigma, -0.25)

  for (let i = 0; i < N; i++) {
    x[i] = i * dx

    const envelope = A * Math.exp(-Math.pow(x[i] - x_0, 2) / (4 * sigma * sigma))

    re[i] = envelope * Math.cos(k_0 * x[i])
    im[i] = envelope * Math.sin(k_0 * x[i])

    fftInput[2 * i] = re[i]
    fftInput[2 * i + 1] = im[i]
  }

  return { x, re, im, fftInput}
}

// Radix-2 FFT for power-of-two N
function fftSelfContained(re, im) {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  for (let i = 0, j = 0; i < n; i++) {
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Butterfly computations
  for (let len = 2; len <= n; len <<= 1) {
    let ang = 2 * Math.PI / len;
    let wlen_re = Math.cos(ang);
    let wlen_im = -Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let w_re = 1, w_im = 0;
      for (let j = 0; j < len / 2; j++) {
        let u_re = re[i + j], u_im = im[i + j];
        let v_re = re[i + j + len / 2] * w_re - im[i + j + len / 2] * w_im;
        let v_im = re[i + j + len / 2] * w_im + im[i + j + len / 2] * w_re;
        re[i + j] = u_re + v_re;
        im[i + j] = u_im + v_im;
        re[i + j + len / 2] = u_re - v_re;
        im[i + j + len / 2] = u_im - v_im;
        let tmp_re = w_re * wlen_re - w_im * wlen_im;
        w_im = w_re * wlen_im + w_im * wlen_re;
        w_re = tmp_re;
      }
    }
  }
}

// Inverse FFT
function inversefft(re, im) {
  const n = re.length;
  if (n <= 1) return;

  for (let i = 0, j = 0; i < n; i++) {
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let len = 2; len <= n; len <<= 1) {
    let ang = 2 * Math.PI / len;
    let wlen_re = Math.cos(ang);
    let wlen_im = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let w_re = 1, w_im = 0;
      for (let j = 0; j < len / 2; j++) {
        let u_re = re[i + j], u_im = im[i + j];
        let v_re = re[i + j + len / 2] * w_re - im[i + j + len / 2] * w_im;
        let v_im = re[i + j + len / 2] * w_im + im[i + j + len / 2] * w_re;
        re[i + j] = u_re + v_re;
        im[i + j] = u_im + v_im;
        re[i + j + len / 2] = u_re - v_re;
        im[i + j + len / 2] = u_im - v_im;
        let tmp_re = w_re * wlen_re - w_im * wlen_im;
        w_im = w_re * wlen_im + w_im * wlen_re;
        w_re = tmp_re;
      }
    }
  }

  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] /= n;
  }
}

// Compute momentum-space probability density from a wavepacket
function computeMomentumSpace(wave, N, dx) {
  let re = [...wave.re];
  let im = [...wave.im];

  fftSelfContained(re, im);

  const dk = (2 * Math.PI) / (N * dx);
  const k = new Array(N);
  const magnitude = new Array(N);

  for (let i = 0; i < N; i++) {
    magnitude[i] = (re[i] * re[i] + im[i] * im[i]) * (dx / (2 * Math.PI));

    const freq = i < N / 2 ? i : i - N;
    k[i] = freq * dk;
  }

  // Shift to center k=0 for Plotly
  const halfN = N / 2;
  const kShifted = [...k.slice(halfN), ...k.slice(0, halfN)];
  const magShifted = [...magnitude.slice(halfN), ...magnitude.slice(0, halfN)];

  return { k: kShifted, magnitude: magShifted };
}

// Time evolution of a wavepacket (free particle Schrodinger)
function evolveWavefunction(initialWave, t, N, dx) {
  let re = [...initialWave.re];
  let im = [...initialWave.im];

  fftSelfContained(re, im);

  const dk = (2 * Math.PI) / (N * dx);

  for (let i = 0; i < N; i++){
    const freq = i < N/2 ? i : i - N;
    const k = freq * dk;

    // Propagator: exp(-i * (k^2/2) * t)
    const phase = -0.5 * k * k * t;
    const cosphi = Math.cos(phase);
    const sinphi = Math.sin(phase);

    const old_re = re[i];
    const old_im = im[i];
    re[i] = old_re * cosphi - old_im * sinphi;
    im[i] = old_re * sinphi + old_im * cosphi;
  }

  inversefft(re, im);

  return {x: initialWave.x, re: re, im: im};
}

// Compute probability density and position statistics
function computeProbDensityAndExpectations(re, im, x, dx) {
  const N = re.length;
  const prob = new Array(N);
  let norm = 0;
  let meanX = 0;
  let meanX2 = 0;

  for (let i = 0; i < N; i++) {
    const p = re[i]*re[i] + im[i]*im[i];
    prob[i] = p;
    norm += p * dx;
    meanX += x[i] * p * dx;
    meanX2 += x[i] * x[i] * p * dx;
  }

  meanX /= norm;
  meanX2 /= norm;
  const deltaX = Math.sqrt(Math.max(0, meanX2 - meanX*meanX));

  return { probDensity: prob, meanX: meanX, meanX2: meanX2, deltaX: deltaX, norm: norm };
}

// Energy spread from wavepacket parameters (analytic)
function computeEnergySpreadFromWavepacket(sigma, k0) {
  const dk = 1 / (2 * sigma);
  const meanE = (k0*k0 + dk*dk) / 2;
  const meanE2 = (k0*k0*k0*k0 + 6*k0*k0*dk*dk + 3*dk*dk*dk*dk) / 4;
  const deltaE = Math.sqrt(Math.max(0, meanE2 - meanE*meanE));
  return deltaE;
}

// Mandelstam-Tamm uncertainty product
function computeMandelstamTammProduct(deltaE, deltaX, k0) {
  if (Math.abs(k0) < 1e-8) return Infinity;
  return deltaE * deltaX / Math.abs(k0);
}

// Spreading time product (characteristic time for wavepacket to double in width)
function computeSpreadingTimeProduct(sigma, k0) {
  const deltaE = computeEnergySpreadFromWavepacket(sigma, k0);
  const t_double = 2 * Math.sqrt(3) * sigma * sigma;
  return deltaE * t_double;
}
