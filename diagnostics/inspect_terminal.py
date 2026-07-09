import MetaTrader5 as mt5
import os
import glob

print("="*60)
print("MetaTrader5 Terminal Server (.srv) Finder")
print("="*60)

# Initialize MT5
print("Attempting to initialize MetaTrader 5...")
initialized = mt5.initialize()

if not initialized:
    print(f"\n[ERROR] Failed to initialize MetaTrader 5.")
    print(f"Error details: {mt5.last_error()}")
    print("\nPossible reasons:")
    print("1. MetaTrader 5 is not installed on this machine.")
    print("2. The MT5 terminal is installed but not found in system PATH (try passing path to mt5.initialize(path=...)).")
    print("3. MT5 architecture mismatch (Ensure you use 64-bit Python and 64-bit MT5).")
    print("="*60)
    exit(1)

print("[SUCCESS] MetaTrader 5 initialized successfully.")

# Get terminal information
info = mt5.terminal_info()
if not info:
    print(f"[ERROR] Failed to fetch terminal info: {mt5.last_error()}")
    mt5.shutdown()
    exit(1)

# Display paths
data_path = info.data_path
print(f"\nTerminal Path: {info.path}")
print(f"Data Directory Path: {data_path}")

config_path = os.path.join(data_path, "config")
print(f"Config Directory Path: {config_path}")

if os.path.exists(config_path):
    # Find all .srv files
    srv_pattern = os.path.join(config_path, "*.srv")
    srv_files = glob.glob(srv_pattern)
    
    print(f"\nAvailable Server files (.srv) found (Total: {len(srv_files)}):")
    if srv_files:
        for idx, f in enumerate(sorted(srv_files), 1):
            filename = os.path.basename(f)
            # Remove extension for clean server name representation
            server_name = os.path.splitext(filename)[0]
            print(f"  {idx}. {server_name}  (File: {filename})")
    else:
        print("  No .srv files found in the config folder.")
else:
    print(f"\n[WARNING] Config folder does not exist at path: {config_path}")

# Shutdown MT5 connection
mt5.shutdown()
print("="*60)
