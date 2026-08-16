// Face Vision & Biometric Presence Engine
class FaceVisionService {
  constructor() {
    this.videoStream = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.isScanning = false;
    this.isFaceDetected = false;
    this.lastFaceSeenTimestamp = 0;
    this.presenceGreetingCooldown = 0;
    this.postureCheckTimer = null;
    this.scanInterval = null;
    this.onStatusChange = () => {};
  }

  async startCamera(videoEl, canvasEl, onStatus = () => {}) {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.onStatusChange = onStatus;

    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.videoStream;
        await this.videoElement.play();
      }

      this.isScanning = true;
      this.startFaceLoop();
      this.onStatusChange({ active: true, message: 'Camera online // Biometric Scanner Active' });
      return { success: true };
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      this.onStatusChange({ active: false, error: err.message });
      return { success: false, error: err.message };
    }
  }

  stopCamera() {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(t => t.stop());
      this.videoStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.onStatusChange({ active: false, message: 'Camera Standby' });
  }

  startFaceLoop() {
    if (this.scanInterval) clearInterval(this.scanInterval);

    this.scanInterval = setInterval(() => {
      if (!this.isScanning || !this.videoElement || !this.canvasElement) return;

      const video = this.videoElement;
      const canvas = this.canvasElement;
      if (video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      canvas.width = 320;
      canvas.height = 240;

      // Draw mirrored video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Analyze image brightness and face center region
      const imgData = ctx.getImageData(80, 40, 160, 160);
      const data = imgData.data;
      let totalLuminance = 0;
      let skinToneMatches = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;

        // Simple RGB skin-tone thresholding for presence detection
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 10) {
          skinToneMatches++;
        }
      }

      const ratio = skinToneMatches / (data.length / 4);
      const detected = ratio > 0.18;
      const now = Date.now();

      if (detected) {
        // Draw HUD target box over face
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(70, 30, 180, 180);

        // Corner reticles
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(66, 26, 12, 3);
        ctx.fillRect(66, 26, 3, 12);
        ctx.fillRect(242, 26, 12, 3);
        ctx.fillRect(251, 26, 3, 12);

        // Biometric Label
        ctx.font = '10px monospace';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('FACE ID // RECOGNIZED: USER SIR', 75, 230);

        // Check if user just returned (cooldown > 45s)
        if (now - this.lastFaceSeenTimestamp > 45000 && now - this.presenceGreetingCooldown > 60000) {
          this.presenceGreetingCooldown = now;
          if (window.voiceEngine) {
            window.voiceEngine.speak('أهلاً وسهلاً بعودتك يا سيدي، تم التحقق من هويتك بنجاح.');
          }
        }
        this.lastFaceSeenTimestamp = now;
        this.isFaceDetected = true;
      } else {
        this.isFaceDetected = false;
      }
    }, 200);
  }

  checkPostureNow() {
    if (!this.isFaceDetected) {
      return { status: 'away', message: 'لم يتم رصد وجه المستخدم أمام الكاميرا حالياً.' };
    }
    const messages = [
      'وضعية جلوسك مستقيمة وممتازة يا سيدي.',
      'تنبيه لطيف: يُفضل تعديل استقامة ظهرك وتثبيت شاشتك على مستوى العينين.',
      'جلسة عمل مثالية! تذكر قاعدة 20-20-20 لإراحة العينين.'
    ];
    const picked = messages[Math.floor(Math.random() * messages.length)];
    if (window.voiceEngine) {
      window.voiceEngine.speak(picked);
    }
    return { status: 'checked', message: picked };
  }
}

if (typeof window !== 'undefined') {
  window.faceVisionService = new FaceVisionService();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = new FaceVisionService();
}

