import os
import sys
from dotenv import load_dotenv
from logger import logger

# Load .env file
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# Required environment variables
REQUIRED_VARS = [
    'NODE_API_URL',
    'INTERNAL_API_KEY',
    'ENCRYPTION_KEY'
]

# Validation
missing_vars = []
for var in REQUIRED_VARS:
    if not os.getenv(var):
        missing_vars.append(var)

if missing_vars:
    logger.critical(f"Missing required environment variables: {', '.join(missing_vars)}")
    sys.exit(1)

# Config constants
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
MT5_LOGIN = int(os.getenv('MT5_LOGIN')) if os.getenv('MT5_LOGIN') else None
MT5_PASSWORD = os.getenv('MT5_PASSWORD')
MT5_SERVER = os.getenv('MT5_SERVER')
NODE_API_URL = os.getenv('NODE_API_URL').rstrip('/')
INTERNAL_API_KEY = os.getenv('INTERNAL_API_KEY')
DRY_RUN = os.getenv('DRY_RUN', 'False').lower() == 'true'

logger.info(f"Configurations loaded successfully. Dry Run: {DRY_RUN}")
