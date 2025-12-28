from PIL import Image
import os

def analyze_sheet(path):
    full_path = os.path.join("assets_External/Eris Esra's Character Template 4.0/16x16", path)
    try:
        img = Image.open(full_path)
        print(f"File: {path}")
        print(f"Dimensions: {img.width}x{img.height}")
        # Assuming 16x16 tiles
        cols = img.width // 16
        rows = img.height // 16
        print(f"Grid (16x16): {cols} cols x {rows} rows")
    except Exception as e:
        print(f"Error reading {path}: {e}")

analyze_sheet("16x16 Idle-Sheet.png")
analyze_sheet("16x16 Run-Sheet.png")
analyze_sheet("16x16 Walk-Sheet.png")
