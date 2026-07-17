const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');
const https = require('https');

// المفتاح السري (يجب أن يكون مطابقاً لمولد الرخص)
const SECRET_KEY = 'Makhsoos_Super_Secret_License_Key_2026';

function getOnlineTime() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.google.com',
      method: 'HEAD',
      port: 443
    }, (res) => {
      const dateStr = res.headers.date;
      if (dateStr) {
        resolve(new Date(dateStr));
      } else {
        reject(new Error('No date header'));
      }
    });

    req.on('error', (e) => reject(e));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function verifyLicense(silent = false) {
  try {
    const licensePath = path.join(process.cwd(), 'license.key');
    
    // 1. التأكد من وجود ملف الرخصة
    const currentMachineId = machineIdSync();
    if (!fs.existsSync(licensePath)) {
      if (!silent) console.error('🚫 [SYSTEM PROTECTION] License file not found! Please place license.key next to the executable.');
      if (!silent) console.error(`👉 Please send this Machine ID to the developer to get your license: ${currentMachineId}`);
      process.exit(1);
    }

    const licensePayload = fs.readFileSync(licensePath, 'utf8').trim();
    const [ivHex, encryptedHex] = licensePayload.split(':');

    if (!ivHex || !encryptedHex) {
      console.error('🚫 [SYSTEM PROTECTION] License file is corrupted or invalid.');
      console.error(`👉 Your Machine ID is: ${currentMachineId}`);
      process.exit(1);
    }

    // 2. فك التشفير
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(SECRET_KEY + 'salt').digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const licenseData = JSON.parse(decrypted);

    // 3. التحقق من رقم الجهاز (Hardware ID)
    if (licenseData.machineId !== currentMachineId) {
      console.error('🚫 [SYSTEM PROTECTION] This license is registered to another device! You cannot run the application here.');
      console.error(`👉 The Machine ID of THIS device is: ${currentMachineId}`);
      process.exit(1);
    }

    // 4. التحقق من تاريخ الصلاحية باستخدام وقت الإنترنت لتجنب تلاعب المستخدم بالوقت المحلي
    let now;
    try {
      now = await getOnlineTime();
    } catch (err) {
      console.error('🚫 [SYSTEM PROTECTION] Internet connection required for license verification!');
      console.error('👉 Please connect to the internet to verify your license validity.');
      process.exit(1);
    }

    const expiry = new Date(licenseData.expires);
    if (now > expiry) {
      console.error(`🚫 [SYSTEM PROTECTION] License expired on ${expiry.toLocaleDateString()}. Please renew.`);
      process.exit(1);
    }

    if (!silent) {
      console.log('\n======================================');
      console.log('✅ [SYSTEM PROTECTION] Valid license found!');
      console.log(`👤 Client Name: ${licenseData.clientName || 'Unknown'}`);
      console.log(`⏳ Valid until: ${expiry.toLocaleDateString()}`);
      console.log('======================================\n');
      console.log('✅ [SYSTEM PROTECTION] Starting server...');
    }
    return true;

  } catch (err) {
    console.error('🚫 [SYSTEM PROTECTION] Error verifying license, ensure the file is intact.');
    process.exit(1);
  }
}

module.exports = { verifyLicense };