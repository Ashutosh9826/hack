(function() {
  'use strict';

  window.CyberEngine = window.CyberEngine || {};

  CyberEngine.EventBus = {
    _listeners: {},
    on(event, cb) {
      (this._listeners[event] = this._listeners[event] || []).push(cb);
    },
    off(event, cb) {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(f => f !== cb);
      }
    },
    emit(event, data) {
      (this._listeners[event] || []).forEach(cb => {
        try { cb(data); } catch(e) { console.error(`EventBus error in '${event}':`, e); }
      });
    }
  };

  CyberEngine.state = {
    building: { floors: [], devices: new Map(), connections: [] },
    users: new Map(),
    events: [],
    logs: [],
    notifications: [],
    simulation: { running: false, frozen: false, speed: 1, tick: 0 },
    selectedUser: null,
    selectedDevice: null,
    threatScore: 0,
    attackActive: false,
    attacker: null
  };

  document.addEventListener('DOMContentLoaded', function() {
    console.log('🛡️ Spatial Cyber Threat Reconstruction Engine initializing...');

    if (CyberEngine.Building) CyberEngine.Building.init();
    if (CyberEngine.Users) CyberEngine.Users.init();
    if (CyberEngine.Logs) CyberEngine.Logs.init();
    if (CyberEngine.Notifications) CyberEngine.Notifications.init();
    if (CyberEngine.Graph) CyberEngine.Graph.init();
    if (CyberEngine.Correlation) CyberEngine.Correlation.init();
    if (CyberEngine.Timeline) CyberEngine.Timeline.init();

    const btnSimulate = document.getElementById('btn-simulate');
    if (btnSimulate) {
        btnSimulate.addEventListener('click', function() {
          if (CyberEngine.state.simulation.running) {
            CyberEngine.Simulation.stop();
          } else {
            CyberEngine.Simulation.start();
          }
        });
    }

    const btnAttack = document.getElementById('btn-attack');
    if (btnAttack) {
        btnAttack.addEventListener('click', function() {
          CyberEngine.Simulation.triggerAttack();
        });
    }

    const btnFreeze = document.getElementById('btn-freeze');
    if (btnFreeze) {
        btnFreeze.addEventListener('click', function() {
          if (CyberEngine.state.simulation.frozen) {
            CyberEngine.Simulation.unfreeze();
          } else {
            CyberEngine.Simulation.freeze();
          }
        });
    }

    if (CyberEngine.Simulation) CyberEngine.Simulation.init();

    console.log('✅ SCTRE initialized successfully');
  });

})();
