/**
 * CY9 Health, Posture & Ergonomics Guardian Service
 * Periodic reminders for hydration, posture alignment, and the 20-20-20 eye strain rule.
 */
const { exec } = require('child_process');

class HealthGuardService {
  constructor() {
    this.active = true;
    this.waterCount = 0;
  }

  showNotification(title, message) {
    const safeTitle = title.replace(/"/g, '`"');
    const safeMsg = message.replace(/"/g, '`"');
    const psScript = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
      $template = @"
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>${safeTitle}</text>
            <text>${safeMsg}</text>
        </binding>
    </visual>
</toast>
"@
      $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
      $xml.LoadXml($template)
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("CY9.HealthGuard").Show($toast)
    `;

    exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, () => {});
  }

  triggerPostureCheck() {
    this.showNotification('🧘 CY9 Ergonomics Guard', 'Sir, please straighten your back, relax your shoulders, and calibrate your screen alignment.');
    return { success: true, message: 'Posture check alert triggered, sir.' };
  }

  triggerHydrationAlert() {
    this.waterCount++;
    this.showNotification('💧 CY9 Hydration Alert', `Hydration reminder (${this.waterCount}): Time for a glass of pure water to maintain peak cognitive stamina, sir.`);
    return { success: true, count: this.waterCount, message: `Hydration reminder #${this.waterCount} dispatched, sir.` };
  }

  triggerEyeRest2020() {
    this.showNotification('👁️ 20-20-20 Eye Strain Protocol', 'Look away at an object 20 feet (6 meters) away for 20 seconds to relieve ocular fatigue.');
    return { success: true, message: '20-20-20 Eye Rest protocol triggered, sir.' };
  }
}

module.exports = new HealthGuardService();
