import MetaTrader5 as mt5

print("="*60)
print("MetaTrader5 Python API Attribute & Function List")
print("="*60)

functions = []
constants = []
classes = []

for attr in dir(mt5):
    if attr.startswith("__"):
        continue
    val = getattr(mt5, attr)
    if callable(val):
        functions.append(attr)
    elif isinstance(val, type):
        classes.append(attr)
    else:
        constants.append(attr)

print(f"\n[Functions/Methods] (Total: {len(functions)}):")
for f in sorted(functions):
    print(f"  - {f}()")

print(f"\n[Classes/Objects] (Total: {len(classes)}):")
for c in sorted(classes):
    print(f"  - {c}")

print(f"\n[Constants/Variables] (Total: {len(constants)}):")
# Show first 15 constants and then total
for const in sorted(constants)[:15]:
    print(f"  - {const}")
print(f"  ... and {len(constants) - 15} more constants.")
print("="*60)
