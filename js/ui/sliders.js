// sliders.js
// Custom range slider system with power-law mapping.
// Replaces native range inputs with a visually custom track + tooltip system.
// All slider registrations are at the bottom of this file.

window.addEventListener('DOMContentLoaded', () => {

  // Cache native descriptors before we override them
  const nativeVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const nativeMin = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'min');
  const nativeMax = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'max');

  /**
   * @param {string}  containerId  - id of the .control wrapper element
   * @param {number}  min          - logical minimum value
   * @param {number}  max          - logical maximum value
   * @param {number}  initial      - initial logical value
   * @param {string}  valueSpanId  - id of the <span> to display current value
   * @param {boolean} [isInt]      - snap to nearest integer
   * @param {number}  [exp]        - power-law exponent (1 = linear, >1 = fine at low end)
   */
  function setupSlider(containerId, min, max, initial, valueSpanId, isInt = false, exp = 1.0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const input     = container.querySelector('input[type="range"]');
    const track     = container.querySelector('.control__track');
    const tooltip   = container.querySelector('.tooltip');
    const valueSpan = document.getElementById(valueSpanId);
    if (!input) return;

    // Store config on the element itself
    input._qMin = min;
    input._qMax = max;
    input._isInt = isInt;
    input._exp   = exp;

    // Logical value -> track percentage
    const toPercent = (val) => {
      if (max <= min) return 50;
      const norm = (val - min) / (max - min);
      return Math.pow(Math.max(0, Math.min(1, norm)), 1 / exp) * 100;
    };

    // Track percentage -> logical value
    const fromPercent = (pct) => {
      const norm = pct / 100;
      let val = min + Math.pow(norm, exp) * (max - min);
      if (isInt) val = Math.round(val);
      return Math.max(min, Math.min(max, val));
    };

    const initialPct = toPercent(initial);
    nativeMin.set.call(input, '0');
    nativeMax.set.call(input, '100');
    nativeVal.set.call(input, initialPct.toString());

    // Override value property for logical get/set
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() {
        const val = fromPercent(parseFloat(nativeVal.get.call(this)));
        return isInt ? Math.round(val).toString() : val.toFixed(2);
      },
      set(newVal) {
        let v = parseFloat(newVal);
        if (isNaN(v)) return;
        v = Math.max(min, Math.min(max, v));
        nativeVal.set.call(this, toPercent(v).toString());
        render(toPercent(v));
      }
    });

    Object.defineProperty(input, 'min', {
      configurable: true,
      get() { return this._qMin; },
      set(v) { this._qMin = parseFloat(v); }
    });

    Object.defineProperty(input, 'max', {
      configurable: true,
      get() { return this._qMax; },
      set(v) { this._qMax = parseFloat(v); }
    });

    // Update CSS custom property + tooltip + value span
    function render(pct) {
      container.style.setProperty('--value', pct);

      const noSnap = tooltip && tooltip.classList.contains('tooltip--no-snap');
      const shift  = (noSnap || pct <= 42 || pct >= 58) ? 0 : 1;
      track   && track.style.setProperty('--shift', shift);
      tooltip && tooltip.style.setProperty('--shift', shift);

      if (valueSpan) valueSpan.textContent = input.value;

      if (tooltip && tooltip.classList.contains('tooltip--simple')) {
        const v = parseFloat(input.value);
        tooltip.dataset.float = isInt ? v.toString() : v.toFixed(2);
      }
    }

    function handleInput() {
      let pct = parseFloat(nativeVal.get.call(input));
      if (isNaN(pct)) pct = initialPct;

      if (isInt) {
        const snapped = fromPercent(pct);
        pct = toPercent(snapped);
        nativeVal.set.call(input, pct.toString());
      }

      render(pct);
    }

    input.addEventListener('input',       handleInput);
    input.addEventListener('pointerdown', handleInput);
    render(initialPct);
  }

  // --- Slider registrations ---

  // Position-Momentum
  setupSlider('control-sigma', 0.5,  5.0,  2.0, 'sigmaValue');
  setupSlider('control-k0',   -10.0, 10.0, 5.0, 'k0Value');

  // Energy-Time
  setupSlider('control-sigma2', 0.5,  5.0,  2.0, 'sigma2Value');
  setupSlider('control-k02',   -10.0, 10.0, 5.0, 'k02Value');
  setupSlider('control-time',   0.0,  70.0, 0.0, 'timeValue');

  // Azimuthal-Angular
  setupSlider('control-l',         0,    20,  0,   'lValue',      true);
  setupSlider('control-m0',       -10.0, 10.0, 0.0,'m0Value');
  setupSlider('control-deltaM',    0.2,   3.0, 0.5, 'deltaMValue');
  setupSlider('control-threshold', 0.0,   1.0, 0.02,'thresholdValue', false, 2.0);
  setupSlider('control-mInt',     -20,   20,   0,   'mIntValue',   true);
});
