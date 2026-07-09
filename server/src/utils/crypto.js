const crypto = require('crypto');

const key = process.env.ENCRYPTION_KEY;

if (!key) {
  console.error('\n============================================================');
  console.error('CRITICAL CONFIGURATION ERROR:');
  console.error('ENCRYPTION_KEY is missing in your environment/dotenv settings.');
  console.error('This key is required to encrypt and decrypt MT5 credentials.');
  console.error('It must be a 64-character hex string (32 bytes).');
  console.error('============================================================\n');
  process.exit(1);
}

if (!/^[0-9a-fA-F]{64}$/.test(key)) {
  console.error('\n============================================================');
  console.error('CRITICAL CONFIGURATION ERROR:');
  console.error('ENCRYPTION_KEY is invalid. It must be a 64-character hex string (32 bytes).');
  console.error('============================================================\n');
  process.exit(1);
}

const keyBuffer = Buffer.from(key, 'hex');

const encrypt = (text) => {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt text:', error.message);
    return '';
  }
};

module.exports = {
  encrypt,
  decrypt,
};
