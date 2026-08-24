window.CyberEngine = window.CyberEngine || {};

CyberEngine.Graph = (function() {
  'use strict';

  let cyInstance = null;

  function init() {
    const elements = [];
    const state = CyberEngine.state;

    if (!state.building) {
        console.warn("Building state not initialized for Graph.");
        return;
    }

    const floors = CyberEngine.Building.getFloors ? CyberEngine.Building.getFloors() : [
        { id: 3, name: 'Enterprise', color: '#3b82f6' },
        { id: 2, name: 'DMZ', color: '#10b981' },
        { id: 1, name: 'Operations', color: '#f59e0b' },
        { id: 0, name: 'Field', color: '#ef4444' }
    ];

    floors.forEach(floor => {
        elements.push({
            data: { id: `floor-${floor.id}`, label: floor.name, isParent: true, color: floor.color },
            classes: 'floor-node'
        });
    });

    const devices = CyberEngine.Building.getAllDevices ? CyberEngine.Building.getAllDevices() : [];
    devices.forEach(device => {
        let shape = 'rectangle';
        let icon = '💻';
        
        // Exact matches for the user's requested icons:
        if (device.type === 'internet') { shape = 'ellipse'; icon = '☁️'; }
        else if (device.type === 'firewall') { shape = 'rectangle'; icon = '🧱'; }
        else if (device.type === 'router' || device.type === 'switch') { shape = 'round-rectangle'; icon = '📶'; }
        else if (device.type === 'phone') { shape = 'round-rectangle'; icon = '📞'; }
        else if (device.type === 'printer') { shape = 'rectangle'; icon = '🖨️'; }
        else if (device.type === 'laptop') { shape = 'rectangle'; icon = '💻'; }
        else if (device.type === 'desktop') { shape = 'rectangle'; icon = '🖥️'; }
        
        // Others used in the rest of the factory:
        else if (device.type === 'server') { shape = 'round-rectangle'; icon = '🗄️'; }
        else if (device.type === 'plc') { shape = 'barrel'; icon = '⚙️'; }
        else if (device.type === 'camera') { shape = 'ellipse'; icon = '📷'; }

        elements.push({
            data: {
                id: device.id,
                parent: `floor-${device.floor}`,
                label: `${icon} ${device.name}`,
                color: '#4b5563', // default grey
                shape: shape
            }
        });
    });

    if (state.building.connections) {
        state.building.connections.forEach(conn => {
            elements.push({
                data: {
                    id: `${conn.source}-${conn.target}`,
                    source: conn.source,
                    target: conn.target
                }
            });
        });
    }

    cyInstance = cytoscape({
      container: document.getElementById('cy'),
      elements: elements,
      style: [
        {
          selector: 'node[isParent]',
          style: {
            'background-opacity': 0.08,
            'border-width': 2,
            'border-color': 'data(color)',
            'border-opacity': 0.5,
            'text-valign': 'top',
            'text-halign': 'center',
            'font-size': 16,
            'padding': '30px',
            'label': 'data(label)',
            'color': '#ffffff'
          }
        },
        {
          selector: 'node[!isParent]',
          style: {
            'width': 35,
            'height': 35,
            'background-color': 'data(color)',
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': 11,
            'color': '#d1d5db',
            'shape': 'data(shape)',
            'border-width': 2,
            'border-color': '#1f2937',
            'text-margin-y': 4
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#374151',
            'curve-style': 'bezier',
            'target-arrow-shape': 'none',
            'opacity': 0.6
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': 3,
            'border-color': '#3b82f6',
            'overlay-padding': 6
          }
        },
        {
          selector: '.highlighted',
          style: {
            'border-width': 3,
            'border-color': '#f59e0b',
            'z-index': 999
          }
        },
        {
          selector: '.compromised',
          style: {
            'background-color': '#ef4444',
            'border-color': '#dc2626',
            'border-width': 3
          }
        },
        {
          selector: '.attack-edge',
          style: {
            'line-color': '#ef4444',
            'width': 3,
            'line-style': 'dashed',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#ef4444',
            'opacity': 1
          }
        },
        {
          selector: '.warning-badge',
          style: {
            'border-color': '#ef4444',
            'border-width': 4,
            'border-style': 'double'
          }
        },
        {
          selector: '.user-active',
          style: {
            'border-width': 3
          }
        },
        {
          selector: '.faded',
          style: {
            'opacity': 0.4
          }
        }
      ],
      layout: {
        name: 'preset'
      },
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3
    });

    const floorYRanges = {
        3: { min: 0, max: 150 },
        2: { min: 180, max: 330 },
        1: { min: 360, max: 510 },
        0: { min: 540, max: 700 }
    };

    cyInstance.nodes('[!isParent]').forEach(node => {
        const floor = node.data('parent').replace('floor-', '');
        const range = floorYRanges[floor];
        if (range) {
            const devicesOnFloor = devices.filter(d => d.floor == floor);
            const index = devicesOnFloor.findIndex(d => d.id === node.id());
            const count = devicesOnFloor.length;

            // Single row layout, horizontally centered
            const x = (index - (count - 1) / 2) * 160; 
            const y = range.min + (range.max - range.min) / 2;

            node.position({ x, y });
        }
    });

    cyInstance.fit();

    cyInstance.on('tap', 'node[!isParent]', function(evt) {
        const node = evt.target;
        const deviceId = node.id();
        CyberEngine.state.selectedDevice = deviceId;
        CyberEngine.EventBus.emit('device:select', { deviceId });

        const panel = document.getElementById('device-panel');
        if (panel) {
            panel.classList.remove('hidden');
            const title = document.getElementById('device-panel-title');
            if (title) title.innerText = node.data('label');
            const content = document.getElementById('device-panel-content');
            if (content) {
                const device = CyberEngine.Building.getDevice ? CyberEngine.Building.getDevice(deviceId) : null;
                if (device) {
                    const user = device.currentUser ? (CyberEngine.Users.getUser ? CyberEngine.Users.getUser(device.currentUser) : null) : null;
                    const userName = user ? user.name : (typeof device.currentUser === 'object' && device.currentUser ? device.currentUser.name : 'None');
                    content.innerHTML = `
                        <div class="device-property"><span>Type</span><span>${device.type}</span></div>
                        <div class="device-property"><span>Floor</span><span>${device.floor}</span></div>
                        <div class="device-property"><span>Zone</span><span>${device.zone || 'N/A'}</span></div>
                        <div class="device-property"><span>Status</span><span style="color:${device.status === 'compromised' ? '#ef4444' : device.status === 'isolated' ? '#f59e0b' : device.status === 'disabled' ? '#6b7280' : device.status === 'active' ? '#10b981' : '#9ca3af'}">${device.status}</span></div>
                        <div class="device-property"><span>IP</span><span>${device.properties.ip}</span></div>
                        <div class="device-property"><span>MAC</span><span>${device.properties.mac}</span></div>
                        <div class="device-property"><span>Services</span><span>${device.properties.services.join(', ') || 'None'}</span></div>
                        <div class="device-property"><span>Current User</span><span>${userName}</span></div>
                    `;
                }
            }
        }
    });

    cyInstance.on('tap', function(evt) {
        if (evt.target === cyInstance) {
            const panel = document.getElementById('device-panel');
            if (panel) panel.classList.add('hidden');
            CyberEngine.state.selectedDevice = null;
            cyInstance.elements().removeClass('selected');
        }
    });

    if (CyberEngine.EventBus) {
        CyberEngine.EventBus.on('user:select', function(data) {
            if (data && data.userId) {
                highlightUserPath(data.userId);
            } else {
                showAllUsers();
            }
        });

        CyberEngine.EventBus.on('device:statusChange', function(data) {
            if (data && data.deviceId) {
                updateNodeStatus(data.deviceId, data.status);
            }
        });

        CyberEngine.EventBus.on('simulation:freeze', function() {
            cyInstance.elements().style('opacity', 0.5);
        });

        CyberEngine.EventBus.on('simulation:unfreeze', function() {
            cyInstance.elements().removeStyle('opacity');
        });
    }

    const panelClose = document.getElementById('device-panel-close');
    if (panelClose) {
        panelClose.addEventListener('click', () => {
            const panel = document.getElementById('device-panel');
            if (panel) panel.classList.add('hidden');
            CyberEngine.state.selectedDevice = null;
        });
    }

    const btnDisable = document.getElementById('btn-disable-device');
    if (btnDisable) {
        btnDisable.addEventListener('click', () => {
            const deviceId = CyberEngine.state.selectedDevice;
            if (deviceId) {
                const device = CyberEngine.Building.getDevice(deviceId);
                if (device) {
                    CyberEngine.Building.updateDeviceStatus(deviceId, 'disabled');
                    updateNodeColor(deviceId, '#374151'); // dark grey
                    // Visually remove connections to reflect it's offline
                    cyInstance.getElementById(deviceId).connectedEdges().remove();
                    
                    if (CyberEngine.Notifications) {
                        CyberEngine.Notifications.showToast('info', 'Device Disabled', `Device ${device.name} has been taken offline.`);
                    }
                    // Trigger a re-render of the panel
                    cyInstance.getElementById(deviceId).emit('tap');
                }
            }
        });
    }

    const btnIsolate = document.getElementById('btn-isolate-device');
    if (btnIsolate) {
        btnIsolate.addEventListener('click', () => {
            const deviceId = CyberEngine.state.selectedDevice;
            if (deviceId) {
                const device = CyberEngine.Building.getDevice(deviceId);
                if (device) {
                    CyberEngine.Building.updateDeviceStatus(deviceId, 'isolated');
                    updateNodeColor(deviceId, '#6b7280'); // striped/grey
                    const node = cyInstance.getElementById(deviceId);
                    node.addClass('warning-badge');
                    // Sever all network links visually
                    node.connectedEdges().remove();

                    if (CyberEngine.Notifications) {
                        CyberEngine.Notifications.showToast('info', 'Device Isolated', `Device ${device.name} has been quarantined from the network.`);
                    }
                    // Trigger a re-render of the panel
                    node.emit('tap');
                }
            }
        });
    }

    CyberEngine.Graph.cy = cyInstance;
  }

  function updateNodeColor(deviceId, color) {
    if (!cyInstance) return;
    const node = cyInstance.getElementById(deviceId);
    if (node.length) {
        node.data('color', color);
        node.style('background-color', color);
    }
  }

  function updateNodeStatus(deviceId, status) {
     if (!cyInstance) return;
     const node = cyInstance.getElementById(deviceId);
     if (node.length) {
         if (status === 'compromised') {
             node.addClass('compromised');
         } else {
             node.removeClass('compromised');
         }
     }
  }

  function highlightUserPath(userId) {
      if (!cyInstance) return;
      const user = CyberEngine.Users.getUser ? CyberEngine.Users.getUser(userId) : null;
      if (!user) return;

      cyInstance.elements().addClass('faded');
      // Each entry in accessedDevices is {deviceId, deviceName, timestamp, action}
      const deviceIds = new Set();
      user.accessedDevices.forEach(entry => {
          const did = typeof entry === 'string' ? entry : entry.deviceId;
          deviceIds.add(did);
      });
      deviceIds.forEach(did => {
          const node = cyInstance.getElementById(did);
          if (node.length) {
              node.removeClass('faded');
              node.data('color', user.color);
              node.style('background-color', user.color);
              node.addClass('highlighted');
          }
      });
      // Highlight edges between accessed devices
      cyInstance.edges().forEach(edge => {
          if (deviceIds.has(edge.data('source')) && deviceIds.has(edge.data('target'))) {
              edge.removeClass('faded');
              edge.addClass('highlighted');
          }
      });
  }

  function clearHighlights() {
      if (!cyInstance) return;
      cyInstance.elements().removeClass('faded highlighted warning-badge attack-edge');
  }

  function showAllUsers() {
      if (!cyInstance) return;
      cyInstance.elements().removeClass('faded highlighted');
      // Reset all non-compromised nodes to grey first
      cyInstance.nodes('[!isParent]').forEach(node => {
          if (!node.hasClass('compromised')) {
              node.data('color', '#4b5563');
              node.style('background-color', '#4b5563');
          }
      });
      const users = CyberEngine.Users.getAllUsers ? CyberEngine.Users.getAllUsers() : [];
      users.forEach(user => {
          user.accessedDevices.forEach(entry => {
              const did = typeof entry === 'string' ? entry : entry.deviceId;
              const node = cyInstance.getElementById(did);
              if (node.length && !node.hasClass('compromised')) {
                  node.data('color', user.color);
                  node.style('background-color', user.color);
              }
          });
      });
  }

  function selectNode(deviceId) {
      if (!cyInstance) return;
      cyInstance.getElementById(deviceId).select();
  }

  function deselectAll() {
      if (!cyInstance) return;
      cyInstance.elements().unselect();
  }

  function addWarningBadge(deviceId) {
      if (!cyInstance) return;
      const node = cyInstance.getElementById(deviceId);
      if (node.length) {
          node.addClass('warning-badge compromised');
      }
  }

  function animateAttackPath(path) {
      if (!cyInstance) return;
      let delay = 0;
      for (let i = 0; i < path.length; i++) {
          setTimeout(() => {
              const deviceId = path[i];
              addWarningBadge(deviceId);
              if (i > 0) {
                  const prevId = path[i-1];
                  const edge = cyInstance.edges(`[source="${prevId}"][target="${deviceId}"], [source="${deviceId}"][target="${prevId}"]`);
                  if (edge.length) {
                      edge.addClass('attack-edge');
                  } else {
                      cyInstance.add({
                          group: 'edges',
                          data: { id: `attack-${prevId}-${deviceId}`, source: prevId, target: deviceId },
                          classes: 'attack-edge'
                      });
                  }
              }
          }, delay);
          delay += 1500;
      }
  }

  function fitView() {
      if (!cyInstance) return;
      cyInstance.fit();
  }

  return {
    cy: null,
    init,
    updateNodeColor,
    updateNodeStatus,
    highlightUserPath,
    clearHighlights,
    showAllUsers,
    selectNode,
    deselectAll,
    addWarningBadge,
    animateAttackPath,
    fitView
  };
})();
