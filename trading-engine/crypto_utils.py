import os
import sys
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from logger import logger

ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')

if not ENCRYPTION_KEY:
    logger.critical("CRITICAL CONFIGURATION ERROR: ENCRYPTION_KEY environment variable is missing.")
    sys.exit(1)

if len(ENCRYPTION_KEY) != 64:
    logger.critical("CRITICAL CONFIGURATION ERROR: ENCRYPTION_KEY is invalid. It must be a 64-character hex string (32 bytes).")
    sys.exit(1)

try:
    key_bytes = bytes.fromhex(ENCRYPTION_KEY)
except Exception as e:
    logger.critical(f"CRITICAL CONFIGURATION ERROR: Failed to parse ENCRYPTION_KEY as hex: {e}")
    sys.exit(1)

def decrypt(cipher_text):
    if not cipher_text:
        return ""
    # If the password is not encrypted (e.g. dummy for fallback/old setups) or doesn't have iv splitter
    if ":" not in cipher_text:
        return cipher_text
    try:
        parts = cipher_text.split(':')
        if len(parts) != 2:
            return ""
        
        iv = bytes.fromhex(parts[0])
        encrypted_data = bytes.fromhex(parts[1])
        
        backend = default_backend()
        cipher = Cipher(algorithms.AES(key_bytes), modes.CBC(iv), backend=backend)
        decryptor = cipher.decryptor()
        
        decrypted = decryptor.update(encrypted_data) + decryptor.finalize()
        
        # PKCS7 Unpadding
        padding_len = decrypted[-1]
        if padding_len < 1 or padding_len > 16:
            return decrypted.decode('utf-8')
            
        return decrypted[:-padding_len].decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to decrypt password: {e}")
        return ""
