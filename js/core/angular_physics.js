// angular_physics.js
// Core math for angular momentum uncertainty: spherical harmonics,
// Legendre polynomials, Gaussian wavepackets on the sphere.
// Used by the 3D azimuthal-angular visualization.

// Associated Legendre polynomial P_l^m(x) for |m| <= l
function associatedLegendre(l, m, x) {
  if (m < 0) {
    const absm = -m;
    const factor = Math.pow(-1, absm) * factorial(l - absm) / factorial(l + absm);
    return factor * associatedLegendre(l, absm, x);
  }

  let pmm = 1.0;
  if (m > 0) {
    const somx2 = Math.sqrt((1.0 - x) * (1.0 + x));
    let fact = 1.0;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2.0;
    }
  }
  if (l === m) return pmm;

  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;

  for (let ll = m + 2; ll <= l; ll++) {
    const pll = (x * (2 * ll - 1) * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pmmp1;
}

function factorial(n) {
  if (n <= 1) return 1;
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

// Spherical harmonic Y_l^m(theta, phi) -> {re, im}
function sphericalHarmonic(l, m, theta, phi) {
  const norm = Math.sqrt((2 * l + 1) / (4 * Math.PI) * factorial(l - Math.abs(m)) / factorial(l + Math.abs(m)));
  const leg = associatedLegendre(l, Math.abs(m), Math.cos(theta));
  let prefactor = norm * leg;
  if (m < 0 && m % 2 !== 0) prefactor = -prefactor;
  const cosPhi = Math.cos(m * phi);
  const sinPhi = Math.sin(m * phi);
  return { re: prefactor * cosPhi, im: prefactor * sinPhi };
}

// Real spherical harmonic (for pure orbital mode)
function realSphericalHarmonic(l, m, theta, phi) {
  const absM = Math.abs(m);
  const norm = Math.sqrt(
    (2 - (m === 0 ? 1 : 0)) *
    (2 * l + 1) / (4 * Math.PI) *
    factorial(l - absM) / factorial(l + absM)
  );
  const leg = associatedLegendre(l, absM, Math.cos(theta));

  if (m > 0) {
    return norm * leg * Math.cos(absM * phi);
  } else if (m < 0) {
    return norm * leg * Math.sin(absM * phi);
  } else {
    return norm * leg;
  }
}

// Gaussian wavepacket in m-space (superposition of spherical harmonics)
function gaussianMPacket(l, m0, deltaM) {
  const coeffs = new Array(2 * l + 1);
  let norm = 0;
  for (let m = -l; m <= l; m++) {
    const exponent = -Math.pow(m - m0, 2) / (4 * deltaM * deltaM);
    const amplitude = Math.exp(exponent);
    coeffs[m + l] = { re: amplitude, im: 0 };
    norm += amplitude * amplitude;
  }
  const invNorm = 1 / Math.sqrt(norm);
  for (let i = 0; i < coeffs.length; i++) {
    coeffs[i].re *= invNorm;
    coeffs[i].im *= invNorm;
  }
  return coeffs;
}

// Compute wavefunction on a theta-phi grid
function computeWavefunctionOnSphere(l, coeffs, thetaGrid, phiGrid) {
  const nTheta = thetaGrid.length;
  const nPhi = phiGrid.length;
  const psi = Array(nTheta);
  for (let i = 0; i < nTheta; i++) {
    psi[i] = Array(nPhi);
    const theta = thetaGrid[i];
    for (let j = 0; j < nPhi; j++) {
      const phi = phiGrid[j];
      let sumRe = 0, sumIm = 0;
      for (let m = -l; m <= l; m++) {
        const c = coeffs[m + l];
        const y = sphericalHarmonic(l, m, theta, phi);
        sumRe += c.re * y.re - c.im * y.im;
        sumIm += c.re * y.im + c.im * y.re;
      }
      psi[i][j] = { re: sumRe, im: sumIm };
    }
  }
  return psi;
}

// Integrate over theta to get marginal phi distribution
function marginalPhiAndUncertainty(psi, thetaGrid, phiGrid, dtheta, dphi) {
  const nTheta = thetaGrid.length;
  const nPhi = phiGrid.length;
  const probPhi = new Array(nPhi).fill(0);

  for (let j = 0; j < nPhi; j++) {
    let sum = 0;
    for (let i = 0; i < nTheta; i++) {
      const p = psi[i][j].re * psi[i][j].re + psi[i][j].im * psi[i][j].im;
      const sinTheta = Math.sin(thetaGrid[i]);
      sum += p * sinTheta * dtheta;
    }
    probPhi[j] = sum;
  }

  let total = probPhi.reduce((a,b) => a + b * dphi, 0);
  for (let j = 0; j < nPhi; j++) probPhi[j] /= total;

  // Circular statistics
  let sumCos = 0, sumSin = 0;
  for (let j = 0; j < nPhi; j++) {
    sumCos += Math.cos(phiGrid[j]) * probPhi[j] * dphi;
    sumSin += Math.sin(phiGrid[j]) * probPhi[j] * dphi;
  }
  const meanPhi = Math.atan2(sumSin, sumCos);
  const R = Math.hypot(sumCos, sumSin);
  const deltaPhi = Math.sqrt(-2 * Math.log(R));

  return { deltaPhi, meanPhi, probPhi };
}

// Full uncertainty product calculation
function computeAngularUncertaintyProduct(l, coeffs, nTheta = 30, nPhi = 60) {
  const thetaGrid = Array.from({ length: nTheta }, (_, i) => Math.PI * (i + 0.5) / nTheta);
  const phiGrid = Array.from({ length: nPhi }, (_, i) => 2 * Math.PI * i / nPhi);
  const dtheta = Math.PI / nTheta;
  const dphi = 2 * Math.PI / nPhi;

  const psi = computeWavefunctionOnSphere(l, coeffs, thetaGrid, phiGrid);
  const { deltaPhi } = marginalPhiAndUncertainty(psi, thetaGrid, phiGrid, dtheta, dphi);

  let meanM = 0, meanM2 = 0;
  for (let m = -l; m <= l; m++) {
    const prob = coeffs[m + l].re * coeffs[m + l].re + coeffs[m + l].im * coeffs[m + l].im;
    meanM += m * prob;
    meanM2 += m * m * prob;
  }
  const deltaM = Math.sqrt(Math.max(0, meanM2 - meanM * meanM));
  const product = deltaM * deltaPhi;

  return { deltaM, deltaPhi, product, meanM };
}

// Quick test helper
function testAngularUncertainty(l, m0, deltaM) {
  const coeffs = gaussianMPacket(l, m0, deltaM);
  const result = computeAngularUncertaintyProduct(l, coeffs);
  console.log(`l=${l}, m0=${m0}, Dm=${deltaM.toFixed(3)} -> Dphi=${result.deltaPhi.toFixed(3)}, product=${result.product.toFixed(3)}`);
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sphericalHarmonic, gaussianMPacket, computeAngularUncertaintyProduct, testAngularUncertainty };
}
