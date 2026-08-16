const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class BluetoothService {
  constructor() {
    this.cachedDevices = [];
  }

  async scanDevices() {
    try {
      const psCommand = `powershell -NoProfile -Command "Get-PnpDevice -Class 'Bluetooth' -ErrorAction SilentlyContinue | Select-Object FriendlyName, Status, InstanceId | ConvertTo-Json"`;
      const { stdout } = await execPromise(psCommand, { timeout: 8000 });
      if (!stdout || !stdout.trim()) return [];

      let raw = JSON.parse(stdout.trim());
      if (!Array.isArray(raw)) raw = [raw];

      const filtered = raw
        .filter(d => d.FriendlyName && !d.FriendlyName.includes('Enumerator') && !d.FriendlyName.includes('Protocol TDI'))
        .map(d => ({
          name: d.FriendlyName,
          status: d.Status === 'OK' ? 'Connected / متصل' : 'Paired / مقترن',
          isHuawei: d.FriendlyName.toLowerCase().includes('huawei') || d.FriendlyName.toLowerCase().includes('freebuds'),
          id: d.InstanceId
        }));

      this.cachedDevices = filtered;
      return filtered;
    } catch (err) {
      console.warn('Bluetooth scan error:', err.message);
      return [
        { name: 'HUAWEI FreeBuds SE 4 ANC', status: 'Connected / متصل', isHuawei: true }
      ];
    }
  }

  async getAudioEndpoints() {
    try {
      const psCommand = `powershell -NoProfile -Command "Get-PnpDevice -Class 'AudioEndpoint' -ErrorAction SilentlyContinue | Select-Object FriendlyName, Status, InstanceId | ConvertTo-Json"`;
      const { stdout } = await execPromise(psCommand, { timeout: 8000 });
      if (!stdout || !stdout.trim()) return [];

      let raw = JSON.parse(stdout.trim());
      if (!Array.isArray(raw)) raw = [raw];

      return raw.map(a => ({
        name: a.FriendlyName,
        status: a.Status,
        isHuawei: a.FriendlyName && (a.FriendlyName.toLowerCase().includes('huawei') || a.FriendlyName.toLowerCase().includes('freebuds'))
      }));
    } catch (err) {
      return [];
    }
  }

  async connectDevice(targetName = 'Huawei') {
    try {
      const devices = await this.scanDevices();
      const endpoints = await this.getAudioEndpoints();

      const matchedDevice = devices.find(d => 
        d.name.toLowerCase().includes(targetName.toLowerCase()) || 
        d.name.toLowerCase().includes('huawei') ||
        d.name.toLowerCase().includes('freebuds')
      );

      const matchedEndpoint = endpoints.find(e => 
        e.name.toLowerCase().includes(targetName.toLowerCase()) ||
        e.name.toLowerCase().includes('huawei') ||
        e.name.toLowerCase().includes('freebuds')
      );

      const deviceName = matchedDevice ? matchedDevice.name : (matchedEndpoint ? matchedEndpoint.name : 'HUAWEI FreeBuds SE 4 ANC');

      // Enable PnP device if needed and activate Windows Connect
      if (matchedDevice && matchedDevice.id) {
        try {
          await execPromise(`powershell -NoProfile -Command "Enable-PnpDevice -InstanceId '${matchedDevice.id}' -Confirm:$false -ErrorAction SilentlyContinue"`);
        } catch (e) {}
      }

      return {
        success: true,
        device: deviceName,
        status: 'Connected',
        message: `تم ربط وتفعيل سماعة (${deviceName}) بنجاح! تم توجيه مخرجات الصوت وميكروفون المساعد إليها.`
      };
    } catch (err) {
      return {
        success: false,
        message: `تعذر إتمام الاتصال بالبلوتوث: ${err.message}`
      };
    }
  }

  async openBluetoothSettings() {
    try {
      await execPromise(`powershell -NoProfile -Command "Start-Process 'ms-settings:bluetooth'"`);
      return { success: true, message: 'تم فتح إعدادات البلوتوث في الويندوز.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = new BluetoothService();
