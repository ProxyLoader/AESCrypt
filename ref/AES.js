const crypto = require("crypto");

class AES {
  constructor(secretKey) {
    if (!secretKey) throw new Error("Secret key is required");
    this.key = crypto.scryptSync(secretKey, 'salt', 32);
  }

  /**
   * @param {Buffer} fileBuffer
   * @returns {Buffer} 
   */
  encryptFile(fileBuffer) {
    if (!Buffer.isBuffer(fileBuffer)) {
      throw new Error("Input must be a Buffer");
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

    return Buffer.concat([iv, encrypted]);
  }

  /**
   * @param {Buffer} encryptedBuffer
   * @returns {Buffer} 
   */
  decryptFile(encryptedBuffer) {
    const iv = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

module.exports = AES;