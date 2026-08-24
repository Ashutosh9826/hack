window.CyberEngine = window.CyberEngine || {};
(function() {
  let logIdCounter = 1;

  CyberEngine.Logs = {
    init: function() {
      const userFilter = document.getElementById('log-filter-user');
      if (userFilter) {
        userFilter.innerHTML = '<option value="">All Users</option>';
        userFilter.addEventListener('change', () => this.applyFilters());
      }
      
      const floorFilter = document.getElementById('log-filter-floor');
      if (floorFilter) {
        floorFilter.innerHTML = '<option value="">All Floors</option>';
        for (let i = 0; i <= 3; i++) {
          const opt = document.createElement('option');
          opt.value = i.toString();
          opt.textContent = 'Floor ' + i;
          floorFilter.appendChild(opt);
        }
        floorFilter.addEventListener('change', () => this.applyFilters());
      }
      
      CyberEngine.EventBus.on('log:new', () => this.renderLogs());
      
      CyberEngine.EventBus.on('user:login', (data) => {
        this.addLog({
          deviceId: 'system',
          deviceName: 'System',
          userId: data.user.id,
          userName: data.user.name,
          userColor: data.user.color,
          action: 'LOGIN',
          status: 'normal',
          floor: null,
          details: 'User logged in'
        });
        this.updateUserFilter();
      });

      CyberEngine.EventBus.on('user:access', (data) => {
        const user = CyberEngine.Users.getUser(data.userId);
        const device = CyberEngine.Building.getDevice(data.deviceId);
        if (user && device) {
          this.addLog({
            deviceId: device.id,
            deviceName: device.name,
            userId: user.id,
            userName: user.name,
            userColor: user.color,
            action: data.action || 'ACCESS',
            status: 'normal',
            floor: device.floor,
            details: `Accessed ${device.name}`
          });
        }
      });

      CyberEngine.EventBus.on('attack:step', (data) => {
        const device = CyberEngine.Building.getDevice ? CyberEngine.Building.getDevice(data.device) : null;
        const attacker = data.attacker;
        this.addLog({
          deviceId: data.device || 'unknown',
          deviceName: device ? device.name : 'Unknown Device',
          userId: attacker ? attacker.id : 'unknown',
          userName: attacker ? attacker.name : 'Shadow Agent',
          userColor: '#ef4444',
          action: data.action || 'MALICIOUS_ACTIVITY',
          status: 'suspicious',
          floor: device ? device.floor : null,
          details: 'Suspicious activity detected: ' + (data.action || '')
        });
      });
    },

    updateUserFilter: function() {
      const userFilter = document.getElementById('log-filter-user');
      if (!userFilter) return;
      const currentVal = userFilter.value;
      userFilter.innerHTML = '<option value="">All Users</option>';
      CyberEngine.Users.getAllUsers().forEach(user => {
        const opt = document.createElement('option');
        opt.value = user.id;
        opt.textContent = user.name;
        userFilter.appendChild(opt);
      });
      userFilter.value = currentVal;
    },

    addLog: function(entry) {
      entry.id = logIdCounter++;
      entry.timestamp = entry.timestamp || new Date();
      CyberEngine.state.logs.push(entry);
      CyberEngine.EventBus.emit('log:new', entry);
    },

    getLogs: function() {
      return CyberEngine.state.logs;
    },

    getLogsByUser: function(userId) {
      return CyberEngine.state.logs.filter(l => l.userId === userId);
    },

    getLogsByDevice: function(deviceId) {
      return CyberEngine.state.logs.filter(l => l.deviceId === deviceId);
    },

    getLogsByFloor: function(floor) {
      return CyberEngine.state.logs.filter(l => l.floor === floor);
    },

    clearLogs: function() {
      CyberEngine.state.logs = [];
      this.renderLogs();
    },

    applyFilters: function() {
      this.renderLogs();
    },

    renderLogs: function() {
      const tbody = document.getElementById('log-table-body');
      if (!tbody) return;
      
      const userFilter = document.getElementById('log-filter-user')?.value;
      const floorFilter = document.getElementById('log-filter-floor')?.value;
      
      let filtered = CyberEngine.state.logs;
      if (userFilter) filtered = filtered.filter(l => l.userId === userFilter);
      if (floorFilter !== undefined && floorFilter !== '') {
        const floorNum = parseInt(floorFilter, 10);
        filtered = filtered.filter(l => l.floor === floorNum);
      }
      
      const displayLogs = filtered.slice(-200);
      
      tbody.innerHTML = '';
      displayLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.className = 'log-row';
        if (log.status === 'suspicious') tr.classList.add('suspicious');
        
        const timeStr = log.timestamp.toLocaleTimeString();
        
        const tdTime = document.createElement('td');
        tdTime.textContent = timeStr;
        
        const tdDevice = document.createElement('td');
        tdDevice.textContent = log.deviceName;
        
        const tdUser = document.createElement('td');
        tdUser.textContent = log.userName;
        tdUser.style.color = log.userColor || 'inherit';
        tdUser.style.fontWeight = 'bold';
        
        const tdAction = document.createElement('td');
        tdAction.textContent = log.action;
        
        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status-badge ${log.status}`;
        badge.textContent = log.status;
        tdStatus.appendChild(badge);
        
        tr.appendChild(tdTime);
        tr.appendChild(tdDevice);
        tr.appendChild(tdUser);
        tr.appendChild(tdAction);
        tr.appendChild(tdStatus);
        
        tbody.appendChild(tr);
      });
      
      const tableContainer = tbody.parentElement?.parentElement;
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }
  };
})();
