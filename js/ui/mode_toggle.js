// mode_toggle.js
// Simple radio button toggle that switches between Gaussian packet
// and pure orbital modes for the azimuthal-angular sim.

window.addEventListener('pageRevealed', () => {
  const radioPacket    = document.getElementById('option1');
  const radioReal      = document.getElementById('option2');
  const hiddenSelect   = document.getElementById('orbitalMode');
  const packetControls = document.getElementById('packetControls');
  const realControls   = document.getElementById('realControls');

  function syncMode() {
    const isPacket = radioPacket.checked;
    hiddenSelect.value = isPacket ? 'packet' : 'real';
    packetControls.style.display = isPacket ? 'flex' : 'none';
    realControls.style.display   = isPacket ? 'none'  : 'flex';
    hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  radioPacket.addEventListener('change', syncMode);
  radioReal.addEventListener('change', syncMode);
  syncMode();
});
