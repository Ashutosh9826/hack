window.CyberEngine = window.CyberEngine || {};

CyberEngine.Simulation = (function() {
  'use strict';

  let intervalId = null;

  function init() {
    // Initialization done in app.js after dom content loaded
  }

  function start() {
    const Users = CyberEngine.Users;
    if (Users && Users.createUser) {
        Users.createUser('Alice Chen', 'Network Admin', '#3b82f6');
        Users.createUser('Bob Martinez', 'Plant Operator', '#10b981');
        Users.createUser('Carol Singh', 'Security Analyst', '#8b5cf6');
        Users.createUser('Dave Wilson', 'Field Technician', '#f97316');
        Users.createUser('Eve Johnson', 'IT Support', '#06b6d4');
        Users.createUser('Frank Kim', 'Process Engineer', '#ec4899');
    }

    CyberEngine.state.simulation.running = true;
    CyberEngine.EventBus.emit('simulation:start');

    const btnSimulate = document.getElementById('btn-simulate');
    if (btnSimulate) {
        btnSimulate.innerText = 'Stop Simulation';
        btnSimulate.classList.add('btn-active');
    }

    intervalId = setInterval(() => {
        if (CyberEngine.state.simulation.frozen) return;
        CyberEngine.state.simulation.tick++;

        const activeUsers = CyberEngine.Users.getAllUsers ? CyberEngine.Users.getAllUsers().filter(u => !u.isBlocked) : [];
        const allDevices = CyberEngine.Building.getAllDevices ? CyberEngine.Building.getAllDevices() : [];

        activeUsers.forEach(user => {
            if (Math.random() < 0.4) {
                // Determine action
                const rand = Math.random();
                if (rand < 0.6) {
                   // Access device in zone
                   const zoneDevices = allDevices.filter(d => getAllowedZone(user.role).includes(d.zone || ''));
                   if (zoneDevices.length > 0) {
                       const target = zoneDevices[Math.floor(Math.random() * zoneDevices.length)];
                       simulateAccess(user, target, 'ACCESS');
                   }
                } else if (rand < 0.8) {
                    // Stay (do nothing)
                } else if (rand < 0.95) {
                    // Cross zone
                    const otherDevices = allDevices.filter(d => !getAllowedZone(user.role).includes(d.zone || ''));
                    if (otherDevices.length > 0) {
                        const target = otherDevices[Math.floor(Math.random() * otherDevices.length)];
                        simulateAccess(user, target, 'CROSS_ZONE_ACCESS');
                    }
                } else {
                    // Logout/Login fresh
                    user.accessedDevices = [];
                    user.currentDevice = null;
                }
            }
        });

        CyberEngine.EventBus.emit('simulation:tick');

        if (CyberEngine.state.simulation.tick % 3 === 0 && CyberEngine.Users.renderUserList) {
            CyberEngine.Users.renderUserList();
        }

    }, 2000 / (CyberEngine.state.simulation.speed || 1));
  }

  function getAllowedZone(role) {
      if (role === 'Network Admin') return ['enterprise'];
      if (role === 'Plant Operator') return ['operations'];
      if (role === 'Security Analyst') return ['dmz'];
      if (role === 'Field Technician') return ['field'];
      if (role === 'IT Support') return ['enterprise', 'operations'];
      if (role === 'Process Engineer') return ['operations', 'field'];
      return [];
  }

  function simulateAccess(user, device, action) {
      if (device.status === 'disabled' || device.status === 'isolated' || device.status === 'compromised') {
          return; // Skip access if device is offline or already compromised by an attacker
      }

      if (CyberEngine.Users.recordAccess) {
          CyberEngine.Users.recordAccess(user.id, device.id, action);
      }
      device.status = 'active';
      
      if (device.currentUser && device.currentUser.id !== user.id) {
         // Free previous user from this device if needed, but simple simulation here
      }
      device.currentUser = user;

      if (user.currentDevice) {
         const prevDevice = CyberEngine.Building.getDevice ? CyberEngine.Building.getDevice(user.currentDevice) : null;
         if (prevDevice && prevDevice.currentUser && prevDevice.currentUser.id === user.id) {
             prevDevice.currentUser = null;
             prevDevice.status = 'idle';
             CyberEngine.Graph.updateNodeColor(prevDevice.id, '#4b5563');
         }
      }

      user.currentDevice = device.id;
      
      if (CyberEngine.Graph.updateNodeColor) {
          CyberEngine.Graph.updateNodeColor(device.id, user.color);
      }
      if (CyberEngine.Logs && CyberEngine.Logs.addLog) {
          CyberEngine.Logs.addLog({
              timestamp: new Date(),
              userId: user.id,
              deviceId: device.id,
              action: action
          });
      }
      if (CyberEngine.Timeline && CyberEngine.Timeline.addEvent) {
          CyberEngine.Timeline.addEvent({
              timestamp: new Date(),
              type: 'normal',
              userId: user.id,
              userColor: user.color,
              deviceId: device.id,
              action: action
          });
      }
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
    CyberEngine.state.simulation.running = false;
    CyberEngine.EventBus.emit('simulation:stop');

    const btnSimulate = document.getElementById('btn-simulate');
    if (btnSimulate) {
        btnSimulate.innerText = 'Start Simulation';
        btnSimulate.classList.remove('btn-active');
    }

    const allDevices = CyberEngine.Building.getAllDevices ? CyberEngine.Building.getAllDevices() : [];
    allDevices.forEach(d => {
        d.status = 'idle';
        d.currentUser = null;
    });

    CyberEngine.state.users.clear();
    
    if (CyberEngine.Users.renderUserList) CyberEngine.Users.renderUserList();
    
    if (CyberEngine.Graph.cy) {
        CyberEngine.Graph.cy.elements().removeClass('faded highlighted warning-badge attack-edge compromised');
        CyberEngine.Graph.cy.nodes('[!isParent]').data('color', '#4b5563').style('background-color', '#4b5563');
    }
  }

  function freeze() {
    CyberEngine.state.simulation.frozen = true;
    CyberEngine.EventBus.emit('simulation:freeze');
    const btn = document.getElementById('btn-freeze');
    if (btn) {
        btn.innerText = 'Unfreeze';
        btn.classList.add('btn-active');
    }
  }

  function unfreeze() {
    CyberEngine.state.simulation.frozen = false;
    CyberEngine.EventBus.emit('simulation:unfreeze');
    const btn = document.getElementById('btn-freeze');
    if (btn) {
        btn.innerText = 'Freeze System';
        btn.classList.remove('btn-active');
    }
  }

  function triggerAttack() {
      if (!CyberEngine.state.simulation.running) {
          if (CyberEngine.Notifications && CyberEngine.Notifications.showToast) {
              CyberEngine.Notifications.showToast('warning', 'Warning', 'Start simulation first');
          }
          return;
      }
      if (CyberEngine.state.attackActive) {
          if (CyberEngine.Notifications && CyberEngine.Notifications.showToast) {
              CyberEngine.Notifications.showToast('warning', 'Warning', 'Attack already in progress');
          }
          return;
      }

      let attacker = null;
      if (CyberEngine.Users && CyberEngine.Users.createUser) {
          attacker = CyberEngine.Users.createUser('Shadow Agent', 'Intruder', '#ef4444');
          attacker.isSuspicious = true;
      } else {
          return;
      }

      CyberEngine.state.attackActive = true;
      CyberEngine.state.attacker = attacker;
      attacker.compromisedDevices = new Set();

      const btnAttack = document.getElementById('btn-attack');
      if (btnAttack) btnAttack.classList.add('btn-active');

      if (CyberEngine.Users.renderUserList) {
          CyberEngine.Users.renderUserList();
      }

      CyberEngine.EventBus.emit('attack:start', { attacker });

      const attackSequence = [
          { device: 'ent-lap-01', action: 'PHISHING_COMPROMISE' },
          { device: 'ent-ad-01', action: 'CREDENTIAL_HARVEST' },
          { device: 'ent-sw-01', action: 'LATERAL_MOVE' },
          { device: 'dmz-fw-01', action: 'FIREWALL_BYPASS' },
          { device: 'dmz-jump-01', action: 'PRIVILEGE_ESCALATION' },
          { device: 'ops-sw-01', action: 'LATERAL_MOVE' },
          { device: 'ops-ft-01', action: 'LATERAL_MOVE' },
          { device: 'ops-eng-01', action: 'CONFIG_CHANGE' },
          { device: 'fld-sw-01', action: 'LATERAL_MOVE' },
          { device: 'fld-plc-01', action: 'DATA_EXFIL' }
      ];

      let delay = 0;
      attackSequence.forEach((step, index) => {
          setTimeout(() => {
              // If this isn't the first step, verify the attacker successfully compromised the previous step
              if (index > 0) {
                  const prevStep = attackSequence[index - 1];
                  if (!attacker.compromisedDevices.has(prevStep.device)) {
                      return; // Path broken, cannot proceed
                  }
              }

              const targetDevice = CyberEngine.Building.getDevice ? CyberEngine.Building.getDevice(step.device) : null;
              
              // Check if TARGET device is isolated/disabled
              if (targetDevice && (targetDevice.status === 'disabled' || targetDevice.status === 'isolated')) {
                  if (CyberEngine.Notifications && CyberEngine.Notifications.showToast) {
                      CyberEngine.Notifications.showToast('info', 'Attack Halted', `Attack failed to cross into ${targetDevice.name}`);
                  }
                  return; // Cannot compromise this device
              }

              // Success - mark compromised and update attacker's current location
              attacker.compromisedDevices.add(step.device);
              attacker.currentDevice = step.device;
              if (targetDevice) {
                  targetDevice.currentUser = attacker;
              }

              if (CyberEngine.Users.recordAccess) {
                  CyberEngine.Users.recordAccess(attacker.id, step.device, step.action);
              }
              if (CyberEngine.Building.updateDeviceStatus) {
                  CyberEngine.Building.updateDeviceStatus(step.device, 'compromised');
              }
              if (CyberEngine.Graph.updateNodeColor) {
                  CyberEngine.Graph.updateNodeColor(step.device, '#ef4444');
              }
              if (CyberEngine.Graph.addWarningBadge) {
                  CyberEngine.Graph.addWarningBadge(step.device);
              }
              
              if (CyberEngine.Logs && CyberEngine.Logs.addLog) {
                  CyberEngine.Logs.addLog({
                      timestamp: new Date(),
                      userId: attacker.id,
                      deviceId: step.device,
                      action: step.action,
                      status: 'suspicious'
                  });
              }

              CyberEngine.EventBus.emit('attack:step', { attacker, device: step.device, step: index + 1, action: step.action });

              if (CyberEngine.Correlation && CyberEngine.Correlation.processEvent) {
                  CyberEngine.Correlation.processEvent({
                      type: 'attack',
                      userId: attacker.id,
                      deviceId: step.device,
                      action: step.action,
                      timestamp: new Date(),
                      floor: targetDevice ? targetDevice.floor : 0,
                      zone: targetDevice ? targetDevice.zone : ''
                  });
              }

              if (CyberEngine.Timeline && CyberEngine.Timeline.addEvent) {
                  CyberEngine.Timeline.addEvent({
                      timestamp: new Date(),
                      type: 'attack',
                      userId: attacker.id,
                      userColor: attacker.color,
                      deviceId: step.device,
                      action: step.action
                  });
              }

              if (index === attackSequence.length - 1) {
                  CyberEngine.EventBus.emit('attack:detected', { path: attackSequence.map(s => s.device) });
              }

          }, delay);
          delay += (2000 + Math.random() * 1000);
      });
  }

  function isRunning() {
      return CyberEngine.state.simulation.running;
  }

  function isFrozen() {
      return CyberEngine.state.simulation.frozen;
  }

  return {
    init,
    start,
    stop,
    freeze,
    unfreeze,
    triggerAttack,
    isRunning,
    isFrozen
  };
})();
