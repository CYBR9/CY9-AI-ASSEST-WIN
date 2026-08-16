/**
 * CY9 Telegram & Smartphone Remote Uplink Service
 * Enables two-way communication between user mobile phone (Telegram) and Windows workstation.
 */
const https = require('https');
const memoryService = require('./memoryService');
const fs = require('fs');

class TelegramUplinkService {
  constructor() {
    this.polling = false;
    this.lastUpdateId = 0;
    this.pollingInterval = null;
  }

  getCredentials() {
    const config = memoryService.getConfig();
    return {
      botToken: config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: config.telegramChatId || process.env.TELEGRAM_CHAT_ID || ''
    };
  }

  setCredentials(botToken, chatId) {
    memoryService.updateConfig({ telegramBotToken: botToken, telegramChatId: chatId });
    return { success: true, message: 'Telegram uplink credentials updated successfully, sir.' };
  }

  /**
   * Send a text message to user's phone via Telegram Bot
   */
  async sendMessage(text) {
    const { botToken, chatId } = this.getCredentials();
    if (!botToken || !chatId) {
      return { success: false, message: 'Telegram Bot Token or Chat ID not configured in Settings.' };
    }

    return new Promise((resolve) => {
      const payload = JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      });

      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve({ success: json.ok, result: json });
          } catch (e) {
            resolve({ success: false, error: e.message });
          }
        });
      });

      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.write(payload);
      req.end();
    });
  }

  /**
   * Send image / screenshot directly to user's phone
   */
  async sendPhoto(imageBuffer, caption = 'CY9 Desktop Frame Capture') {
    const { botToken, chatId } = this.getCredentials();
    if (!botToken || !chatId) {
      return { success: false, message: 'Telegram credentials missing.' };
    }

    return new Promise((resolve) => {
      const boundary = '----CY9Boundary' + Date.now();
      let header = `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;
      header += `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
      header += `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="screenshot.png"\r\nContent-Type: image/png\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;

      const payloadLength = Buffer.byteLength(header) + imageBuffer.length + Buffer.byteLength(footer);

      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${botToken}/sendPhoto`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payloadLength
        }
      }, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve({ success: json.ok, message: 'Screen frame transmitted to smartphone uplink, sir.' });
          } catch (e) {
            resolve({ success: false, error: e.message });
          }
        });
      });

      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.write(header);
      req.write(imageBuffer);
      req.write(footer);
      req.end();
    });
  }
}

module.exports = new TelegramUplinkService();
