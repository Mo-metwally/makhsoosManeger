const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const readlineSync = require('readline-sync');

// ==========================================
// Makhsoos License Generator Tool
// ==========================================

const SECRET_KEY = 'Makhsoos_Super_Secret_License_Key_2026';
const GENERATOR_PASSWORD = '12224400';

function generateLicense(machineId, clientCode, clientName, daysValid = 365) {
  const issueDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysValid);

  const licenseData = {
    machineId,
    clientCode,
    clientName,
    issued: issueDate.toISOString(),
    expires: expiryDate.toISOString(),
    type: 'Premium'
  };

  const dataString = JSON.stringify(licenseData);

  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(SECRET_KEY + 'salt').digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(dataString, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const licensePayload = `${iv.toString('hex')}:${encrypted}`;

  const outputDir = path.join(__dirname, 'server');
  const outputFile = path.join(outputDir, 'license.key');
  fs.writeFileSync(outputFile, licensePayload);

  console.log('\n=============================================');
  console.log('✅ License file generated successfully!');
  console.log(`📌 File path: ${outputFile}`);
  console.log(`💻 Linked Machine ID: ${machineId}`);
  console.log(`👤 Client Name: ${clientName}`);
  console.log(`🔑 Client Code: ${clientCode}`);
  console.log(`⏳ Valid until: ${expiryDate.toLocaleDateString()}`);
  console.log('=============================================\n');
}

function startInteractiveGenerator() {
  console.log('=============================================');
  console.log('    🛡️  Makhsoos License Generator  🛡️');
  console.log('=============================================\n');

  // 1. Password
  const password = readlineSync.question('🔒 Enter Generator Password: ', {
    hideEchoBack: true // Hides the input
  });

  if (password !== GENERATOR_PASSWORD) {
    console.log('\n⛔ Error: Unauthorized! Incorrect password.\n');
    process.exit(1);
  }

  // 2. Machine ID
  const machineId = readlineSync.question('\n💻 Enter Client Machine ID: ');
  if (!machineId) {
    console.log('\n⛔ Error: Machine ID is required.\n');
    process.exit(1);
  }

  // 3. Client Name
  const clientName = readlineSync.question('\n👤 Enter Client Name (e.g. John Doe): ');
  if (!clientName) {
    console.log('\n⛔ Error: Client Name is required.\n');
    process.exit(1);
  }

  // 4. Client Unique Code
  const clientCode = readlineSync.question('\n🔑 Enter Custom Client Code (Hidden): ', {
    hideEchoBack: true // Hides the input
  });

  if (!clientCode) {
    console.log('\n⛔ Error: Client Code is required.\n');
    process.exit(1);
  }

  // 5. Duration
  const daysStr = readlineSync.question('\n⏳ Enter License Duration in Days (e.g. 30): ');
  let daysValid = parseInt(daysStr, 10);
  if (isNaN(daysValid) || daysValid <= 0) {
    console.log('\n⚠️ Invalid duration provided. Defaulting to 365 days.');
    daysValid = 365;
  }

  generateLicense(machineId, clientCode, clientName, daysValid);
}

startInteractiveGenerator();
