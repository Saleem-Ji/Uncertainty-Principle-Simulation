// discovery_microscope.js
// Heisenberg microscope thought experiment as a 3D Three.js scene.
// Shows how photon wavelength and lens aperture affect position
// uncertainty (cyan cloud) and momentum uncertainty (orange cone).

window.addEventListener('pageRevealed', () => {
  const container     = document.getElementById('disc_canvas_container');
  const canvas        = document.getElementById('discCanvas');
  const previewCanvas = document.getElementById('wavePreviewCanvas');
  if (!container || !canvas || !previewCanvas) return;

  const previewCtx = previewCanvas.getContext('2d');

  // --- Three.js setup ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 3, 22);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.maxPolarAngle = Math.PI / 1.5;
  controls.minPolarAngle = Math.PI / 4;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
  gridHelper.position.y = -5;
  scene.add(gridHelper);

  // --- Scene objects ---

  // Electron core sphere
  const electronGeo = new THREE.SphereGeometry(0.4, 32, 32);
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.2,
    transparent: true, opacity: 1.0
  });
  const electron = new THREE.Mesh(electronGeo, electronMat);
  scene.add(electron);

  // Probability cloud (particle system)
  const CLOUD_N = 350;
  const cloudBuf = {
    pos:     new Float32Array(CLOUD_N * 3),
    base:    new Float32Array(CLOUD_N * 3),
    phases:  new Float32Array(CLOUD_N * 3),
    opacity: new Float32Array(CLOUD_N)
  };

  for (let i = 0; i < CLOUD_N; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = Math.cbrt(Math.random());
    cloudBuf.base[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    cloudBuf.base[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    cloudBuf.base[i*3+2] = r * Math.cos(phi);
    cloudBuf.phases[i*3]   = Math.random() * Math.PI * 2;
    cloudBuf.phases[i*3+1] = Math.random() * Math.PI * 2;
    cloudBuf.phases[i*3+2] = Math.random() * Math.PI * 2;
  }

  const cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudBuf.pos, 3));
  cloudGeo.setAttribute('aOpacity', new THREE.BufferAttribute(cloudBuf.opacity, 1));

  const cloudMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float aOpacity;
      varying   float vOpacity;
      void main() {
        vOpacity = aOpacity;
        vec4 mv  = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(18.0 * (8.0 / -mv.z), 2.0, 22.0);
        gl_Position  = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vOpacity;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.05, d) * vOpacity;
        vec3  col = mix(vec3(0.05, 0.9, 1.0), vec3(0.0, 0.3, 0.8), d * d);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false
  });

  const electronCloud = new THREE.Points(cloudGeo, cloudMat);
  scene.add(electronCloud);

  // Knockback cone (momentum uncertainty)
  const coneGeo = new THREE.ConeGeometry(1, 8, 32);
  coneGeo.rotateZ(-Math.PI / 2);
  coneGeo.translate(4, 0, 0);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xff8c00, transparent: true, opacity: 0.08,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const recoilCone = new THREE.Mesh(coneGeo, coneMat);
  scene.add(recoilCone);

  // Microscope lens
  const lensGeo = new THREE.CylinderGeometry(1, 1, 0.4, 32);
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0xaaccff, transmission: 0.9, opacity: 1, transparent: true, roughness: 0.1, ior: 1.5
  });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.y = 7;
  scene.add(lens);

  // Photon wave line
  const wavePoints = 200;
  const wavePositions = new Float32Array(wavePoints * 3);
  const waveGeo = new THREE.BufferGeometry();
  waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));
  const waveMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3, transparent: true, opacity: 0 });
  const photonWave = new THREE.Line(waveGeo, waveMat);
  scene.add(photonWave);

  // Collision sparkles
  const flashGeo = new THREE.BufferGeometry();
  const flashPositions = new Float32Array(40 * 3);
  flashGeo.setAttribute('position', new THREE.BufferAttribute(flashPositions, 3));
  const flashMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.5, transparent: true, blending: THREE.AdditiveBlending
  });
  const flashParticles = new THREE.Points(flashGeo, flashMat);
  flashParticles.visible = false;
  scene.add(flashParticles);

  // --- DOM refs ---
  const DOM = {
    lambdaSlider:  document.getElementById('disc_lambdaSlider'),
    alphaSlider:   document.getElementById('disc_alphaSlider'),
    lambdaValueEl: document.getElementById('disc_lambdaValue'),
    alphaValueEl:  document.getElementById('disc_alphaValue'),
    dxVal:         document.getElementById('disc_dx_val'),
    dpVal:         document.getElementById('disc_dp_val'),
    btnFire:       document.getElementById('disc_fire_btn')
  };

  const apertureLineTop = document.getElementById('disc_apertureLineTop');
  const apertureLineBot = document.getElementById('disc_apertureLineBot');

  // --- Physics state ---
  let lambda = 500, alpha = 35;
  let targetDx = 1, targetDp = 1, targetLensRadius = 1;
  let waveColor = new THREE.Color();
  let waveFreq = 1, animationSpeed = 0.015;
  let currentDxScale = 1, currentDpScale = 1, currentLensRadius = 1;
  let currentHue = 180;

  function mapRange(val, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * Math.max(0, Math.min(1, (val - inMin) / (inMax - inMin)));
  }

  // --- 2D waveform preview (retro CRT look) ---
  function drawWaveformPreview(hue, frequency, timeOffset) {
    const w = previewCanvas.width;
    const h = previewCanvas.height;

    previewCtx.fillStyle = '#000811';
    previewCtx.fillRect(0, 0, w, h);

    // Grid lines
    previewCtx.save();
    previewCtx.strokeStyle = 'rgba(0, 255, 255, 0.07)';
    previewCtx.lineWidth = 1;
    previewCtx.beginPath();
    previewCtx.moveTo(0, h / 2);
    previewCtx.lineTo(w, h / 2);
    previewCtx.stroke();
    for (let x = 0; x < w; x += 60) {
      previewCtx.beginPath();
      previewCtx.moveTo(x, 0);
      previewCtx.lineTo(x, h);
      previewCtx.stroke();
    }
    previewCtx.restore();

    const color = `hsl(${hue}, 100%, 60%)`;

    // Outer glow
    previewCtx.save();
    previewCtx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.25)`;
    previewCtx.lineWidth = 6;
    previewCtx.beginPath();
    for (let x = 0; x < w; x++) {
      const phase = (x * frequency * 0.055) - (timeOffset || 0);
      const y = (h / 2) + Math.sin(phase) * (h / 2.6);
      x === 0 ? previewCtx.moveTo(x, y) : previewCtx.lineTo(x, y);
    }
    previewCtx.stroke();
    previewCtx.restore();

    // Sharp wave
    previewCtx.save();
    previewCtx.shadowColor = color;
    previewCtx.shadowBlur = 8;
    previewCtx.strokeStyle = color;
    previewCtx.lineWidth = 2.5;
    previewCtx.lineJoin = 'round';
    previewCtx.beginPath();
    for (let x = 0; x < w; x++) {
      const phase = (x * frequency * 0.055) - (timeOffset || 0);
      const y = (h / 2) + Math.sin(phase) * (h / 2.6);
      x === 0 ? previewCtx.moveTo(x, y) : previewCtx.lineTo(x, y);
    }
    previewCtx.stroke();
    previewCtx.restore();

    // Top/bottom energy bars
    const grad = previewCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0,   `hsla(${hue},100%,60%,0)`);
    grad.addColorStop(0.3, `hsla(${hue},100%,60%,0.18)`);
    grad.addColorStop(0.7, `hsla(${hue},100%,60%,0.18)`);
    grad.addColorStop(1,   `hsla(${hue},100%,60%,0)`);
    previewCtx.fillStyle = grad;
    previewCtx.fillRect(0, 0, w, 2);
    previewCtx.fillRect(0, h - 2, w, 2);
  }

  // --- Aperture visualizer ---
  function updateApertureViz(alphaDeg) {
    if (!apertureLineTop || !apertureLineBot) return;
    const cx = 150, cy = 26, len = 130;
    const rad = alphaDeg * Math.PI / 180;
    const dx = len * Math.cos(0);
    const dy = len * Math.sin(rad);

    apertureLineTop.setAttribute('x1', cx);
    apertureLineTop.setAttribute('y1', cy);
    apertureLineTop.setAttribute('x2', cx + dx);
    apertureLineTop.setAttribute('y2', cy - dy);

    apertureLineBot.setAttribute('x1', cx);
    apertureLineBot.setAttribute('y1', cy);
    apertureLineBot.setAttribute('x2', cx + dx);
    apertureLineBot.setAttribute('y2', cy + dy);

    const t = (alphaDeg - 10) / 70;
    const r = Math.round(t * 220);
    const g = Math.round(200 + t * 55);
    const b = Math.round((1 - t) * 136);
    const col = `rgb(${r},${g},${b})`;
    apertureLineTop.setAttribute('stroke', col);
    apertureLineBot.setAttribute('stroke', col);
  }

  // --- Main physics + UI update ---
  function updatePhysics() {
    lambda = parseFloat(DOM.lambdaSlider.value);
    alpha  = parseFloat(DOM.alphaSlider.value);

    if (DOM.lambdaValueEl) DOM.lambdaValueEl.textContent = Math.round(lambda);
    if (DOM.alphaValueEl)  DOM.alphaValueEl.textContent  = Math.round(alpha);

    currentHue = mapRange(lambda, 300, 700, 270, 0);
    waveColor.setHSL(currentHue / 360, 1.0, 0.6);
    waveMat.color.copy(waveColor);
    flashMat.color.copy(waveColor);

    waveFreq       = mapRange(lambda, 300, 700, 6.5, 1.2);
    animationSpeed = mapRange(lambda, 300, 700, 0.032, 0.009);

    drawWaveformPreview(currentHue, waveFreq, 0);
    updateApertureViz(alpha);

    const lambdaFactor = lambda / 500;
    const sinAlpha = Math.sin(alpha * Math.PI / 180);

    const rawDx = lambdaFactor / sinAlpha;
    const rawDp = sinAlpha / lambdaFactor;

    targetDx = mapRange(rawDx, 0.6, 5.0, 0.8, 4.5);

    const spreadAngle = mapRange(rawDp, 0.2, 2.5, 5, 45) * (Math.PI / 180);
    targetDp = 8 * Math.tan(spreadAngle);

    targetLensRadius = 7 * Math.tan(alpha * Math.PI / 180);

    if (DOM.dxVal) DOM.dxVal.textContent = rawDx.toFixed(2);
    if (DOM.dpVal) DOM.dpVal.textContent = rawDp.toFixed(2);
  }

  DOM.lambdaSlider.addEventListener('input', updatePhysics);
  DOM.alphaSlider.addEventListener('input',  updatePhysics);

  // --- Firing animation ---
  let time = 0;
  let isFiring   = false;
  let firePhase  = 0;
  let scatterVector = new THREE.Vector3(1, 0, 0);

  DOM.btnFire.addEventListener('click', () => {
    if (isFiring) return;
    isFiring  = true;
    firePhase = 0;
    DOM.btnFire.disabled = true;

    const maxAngle   = Math.atan2(targetDp, 8);
    const randomTheta = (Math.random() - 0.5) * maxAngle * 1.5;
    const randomPhi   = (Math.random() - 0.5) * maxAngle * 1.5;

    scatterVector.set(
      Math.cos(randomTheta) * Math.cos(randomPhi),
      Math.sin(randomTheta),
      Math.sin(randomPhi)
    ).normalize();
  });

  // --- Render loop ---
  function renderAnimation() {
    requestAnimationFrame(renderAnimation);
    time += 0.05;
    controls.update();

    // Smooth slider targets
    currentDxScale    += (targetDx - currentDxScale) * 0.1;
    currentDpScale    += (targetDp - currentDpScale) * 0.1;
    currentLensRadius += (targetLensRadius - currentLensRadius) * 0.1;

    recoilCone.scale.set(1, currentDpScale, currentDpScale);
    lens.scale.set(currentLensRadius, 1, currentLensRadius);

    // Update probability cloud
    const spread      = currentDxScale;
    const tightness   = mapRange(spread, 0.8, 4.5, 1.0, 0.0);
    const jitterAmp   = mapRange(spread, 0.8, 4.5, 0.04, 0.55);

    electronMat.opacity = mapRange(spread, 0.8, 4.5, 1.0, 0.04);

    const posArr = cloudGeo.attributes.position.array;
    const opArr  = cloudGeo.attributes.aOpacity.array;

    for (let i = 0; i < CLOUD_N; i++) {
      const bx = cloudBuf.base[i*3];
      const by = cloudBuf.base[i*3+1];
      const bz = cloudBuf.base[i*3+2];
      const r  = Math.sqrt(bx*bx + by*by + bz*bz);

      const jx = Math.sin(time * 1.4 + cloudBuf.phases[i*3])   * jitterAmp;
      const jy = Math.sin(time * 1.8 + cloudBuf.phases[i*3+1]) * jitterAmp;
      const jz = Math.sin(time * 1.1 + cloudBuf.phases[i*3+2]) * jitterAmp;

      posArr[i*3]   = electron.position.x + bx * spread + jx;
      posArr[i*3+1] = electron.position.y + by * spread + jy;
      posArr[i*3+2] = electron.position.z + bz * spread + jz;

      const radialFade = Math.max(0, 1.0 - r * 0.7);
      opArr[i] = radialFade * mapRange(spread, 0.8, 4.5, 0.05, 0.55);
    }
    cloudGeo.attributes.position.needsUpdate = true;
    cloudGeo.attributes.aOpacity.needsUpdate = true;

    electronCloud.position.set(0, 0, 0);

    if (!isFiring) {
      drawWaveformPreview(currentHue, waveFreq, time * 6);
    }

    let waveHeadX = 0;

    if (isFiring) {
      firePhase += animationSpeed;

      if (firePhase < 0.5) {
        // Photon inbound
        waveMat.opacity = 1;
        waveHeadX = mapRange(firePhase, 0, 0.5, -20, 0);
      } else if (firePhase >= 0.5 && firePhase < 0.52) {
        // Collision flash
        flashParticles.visible = true;
        for (let i = 0; i < 40; i++) {
          flashPositions[i * 3]     = (Math.random() - 0.5) * 2.5;
          flashPositions[i * 3 + 1] = (Math.random() - 0.5) * 2.5;
          flashPositions[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
        }
        flashGeo.attributes.position.needsUpdate = true;
        recoilCone.material.opacity = 0.5;
        waveHeadX = 0;
      } else {
        // Electron scatters
        const scatterProgress = mapRange(firePhase, 0.5, 1.0, 0, 15);
        electron.position.copy(scatterVector).multiplyScalar(scatterProgress);

        flashMat.opacity = Math.max(0, 1.0 - (firePhase - 0.5) * 5);
        recoilCone.material.opacity = Math.max(0.08, 0.5 - (firePhase - 0.5) * 2);
        waveMat.opacity = 0;
      }

      if (firePhase >= 1) {
        isFiring = false;
        electron.position.set(0, 0, 0);
        flashParticles.visible = false;
        DOM.btnFire.disabled = false;
      }
    }

    // Draw 3D photon wave
    if (waveMat.opacity > 0) {
      const positions = waveGeo.attributes.position.array;
      for (let i = 0; i < wavePoints; i++) {
        const x = mapRange(i, 0, wavePoints - 1, -20, waveHeadX);
        const y = Math.sin((x * waveFreq) - (time * 10)) * 0.8;
        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;
      }
      waveGeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  updatePhysics();
  renderAnimation();
});
