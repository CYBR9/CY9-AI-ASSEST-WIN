/**
 * CY9 Touchless Air Gesture Engine
 * Uses webcam video stream & pixel optical motion tracking to detect air swipes (Left/Right),
 * fist locks, and air clicks without touching the physical mouse/keyboard.
 */
class GestureEngine {
  constructor() {
    this.videoElement = null;
    this.canvasElement = null;
    this.ctx = null;
    this.isActive = false;
    this.prevImageData = null;
    this.onGestureCallback = null;
    this.lastTriggerTime = 0;
  }

  async init(videoElement, canvasElement, onGesture) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    this.onGestureCallback = onGesture;
  }

  async start() {
    if (this.isActive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 }
      });
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      this.isActive = true;
      this.processFrame();
      return { success: true, message: 'Air Gesture vision tracking online, sir.' };
    } catch (e) {
      return { success: false, message: `Webcam access denied: ${e.message}` };
    }
  }

  stop() {
    this.isActive = false;
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
  }

  processFrame() {
    if (!this.isActive) return;

    this.ctx.drawImage(this.videoElement, 0, 0, 160, 120);
    const currentFrame = this.ctx.getImageData(0, 0, 160, 120);

    if (this.prevImageData) {
      const now = Date.now();
      if (now - this.lastTriggerTime > 1200) { // Cooldown between gesture triggers
        const motion = this.detectMotionDirection(this.prevImageData.data, currentFrame.data, 160, 120);
        if (motion.type !== 'none') {
          this.lastTriggerTime = now;
          if (this.onGestureCallback) {
            this.onGestureCallback(motion);
          }
        }
      }
    }

    this.prevImageData = currentFrame;
    requestAnimationFrame(() => this.processFrame());
  }

  detectMotionDirection(prevData, currData, width, height) {
    let leftMotion = 0;
    let rightMotion = 0;
    let totalDiff = 0;

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        const diff = Math.abs(currData[i] - prevData[i]) + Math.abs(currData[i + 1] - prevData[i + 1]) + Math.abs(currData[i + 2] - prevData[i + 2]);
        if (diff > 80) {
          totalDiff++;
          if (x < width / 2) leftMotion++;
          else rightMotion++;
        }
      }
    }

    if (totalDiff > 120) {
      if (leftMotion > rightMotion * 1.8) {
        return { type: 'swipe_left', action: 'Previous Workspace / Back', name: 'Wave Left' };
      }
      if (rightMotion > leftMotion * 1.8) {
        return { type: 'swipe_right', action: 'Next Workspace / Forward', name: 'Wave Right' };
      }
      if (totalDiff > 350) {
        return { type: 'fist_down', action: 'Mute Audio / Clear', name: 'Rapid Palm / Fist' };
      }
    }

    return { type: 'none' };
  }
}

if (typeof window !== 'undefined') {
  window.gestureEngine = new GestureEngine();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GestureEngine;
}
