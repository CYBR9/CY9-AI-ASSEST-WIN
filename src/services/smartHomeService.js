// Smart Home & Universal IR Remote Hub Controller
const irRemoteService = typeof window !== 'undefined' && window.irRemoteService
  ? window.irRemoteService
  : require('./irRemoteService');

class SmartHomeService {
  constructor() {
    this.ir = irRemoteService;
  }

  getDevices() {
    return this.ir ? this.ir.getRemotes() : [];
  }

  getRemotes() {
    return this.ir ? this.ir.getRemotes() : [];
  }

  addDevice(deviceData) {
    if (this.ir) {
      return this.ir.addRemote(deviceData);
    }
    return { success: false, message: 'IR Service not ready' };
  }

  removeDevice(id) {
    if (this.ir) {
      return this.ir.removeRemote(id);
    }
    return { success: false, message: 'IR Service not ready' };
  }

  getHubConfig() {
    return this.ir ? this.ir.getHubConfig() : {};
  }

  setHubConfig(cfg) {
    return this.ir ? this.ir.setHubConfig(cfg) : { success: true };
  }

  async sendIR(remoteId, command, val = null) {
    if (this.ir) {
      return await this.ir.sendIRCommand(remoteId, command, val);
    }
    return { success: true, message: `Dispatched IR command: ${command}` };
  }

  async sendTVCommand(command, val = '') {
    if (this.ir) {
      return await this.ir.sendIRCommand('ir_tv_living', command, val);
    }
    if (typeof window !== 'undefined' && window.jarvisAPI && window.jarvisAPI.controlSmartDevice) {
      return window.jarvisAPI.controlSmartDevice('tv', 'Smart TV', command, val);
    }
    return { success: true, message: `تم إرسال أمر ريموت التلفزيون: ${command}` };
  }

  async sendACCommand(command, val = '') {
    if (this.ir) {
      return await this.ir.sendIRCommand('ir_ac_living', command, val);
    }
    return { success: true, message: `تم إرسال أمر ريموت المكيف: ${command}` };
  }

  async sendRGBCommand(command) {
    if (this.ir) {
      return await this.ir.sendIRCommand('ir_rgb_light', command);
    }
    return { success: true, message: `تم إرسال أمر ريموت الإضاءة: ${command}` };
  }

  toggleDevice(id) {
    const dev = this.devices.find(d => d.id === id);
    if (!dev) return { success: false, message: 'Device not found' };

    if (dev.status === 'on') {
      dev.status = 'off';
    } else if (dev.status === 'off') {
      dev.status = 'on';
    } else if (dev.status === 'online') {
      dev.status = 'offline';
    } else {
      dev.status = 'online';
    }

    if (dev.id.startsWith('ir_')) {
      this.sendIR(dev.id, dev.status === 'on' ? 'power_on' : 'power_off');
    } else if (typeof window !== 'undefined' && window.jarvisAPI && window.jarvisAPI.controlSmartDevice) {
      window.jarvisAPI.controlSmartDevice(dev.type, dev.name, dev.status === 'on' ? 'turn_on' : 'turn_off', '');
    }

    return { success: true, device: dev, message: `تم إرسال إشارة الريموت IR وتحديث حالة ${dev.name} إلى: ${dev.status}` };
  }
}

const smartHomeServiceInstance = new SmartHomeService();

if (typeof window !== 'undefined') {
  window.smartHomeService = smartHomeServiceInstance;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = smartHomeServiceInstance;
}
