window.CyberEngine = window.CyberEngine || {};
(function() {
  const predefinedUsers = [
    { id: 'user-1', name: 'Alice Chen', role: 'Network Admin', color: '#3b82f6' },
    { id: 'user-2', name: 'Bob Martinez', role: 'Plant Operator', color: '#10b981' },
    { id: 'user-3', name: 'Carol Singh', role: 'Security Analyst', color: '#8b5cf6' },
    { id: 'user-4', name: 'Dave Wilson', role: 'Field Technician', color: '#f97316' },
    { id: 'user-5', name: 'Eve Johnson', role: 'IT Support', color: '#06b6d4' },
    { id: 'user-6', name: 'Frank Kim', role: 'Process Engineer', color: '#ec4899' }
  ];

  CyberEngine.Users = {
    COLORS: ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'],
    
    init: function() {
      CyberEngine.EventBus.on('user:access', () => this.renderUserList());
      CyberEngine.EventBus.on('user:select', (data) => {
        this.renderUserList();
        if (data && data.userId) {
          this.renderUserDetail(data.userId);
        } else {
          const detailEl = document.getElementById('user-detail');
          if (detailEl) detailEl.style.display = 'none';
        }
      });
      // Users are created by simulation.js when it starts
    },

    createUser: function(name, role, color) {
      const id = 'user-' + (CyberEngine.state.users.size + 1);
      const user = {
        id: id,
        name: name,
        color: color || this.COLORS[CyberEngine.state.users.size % this.COLORS.length],
        role: role,
        isSuspicious: false,
        isBlocked: false,
        accessedDevices: [],
        currentDevice: null,
        loginTime: new Date()
      };
      CyberEngine.state.users.set(id, user);
      CyberEngine.EventBus.emit('user:login', { user });
      this.renderUserList();
      return user;
    },

    removeUser: function(userId) {
      CyberEngine.state.users.delete(userId);
      this.renderUserList();
    },

    getUser: function(userId) {
      return CyberEngine.state.users.get(userId);
    },

    getAllUsers: function() {
      return Array.from(CyberEngine.state.users.values());
    },

    getNormalUsers: function() {
      return this.getAllUsers().filter(u => !u.isSuspicious);
    },

    blockUser: function(userId) {
      const user = this.getUser(userId);
      if (user) {
        user.isBlocked = true;
        CyberEngine.EventBus.emit('user:block', { userId, user });
        this.renderUserList();
        if (CyberEngine.state.selectedUser === userId) {
          this.renderUserDetail(userId);
        }
      }
    },

    unblockUser: function(userId) {
      const user = this.getUser(userId);
      if (user) {
        user.isBlocked = false;
        this.renderUserList();
        if (CyberEngine.state.selectedUser === userId) {
          this.renderUserDetail(userId);
        }
      }
    },

    selectUser: function(userId) {
      CyberEngine.state.selectedUser = userId;
      CyberEngine.EventBus.emit('user:select', { userId });
    },

    deselectUser: function() {
      CyberEngine.state.selectedUser = null;
      CyberEngine.EventBus.emit('user:select', { userId: null });
    },

    recordAccess: function(userId, deviceId, action) {
      const user = this.getUser(userId);
      const device = CyberEngine.Building ? CyberEngine.Building.getDevice(deviceId) : null;
      
      if (user && device) {
        const timestamp = new Date();
        const accessRecord = { deviceId, deviceName: device.name, timestamp, action };
        user.accessedDevices.push(accessRecord);
        user.currentDevice = deviceId;
        
        device.accessHistory.push({ userId, timestamp, action });
        device.currentUser = userId;
        
        CyberEngine.EventBus.emit('user:access', { userId, deviceId, action });
      }
    },

    getUserAccessTree: function(userId) {
      const user = this.getUser(userId);
      if (!user) return [];
      return user.accessedDevices.slice().sort((a, b) => a.timestamp - b.timestamp);
    },

    renderUserList: function() {
      const container = document.getElementById('user-list');
      if (!container) return;
      
      container.innerHTML = '';
      
      const showAllBtn = document.createElement('button');
      showAllBtn.textContent = 'Show All';
      showAllBtn.className = 'btn-show-all';
      showAllBtn.onclick = () => this.deselectUser();
      container.appendChild(showAllBtn);

      this.getAllUsers().forEach(user => {
        const badge = document.createElement('div');
        badge.className = 'user-badge';
        if (CyberEngine.state.selectedUser === user.id) badge.classList.add('selected');
        if (user.isSuspicious) badge.classList.add('suspicious');
        badge.style.borderLeftColor = user.color;
        
        badge.onclick = () => {
          if (CyberEngine.state.selectedUser === user.id) {
            this.deselectUser();
          } else {
            this.selectUser(user.id);
          }
        };

        const dot = document.createElement('div');
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = user.color;
        dot.style.display = 'inline-block';
        dot.style.marginRight = '8px';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = user.name;
        nameSpan.style.fontWeight = 'bold';

        const roleSpan = document.createElement('div');
        roleSpan.textContent = user.role;
        roleSpan.style.fontSize = '0.8em';
        roleSpan.style.color = '#666';
        
        badge.appendChild(dot);
        badge.appendChild(nameSpan);
        
        if (user.isSuspicious) {
          const warnIcon = document.createElement('span');
          warnIcon.textContent = ' ⚠️';
          badge.appendChild(warnIcon);
        }
        
        badge.appendChild(roleSpan);
        container.appendChild(badge);
      });
    },

    renderUserDetail: function(userId) {
      const detailEl = document.getElementById('user-detail');
      if (!detailEl) return;
      
      const user = this.getUser(userId);
      if (!user) {
        detailEl.style.display = 'none';
        return;
      }
      
      detailEl.style.display = 'block';
      detailEl.innerHTML = `<h3>${user.name}</h3><p>${user.role}</p>`;
      
      const tree = this.getUserAccessTree(userId);
      const ul = document.createElement('ul');
      ul.className = 'access-tree';
      tree.forEach(t => {
        const li = document.createElement('li');
        li.textContent = `[${t.timestamp.toLocaleTimeString()}] ${t.deviceName} - ${t.action}`;
        ul.appendChild(li);
      });
      detailEl.appendChild(ul);
      
      const controls = document.createElement('div');
      controls.className = 'user-controls';
      
      const btnBlock = document.createElement('button');
      btnBlock.textContent = user.isBlocked ? 'Unblock User' : 'Block User';
      btnBlock.onclick = () => user.isBlocked ? this.unblockUser(userId) : this.blockUser(userId);
      
      const btnRevoke = document.createElement('button');
      btnRevoke.textContent = 'Revoke Access';
      btnRevoke.onclick = () => {
        CyberEngine.EventBus.emit('user:block', { userId, user });
        user.currentDevice = null;
        user.accessedDevices = [];
        this.renderUserDetail(userId);
      };
      
      const btnDisconnect = document.createElement('button');
      btnDisconnect.textContent = 'Force Disconnect';
      btnDisconnect.onclick = () => {
        user.currentDevice = null;
        this.renderUserDetail(userId);
      };
      
      controls.appendChild(btnBlock);
      controls.appendChild(btnRevoke);
      controls.appendChild(btnDisconnect);
      
      detailEl.appendChild(controls);
    }
  };
})();
