window.CyberEngine = window.CyberEngine || {};

CyberEngine.Correlation = (function() {
  'use strict';

  const state = {
      events: [],
      threats: [],
      attackPath: [],
      threatScore: 0,
      threatLevel: 'low',
      reasons: []
  };

  function init() {
      // Setup listener if needed, mostly called from Simulation
  }

  function processEvent(event) {
      state.events.push(event);

      const user = CyberEngine.Users.getUser ? CyberEngine.Users.getUser(event.userId) : null;
      if (user && user.isSuspicious) {
          state.attackPath.push({
              deviceId: event.deviceId,
              timestamp: event.timestamp,
              action: event.action,
              floor: event.floor,
              zone: event.zone
          });

          evaluateRules();
          updateUI();
          CyberEngine.EventBus.emit('threat:update', { score: state.threatScore, level: state.threatLevel, reasons: state.reasons });
      }
  }

  function evaluateRules() {
      state.threatScore = 0;
      state.reasons = [];

      const path = state.attackPath;
      if (path.length === 0) return;

      const zones = new Set(path.map(p => p.zone));

      // Rule 1: Multi-zone traversal
      if (zones.size >= 3) {
          state.threatScore += 20;
          if (!state.reasons.includes('Multi-zone traversal')) state.reasons.push('Multi-zone traversal');
      }

      // Rule 2: Rapid lateral movement
      if (path.length >= 3) {
          const recent = path.slice(-3);
          const timeDiff = recent[2].timestamp.getTime() - recent[0].timestamp.getTime();
          if (timeDiff < 15000) { // 15 seconds
              state.threatScore += 25;
              if (!state.reasons.includes('Rapid lateral movement')) state.reasons.push('Rapid lateral movement');
          }
      }

      // Rule 3: Critical infrastructure access
      const criticalAccess = path.some(p => {
          const device = CyberEngine.Building.getDevice ? CyberEngine.Building.getDevice(p.deviceId) : null;
          return device && (device.type === 'plc' || device.type === 'firewall' || device.id === 'ent-ad-01');
      });
      if (criticalAccess) {
          state.threatScore += 15;
          if (!state.reasons.includes('Critical infrastructure access')) state.reasons.push('Critical infrastructure access');
      }

      // Rule 4: Enterprise-to-field penetration
      if (zones.has('enterprise') && zones.has('field')) {
          state.threatScore += 25;
          if (!state.reasons.includes('Enterprise-to-field penetration')) state.reasons.push('Enterprise-to-field penetration');
      }

      // Rule 5: Privilege escalation pattern
      const actions = path.map(p => p.action);
      if (actions.includes('CREDENTIAL_HARVEST') && actions.includes('PRIVILEGE_ESCALATION')) {
          state.threatScore += 30;
          if (!state.reasons.includes('Privilege escalation pattern')) state.reasons.push('Privilege escalation pattern');
      }

      if (state.threatScore > 100) state.threatScore = 100;

      if (state.threatScore < 25) state.threatLevel = 'low';
      else if (state.threatScore < 50) state.threatLevel = 'medium';
      else if (state.threatScore < 75) state.threatLevel = 'high';
      else state.threatLevel = 'critical';

      CyberEngine.state.threatScore = state.threatScore;
  }

  function updateUI() {
      const fill = document.getElementById('threat-fill');
      const scoreTxt = document.getElementById('threat-score');
      if (fill) {
          fill.style.width = `${Math.min(state.threatScore, 100)}%`;
          fill.style.backgroundColor = getLevelColor(state.threatLevel);
      }
      if (scoreTxt) {
          scoreTxt.innerText = `${Math.min(state.threatScore, 100)} / 100`;
      }
  }

  function getLevelColor(level) {
      if (level === 'low') return '#10b981';
      if (level === 'medium') return '#f59e0b';
      if (level === 'high') return '#f97316';
      return '#ef4444';
  }

  function calculateThreatScore() {
      evaluateRules();
      updateUI();
  }

  function getAttackPath() {
      return state.attackPath;
  }

  function getThreatDetails() {
      let duration = 0;
      let start = null;
      let end = null;
      if (state.attackPath.length > 0) {
          start = state.attackPath[0].timestamp;
          end = state.attackPath[state.attackPath.length - 1].timestamp;
          duration = Math.round((end.getTime() - start.getTime()) / 1000);
      }
      return {
          score: state.threatScore,
          level: state.threatLevel,
          reasons: state.reasons,
          attackPath: state.attackPath,
          zonesTraversed: Array.from(new Set(state.attackPath.map(p => p.zone))),
          criticalDevicesAccessed: state.attackPath.filter(p => {
              const d = CyberEngine.Building.getDevice ? CyberEngine.Building.getDevice(p.deviceId) : null;
              return d && (d.type === 'plc' || d.type === 'firewall');
          }).map(p => p.deviceId),
          timespan: { start, end, durationSeconds: duration }
      };
  }

  function resetThreats() {
      state.events = [];
      state.threats = [];
      state.attackPath = [];
      state.threatScore = 0;
      state.threatLevel = 'low';
      state.reasons = [];
      updateUI();
  }

  return {
    init,
    processEvent,
    calculateThreatScore,
    getAttackPath,
    getThreatDetails,
    resetThreats
  };
})();
