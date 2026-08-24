window.CyberEngine = window.CyberEngine || {};
(function() {
  let notifIdCounter = 1;

  CyberEngine.Notifications = {
    init: function() {
      const btn = document.getElementById('btn-notifications');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleDropdown();
        });
      }

      document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown && !dropdown.classList.contains('hidden') && !e.target.closest('#notification-dropdown')) {
          dropdown.classList.add('hidden');
        }
      });

      const clearBtn = document.getElementById('btn-clear-notifications');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearAll());
      }

      CyberEngine.EventBus.on('attack:detected', (data) => {
        const msg = `Cyber Attack Detected! Target: ${data.targetName || 'Unknown'}`;
        this.notify('critical', 'Attack Detected', msg);
        this.showToast('critical', 'Attack Detected', msg, 8000);
        this.sendWhatsApp(msg);
      });

      CyberEngine.EventBus.on('threat:update', (data) => {
        if (data.score > 50) {
          this.notify('warning', 'Elevated Threat Level', `Threat score is now ${data.score}`);
        }
      });

      CyberEngine.EventBus.on('user:login', (data) => {
        this.notify('info', 'User Login', `${data.user.name} has logged in.`);
      });
    },

    notify: function(type, title, message) {
      const notif = {
        id: notifIdCounter++,
        type: type,
        title: title,
        message: message,
        timestamp: new Date(),
        read: false
      };
      
      CyberEngine.state.notifications.push(notif);
      
      const badge = document.getElementById('notification-badge');
      if (badge) {
        const unreadCount = CyberEngine.state.notifications.filter(n => !n.read).length;
        if (unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.classList.remove('hidden');
        }
      }

      if (type === 'critical' || type === 'warning') {
        this.showToast(type, title, message, type === 'critical' ? 8000 : 5000);
      }
      
      this.renderDropdown();
      CyberEngine.EventBus.emit('notification:new', notif);
    },

    showToast: function(type, title, message, duration = 5000) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      
      const toast = document.createElement('div');
      toast.className = `toast toast-${type} slideIn`;
      
      let iconClass = 'fa-info-circle';
      if (type === 'warning') iconClass = 'fa-exclamation-triangle';
      if (type === 'critical') iconClass = 'fa-skull-crossbones';
      
      toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${iconClass}"></i></div>
        <div class="toast-content">
          <div class="toast-title">${title}</div>
          <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
      `;
      
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
      });
      
      container.appendChild(toast);
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, duration);
    },

    sendWhatsApp: function(message) {
      // To send FULLY AUTOMATICALLY in the background without CallMeBot,
      // you must use a standard API gateway (like UltraMsg, Twilio, or Whapi).
      // Browsers cannot send background WhatsApps natively due to Meta's anti-spam rules.
      
      const instanceId = 'instance189398';
      const token = 'vjqt9482x5m553yr';
      const phone = '919201758106';
      
      // Fallback: If you haven't put your API key in yet, show the click-to-chat link
      if (instanceId === 'YOUR_INSTANCE_ID') {
          const fallbackUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
          this.showToast('warning', 'API Key Required', `To send automatically, add your API key in notifications.js. <a href="${fallbackUrl}" target="_blank" style="color: #38bdf8; text-decoration: underline;">Click here to send manually for now.</a>`, 10000);
          return;
      }

      // Automated Server-to-Server sending via UltraMsg (or similar provider)
      const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
      const data = new URLSearchParams();
      data.append("token", token);
      data.append("to", phone);
      data.append("body", message);

      fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: data
      })
      .then(response => response.json())
      .then(result => {
          console.log('Automated WhatsApp sent:', result);
          this.showToast('info', 'WhatsApp Sent', `Automated alert successfully sent to +${phone}`, 5000);
      })
      .catch(err => {
          console.error('Automated WhatsApp failed:', err);
      });
    },

    toggleDropdown: function() {
      const dropdown = document.getElementById('notification-dropdown');
      if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
          CyberEngine.state.notifications.forEach(n => n.read = true);
          const badge = document.getElementById('notification-badge');
          if (badge) {
            badge.classList.add('hidden');
            badge.textContent = '0';
          }
        }
      }
    },

    clearAll: function() {
      CyberEngine.state.notifications = [];
      this.renderDropdown();
      const badge = document.getElementById('notification-badge');
      if (badge) {
        badge.classList.add('hidden');
        badge.textContent = '0';
      }
    },

    renderDropdown: function() {
      const list = document.getElementById('notification-list');
      if (!list) return;
      
      list.innerHTML = '';
      
      if (CyberEngine.state.notifications.length === 0) {
        list.innerHTML = '<div class="notification-item">No notifications</div>';
        return;
      }
      
      const reversed = [...CyberEngine.state.notifications].reverse();
      reversed.forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        
        let color = '#3b82f6';
        if (notif.type === 'warning') color = '#f59e0b';
        if (notif.type === 'critical') color = '#ef4444';
        
        item.innerHTML = `
          <div style="display:flex; align-items:center; margin-bottom:4px;">
            <div style="width:8px; height:8px; border-radius:50%; background-color:${color}; margin-right:8px;"></div>
            <strong>${notif.title}</strong>
          </div>
          <div style="font-size:0.9em;">${notif.message}</div>
          <div style="font-size:0.8em; color:#888; margin-top:4px;">${notif.timestamp.toLocaleTimeString()}</div>
        `;
        list.appendChild(item);
      });
    }
  };
})();
