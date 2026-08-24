window.CyberEngine = window.CyberEngine || {};
(function() {
  const floors = [
    { id: 3, name: 'Floor 3 - Enterprise', zone: 'enterprise', label: 'L3-Ent', color: '#3b82f6' },
    { id: 2, name: 'Floor 2 - Industrial DMZ', zone: 'dmz', label: 'L2-DMZ', color: '#f59e0b' },
    { id: 1, name: 'Floor 1 - Site Operations', zone: 'operations', label: 'L1-Ops', color: '#8b5cf6' },
    { id: 0, name: 'Floor 0 - Field / Cell Zone', zone: 'field', label: 'L0-Fld', color: '#10b981' }
  ];

  const devicesData = [
    // Floor 3
    { id: 'ent-gw-01', name: 'Internet', type: 'internet', floor: 3, zone: 'enterprise', properties: { ip: 'Public', mac: 'N/A', services: ['WAN'] } },
    { id: 'ent-fw-01', name: 'Firewall', type: 'firewall', floor: 3, zone: 'enterprise', properties: { ip: '10.3.0.1', mac: '00:1A:2B:3C:4D:50', services: ['packet-filter'] } },
    { id: 'ent-sw-01', name: 'Wireless Router', type: 'router', floor: 3, zone: 'enterprise', properties: { ip: '10.3.0.10', mac: '00:1A:2B:3C:4E:10', services: ['VLAN', 'Wi-Fi'] } },
    { id: 'ent-ad-01', name: 'AD Server', type: 'server', floor: 3, zone: 'enterprise', properties: { ip: '10.3.1.12', mac: '00:1A:2B:3C:4D:55', services: ['LDAP'] } },
    { id: 'ent-lap-01', name: 'Laptop', type: 'laptop', floor: 3, zone: 'enterprise', properties: { ip: '10.3.2.101', mac: '00:1A:2B:3C:4E:01', services: [] } },
    { id: 'ent-ws-01', name: 'Desktop Computer', type: 'desktop', floor: 3, zone: 'enterprise', properties: { ip: '10.3.2.102', mac: '00:1A:2B:3C:4E:02', services: [] } },
    { id: 'ent-phone-01', name: 'IP Phone', type: 'phone', floor: 3, zone: 'enterprise', properties: { ip: '10.3.2.150', mac: '00:1A:2B:3C:4E:05', services: ['VoIP'] } },
    { id: 'ent-printer-01', name: 'Printer', type: 'printer', floor: 3, zone: 'enterprise', properties: { ip: '10.3.2.200', mac: '00:1A:2B:3C:4E:20', services: [] } },

    // Floor 2
    { id: 'dmz-fw-01', name: 'DMZ Firewall', type: 'firewall', floor: 2, zone: 'dmz', properties: { ip: '10.2.0.1', mac: '00:1B:2C:3D:4E:01', services: ['ACL'] } },
    { id: 'dmz-jump-01', name: 'Jump Server', type: 'server', floor: 2, zone: 'dmz', properties: { ip: '10.2.1.13', mac: '00:1B:2C:3D:4E:06', services: ['RDP'] } },
    { id: 'dmz-proxy-01', name: 'Web Proxy', type: 'server', floor: 2, zone: 'dmz', properties: { ip: '10.2.1.12', mac: '00:1B:2C:3D:4E:05', services: ['HTTP'] } },

    // Floor 1
    { id: 'ops-sw-01', name: 'Ops Switch', type: 'switch', floor: 1, zone: 'operations', properties: { ip: '10.1.0.10', mac: '00:1C:2D:3E:4F:07', services: [] } },
    { id: 'ops-eng-01', name: 'Eng Laptop', type: 'laptop', floor: 1, zone: 'operations', properties: { ip: '10.1.2.201', mac: '00:1C:2D:3E:4F:0C', services: ['config'] } },
    { id: 'ops-ft-01', name: 'SCADA Server', type: 'server', floor: 1, zone: 'operations', properties: { ip: '10.1.1.11', mac: '00:1C:2D:3E:4F:02', services: ['HMI'] } },

    // Floor 0
    { id: 'fld-sw-01', name: 'Field Switch', type: 'switch', floor: 0, zone: 'field', properties: { ip: '10.0.0.10', mac: '00:1D:2E:3F:40:19', services: [] } },
    { id: 'fld-plc-01', name: 'Main PLC', type: 'plc', floor: 0, zone: 'field', properties: { ip: '10.0.1.10', mac: '00:1D:2E:3F:40:01', services: ['Modbus'] } },
    { id: 'fld-plc-02', name: 'Backup PLC', type: 'plc', floor: 0, zone: 'field', properties: { ip: '10.0.1.11', mac: '00:1D:2E:3F:40:02', services: ['Modbus'] } },
    { id: 'fld-cam-01', name: 'Security Cam', type: 'camera', floor: 0, zone: 'field', properties: { ip: '10.0.1.50', mac: '00:1D:2E:3F:40:0D', services: ['video'] } }
  ];

  const connectionsData = [
    // Enterprise
    { source: 'ent-gw-01', target: 'ent-fw-01' },
    { source: 'ent-fw-01', target: 'ent-sw-01' },
    { source: 'ent-sw-01', target: 'ent-ad-01' },
    { source: 'ent-sw-01', target: 'ent-lap-01' },
    { source: 'ent-sw-01', target: 'ent-ws-01' },
    { source: 'ent-sw-01', target: 'ent-phone-01' },
    { source: 'ent-sw-01', target: 'ent-printer-01' },
    
    // Cross-floor routing
    { source: 'ent-sw-01', target: 'dmz-fw-01' },
    
    // DMZ
    { source: 'dmz-fw-01', target: 'dmz-jump-01' },
    { source: 'dmz-fw-01', target: 'dmz-proxy-01' },
    { source: 'dmz-fw-01', target: 'ops-sw-01' }, // Cross-floor
    
    // Operations
    { source: 'ops-sw-01', target: 'ops-eng-01' },
    { source: 'ops-sw-01', target: 'ops-ft-01' },
    { source: 'ops-sw-01', target: 'fld-sw-01' }, // Cross-floor
    
    // Field
    { source: 'fld-sw-01', target: 'fld-plc-01' },
    { source: 'fld-sw-01', target: 'fld-plc-02' },
    { source: 'fld-sw-01', target: 'fld-cam-01' }
  ];

  CyberEngine.Building = {
    init: function() {
      const devicesMap = new Map();
      
      devicesData.forEach(d => {
        d.status = 'idle';
        d.connections = [];
        d.currentUser = null;
        d.accessHistory = [];
        d.properties.os = d.properties.os || 'Unknown OS';
        d.properties.firmware = d.properties.firmware || 'v1.0';
        devicesMap.set(d.id, d);
      });

      connectionsData.forEach(conn => {
        const source = devicesMap.get(conn.source);
        const target = devicesMap.get(conn.target);
        if (source && target) {
          source.connections.push(conn.target);
          target.connections.push(conn.source);
        }
      });

      CyberEngine.state.building = {
        floors: floors,
        devices: devicesMap,
        connections: connectionsData
      };
    },

    getDevice: function(id) {
      return CyberEngine.state.building.devices.get(id);
    },

    getDevicesByFloor: function(floorId) {
      const result = [];
      CyberEngine.state.building.devices.forEach(d => {
        if (d.floor === floorId) result.push(d);
      });
      return result;
    },

    getDevicesByZone: function(zone) {
      const result = [];
      CyberEngine.state.building.devices.forEach(d => {
        if (d.zone === zone) result.push(d);
      });
      return result;
    },

    getConnectedDevices: function(deviceId) {
      const device = this.getDevice(deviceId);
      if (!device) return [];
      return device.connections.map(id => this.getDevice(id)).filter(d => d);
    },

    getAllDevices: function() {
      return Array.from(CyberEngine.state.building.devices.values());
    },

    getFloors: function() {
      return CyberEngine.state.building.floors;
    },

    updateDeviceStatus: function(deviceId, status) {
      const device = this.getDevice(deviceId);
      if (device) {
        device.status = status;
        CyberEngine.EventBus.emit('device:statusChange', { deviceId, status, device });
      }
    }
  };
})();
