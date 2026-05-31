// angular_momentum.js
// 3D spherical visualization of azimuthal-angular uncertainty.
// Two modes: Gaussian wavepacket (shows uncertainty) and pure orbital (eigenstate).
// Depends on: three.js, angular_physics.js

const ang = {
  scene: null, camera: null, renderer: null, controls: null, pointsMesh: null,
  nTheta: 120, nPhi: 240,
  thetaGrid: [], phiGrid: [], dtheta: 0, dphi: 0,
  positions: [], thetaIdx: [], phiIdx: [], totalPoints: 0
};

// Texture for soft point rendering
function makeCircleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.arc(16, 16, 14, 0, 2 * Math.PI);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

let _texture = null;
function getTexture() {
  if (!_texture) _texture = makeCircleTexture();
  return _texture;
}

// Build a Three.js point cloud from psi values
function buildPointCloud(psiValues, maxProb, threshold) {
  const visible = psiValues.reduce((acc, p, idx) => {
    if ((p.re * p.re + p.im * p.im) / maxProb >= threshold) acc.push(idx);
    return acc;
  }, []);
  if (!visible.length) return null;

  const n = visible.length;
  const verts = new Float32Array(n * 3);
  const cols  = new Float32Array(n * 3);
  const sizes = new Float32Array(n);

  for (let k = 0; k < n; k++) {
    const idx  = visible[k];
    const pos  = ang.positions[idx];
    const prob = psiValues[idx].re * psiValues[idx].re + psiValues[idx].im * psiValues[idx].im;
    const t    = prob / maxProb;
    const rs   = 1.0 + 1.5 * Math.sqrt(t);

    verts[k*3]   = pos.x * rs;
    verts[k*3+1] = pos.y * rs;
    verts[k*3+2] = pos.z * rs;

    cols[k*3]   = 0.2 * t;
    cols[k*3+1] = 0.4 + 0.6 * t;
    cols[k*3+2] = 0.8 + 0.2 * t;

    sizes[k] = 0.02 + t * 0.06;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(cols,  3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { pointTexture: { value: getTexture() } },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * (300.0 / -mvPosition.z), 3.0, 18.0);
        gl_Position = projectionMatrix * mvPosition;
      }`,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      void main() {
        vec4 tex = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, tex.a * 0.9);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return new THREE.Points(geo, mat);
}

// Compute PSI values for current mode and parameters
function computePsi(l, mode, m0, deltaM, m_int) {
  const { totalPoints, thetaIdx, phiIdx, thetaGrid, phiGrid } = ang;
  const psi = new Array(totalPoints);
  let maxProb = 0;

  if (mode === 'packet') {
    const coeffs = gaussianMPacket(l, m0, deltaM);
    for (let idx = 0; idx < totalPoints; idx++) {
      const theta = thetaGrid[thetaIdx[idx]];
      const phi   = phiGrid[phiIdx[idx]];
      let re = 0, im = 0;
      for (let m = -l; m <= l; m++) {
        const c = coeffs[m + l];
        const y = sphericalHarmonic(l, m, theta, phi);
        re += c.re * y.re - c.im * y.im;
        im += c.re * y.im + c.im * y.re;
      }
      psi[idx] = { re, im };
      const p = re*re + im*im;
      if (p > maxProb) maxProb = p;
    }
    return { psi, maxProb, coeffs, mode: 'packet' };
  } else {
    for (let idx = 0; idx < totalPoints; idx++) {
      const val = realSphericalHarmonic(l, m_int, thetaGrid[thetaIdx[idx]], phiGrid[phiIdx[idx]]);
      psi[idx] = { re: val, im: 0 };
      if (val * val > maxProb) maxProb = val * val;
    }
    return { psi, maxProb, coeffs: null, mode: 'real' };
  }
}

// Update the 3D visualization
function updateVisualization(params) {
  if (!ang.scene) return;
  const { l, mode, m0, deltaM, m_int, threshold, ui } = params;

  const { psi, maxProb, coeffs } = computePsi(l, mode, m0, deltaM, m_int);
  if (maxProb < 1e-8) return;

  if (ang.pointsMesh) ang.scene.remove(ang.pointsMesh);
  const cloud = buildPointCloud(psi, maxProb, threshold);
  if (cloud) { ang.pointsMesh = cloud; ang.scene.add(cloud); }

  // Uncertainty readout
  if (mode === 'packet' && coeffs) {
    const psi2D = Array.from({ length: ang.nTheta }, () => new Array(ang.nPhi));
    for (let idx = 0; idx < ang.totalPoints; idx++) {
      psi2D[ang.thetaIdx[idx]][ang.phiIdx[idx]] = psi[idx];
    }
    const { deltaPhi } = marginalPhiAndUncertainty(psi2D, ang.thetaGrid, ang.phiGrid, ang.dtheta, ang.dphi);

    let meanM = 0, meanM2 = 0;
    for (let m = -l; m <= l; m++) {
      const c = coeffs[m + l];
      const p = c.re*c.re + c.im*c.im;
      meanM  += m * p;
      meanM2 += m * m * p;
    }
    const deltaM_calc = Math.sqrt(Math.max(0, meanM2 - meanM * meanM));
    const product     = deltaM_calc * deltaPhi;

    ui.deltaMdisp.textContent   = deltaM_calc.toFixed(4);
    ui.deltaPhiDisp.textContent = deltaPhi.toFixed(4);
    ui.productDisp.textContent  = product.toFixed(4);
    ui.productDisp.style.color  = product >= 0.499 ? 'green' : 'red';
  } else {
    ui.deltaMdisp.textContent   = 'N/A';
    ui.deltaPhiDisp.textContent = 'N/A';
    ui.productDisp.textContent  = 'Eigenstate (no uncertainty)';
    ui.productDisp.style.color  = 'gray';
  }
}

// Three.js init
function initThreeJS(container, canvas, autoRotateToggle, axesToggle) {
  const w = container.clientWidth;
  const h = container.clientHeight;

  ang.scene    = new THREE.Scene();
  ang.scene.background = new THREE.Color(0x050510);

  ang.camera   = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  ang.camera.position.set(4.5, 3.5, 4.5);
  ang.camera.lookAt(0, 0, 0);

  ang.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  ang.renderer.setSize(w, h);
  ang.renderer.setPixelRatio(window.devicePixelRatio);

  ang.controls = new THREE.OrbitControls(ang.camera, ang.renderer.domElement);
  ang.controls.enableDamping  = true;
  ang.controls.dampingFactor  = 0.05;
  ang.controls.autoRotate     = true;
  ang.controls.autoRotateSpeed = 1.2;

  ang.scene.add(new THREE.AmbientLight(0x222222));

  const axes = new THREE.AxesHelper(1.5);
  axes.visible = false;
  ang.scene.add(axes);

  axesToggle.addEventListener('change', () => { axes.visible = axesToggle.checked; });

  (function animate() {
    ang.controls.autoRotate = autoRotateToggle.checked;
    ang.controls.update();
    ang.renderer.render(ang.scene, ang.camera);
    requestAnimationFrame(animate);
  })();

  window.addEventListener('resize', () => {
    const nw = container.clientWidth, nh = container.clientHeight;
    ang.camera.aspect = nw / nh;
    ang.camera.updateProjectionMatrix();
    ang.renderer.setSize(nw, nh);
  });
}

// --- Entry point ---
window.addEventListener('pageRevealed', () => {
  const lSlider         = document.getElementById('lSlider');
  const lValue          = document.getElementById('lValue');
  const modeSelect      = document.getElementById('orbitalMode');
  const packetGroup     = document.getElementById('packetControls');
  const realGroup       = document.getElementById('realControls');
  const m0Slider        = document.getElementById('m0Slider');
  const m0Value         = document.getElementById('m0Value');
  const deltaMSlider    = document.getElementById('deltaMSlider');
  const deltaMValue     = document.getElementById('deltaMValue');
  const mIntSlider      = document.getElementById('mIntSlider');
  const mIntValue       = document.getElementById('mIntValue');
  const thresholdSlider = document.getElementById('thresholdSlider');
  const thresholdValue  = document.getElementById('thresholdValue');
  const autoRotateToggle = document.getElementById('autoRotateToggle');
  const axesToggle      = document.getElementById('axesToggle');

  const ui = {
    deltaMdisp:   document.getElementById('deltaMdisp'),
    deltaPhiDisp: document.getElementById('deltaPhiDisp'),
    productDisp:  document.getElementById('productDisp')
  };

  // Build sphere grids
  ang.dtheta = Math.PI / ang.nTheta;
  ang.dphi   = 2 * Math.PI / ang.nPhi;
  ang.thetaGrid = Array.from({ length: ang.nTheta }, (_, i) => Math.PI * (i + 0.5) / ang.nTheta);
  ang.phiGrid   = Array.from({ length: ang.nPhi },   (_, i) => 2 * Math.PI * i / ang.nPhi);

  for (let i = 0; i < ang.nTheta; i++) {
    const sinT = Math.sin(ang.thetaGrid[i]);
    const cosT = Math.cos(ang.thetaGrid[i]);
    for (let j = 0; j < ang.nPhi; j++) {
      ang.positions.push(new THREE.Vector3(
        sinT * Math.cos(ang.phiGrid[j]),
        sinT * Math.sin(ang.phiGrid[j]),
        cosT
      ));
      ang.thetaIdx.push(i);
      ang.phiIdx.push(j);
    }
  }
  ang.totalPoints = ang.positions.length;

  initThreeJS(
    document.getElementById('third_sim'),
    document.getElementById('threeCanvas'),
    autoRotateToggle,
    axesToggle
  );

  function update() {
    const l    = parseInt(lSlider.value);
    const mode = modeSelect.value;
    let m0     = parseFloat(m0Slider.value);
    let m_int  = parseInt(mIntSlider.value);

    // Clamp m values to +-l
    if (m0 > l)    { m0 = l;    m0Slider.value = l;    m0Value.textContent = l; }
    if (m0 < -l)   { m0 = -l;   m0Slider.value = -l;   m0Value.textContent = -l; }
    if (m_int > l) { m_int = l;  mIntSlider.value = l;  mIntValue.textContent = l; }
    if (m_int < -l){ m_int = -l; mIntSlider.value = -l; mIntValue.textContent = -l; }

    updateVisualization({
      l, mode, m0, deltaM: parseFloat(deltaMSlider.value),
      m_int, threshold: parseFloat(thresholdSlider.value), ui
    });
  }

  function toggleMode() {
    const isPacket = modeSelect.value === 'packet';
    packetGroup.style.display = isPacket ? 'flex' : 'none';
    realGroup.style.display   = isPacket ? 'none' : 'flex';
    update();
  }

  lSlider.addEventListener('input', () => { lValue.textContent = lSlider.value; update(); });
  m0Slider.addEventListener('input', () => { m0Value.textContent = parseFloat(m0Slider.value).toFixed(1); update(); });
  deltaMSlider.addEventListener('input', () => { deltaMValue.textContent = parseFloat(deltaMSlider.value).toFixed(2); update(); });
  mIntSlider.addEventListener('input', () => { mIntValue.textContent = mIntSlider.value; update(); });
  thresholdSlider.addEventListener('input', () => { thresholdValue.textContent = parseFloat(thresholdSlider.value).toFixed(2); update(); });
  modeSelect.addEventListener('change', toggleMode);

  toggleMode();
});
