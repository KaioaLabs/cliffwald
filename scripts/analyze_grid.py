from PIL import Image
import os

def print_grid(name, path):
    print(f"\n--- Analyzing {name} ---")
    try:
        img = Image.open(path)
        tile_w, tile_h = 16, 16
        cols = img.width // tile_w
        rows = img.height // tile_h
        
        print(f"Dimensions: {img.width}x{img.height}")
        print(f"Potential Grid: {cols} cols x {rows} rows")
        
        for r in range(rows):
            line = f"Row {r}: "
            count = 0
            for c in range(cols):
                # Check center 8x8 pixels of the tile for non-transparent content
                has_content = False
                for y in range(r*tile_h + 4, r*tile_h + 12):
                    for x in range(c*tile_w + 4, c*tile_w + 12):
                        if x < img.width and y < img.height:
                            pixel = img.getpixel((x, y))
                            # Check alpha
                            if pixel[3] > 0:
                                has_content = True
                                break
                    if has_content: break
                
                if has_content:
                    line += "[X]"
                    count += 1
                else:
                    line += "[ ]"
            print(f"{line} (Count: {count})")
            
    except Exception as e:
        print(f"Error: {e}")

print_grid("Idle Sheet", "assets/sprites/player_idle.png")
print_grid("Run Sheet", "assets/sprites/player_run.png")

