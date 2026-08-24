window.CyberEngine = window.CyberEngine || {};

CyberEngine.Timeline = (function() {
  'use strict';

  const state = {
      canvas: null,
      ctx: null,
      events: []
  };

  function init() {
      state.canvas = document.getElementById('timeline-canvas');
      if (state.canvas) {
          state.ctx = state.canvas.getContext('2d');
          resize();
          window.addEventListener('resize', resize);
          CyberEngine.EventBus.on('simulation:tick', render);
      }
  }

  function resize() {
      const container = document.getElementById('timeline-container');
      if (container && state.canvas) {
          state.canvas.width = container.clientWidth;
          state.canvas.height = container.clientHeight;
          render();
      }
  }

  function addEvent(event) {
      state.events.push(event);
      if (state.events.length > 150) {
          state.events.shift(); // keep max 150 for display
      }
      render();
  }

  function render() {
      if (!state.ctx || !state.canvas) return;
      const ctx = state.ctx;
      const width = state.canvas.width;
      const height = state.canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      // Draw Zone separators
      const bandHeight = height / 4;
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;

      for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * bandHeight);
          ctx.lineTo(width, i * bandHeight);
          ctx.stroke();
      }

      // Draw Floor labels
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px Arial';
      const labels = ['F3', 'F2', 'F1', 'F0'];
      for (let i = 0; i < 4; i++) {
          ctx.fillText(labels[i], 10, i * bandHeight + bandHeight / 2 + 4);
      }

      // Draw Time axis (bottom)
      ctx.beginPath();
      ctx.moveTo(0, height - 10);
      ctx.lineTo(width, height - 10);
      ctx.stroke();

      // Events
      const maxEvents = 100;
      const displayEvents = state.events.slice(-maxEvents);
      const startX = 40;
      const endX = width - 20;
      const spacingX = displayEvents.length > 1 ? (endX - startX) / (maxEvents - 1) : 0;

      let prevAttackPos = null;

      displayEvents.forEach((ev, idx) => {
          const device = CyberEngine.Building.getDevice ? CyberEngine.Building.getDevice(ev.deviceId) : null;
          let floor = device ? device.floor : 0;

          // Map floor 3->band 0, 2->band 1, 1->band 2, 0->band 3
          let bandIdx = 3 - floor;
          let y = bandIdx * bandHeight + bandHeight / 2;
          
          // Add some jitter for overlapping events
          y += (idx % 3) * 6 - 6;

          // Position items correctly regardless of maxEvents if fewer exist
          let x = startX + idx * spacingX;
          if (displayEvents.length < maxEvents && displayEvents.length > 1) {
             x = startX + idx * ((endX - startX) / (displayEvents.length - 1));
          } else if (displayEvents.length === 1) {
             x = startX;
          }

          if (ev.type === 'attack') {
              if (prevAttackPos) {
                  ctx.beginPath();
                  ctx.moveTo(prevAttackPos.x, prevAttackPos.y);
                  ctx.lineTo(x, y);
                  ctx.strokeStyle = '#ef4444';
                  ctx.lineWidth = 2;
                  ctx.stroke();
              }
              prevAttackPos = { x, y };

              // Draw glow
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(x, y, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0; // reset
          } else if (ev.type === 'warning') {
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
          } else {
              ctx.fillStyle = ev.userColor || '#9ca3af';
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
          }
      });

      // Now marker
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(endX + 10, height - 10, 4, 0, Math.PI * 2);
      ctx.fill();
  }

  function clear() {
      state.events = [];
      render();
  }

  return {
    init,
    addEvent,
    render,
    clear,
    get canvas() { return state.canvas; },
    get ctx() { return state.ctx; },
    get events() { return state.events; }
  };
})();
