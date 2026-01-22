from PIL import Image, ImageDraw
import os

def create_tileset():
    # 6 tiles: Water, Grass, Stone, Wood, Path, Wall
    # Size 192x32 (6 tiles of 32x32)
    TILE_SIZE = 32
    NUM_TILES = 6
    width = TILE_SIZE * NUM_TILES
    height = TILE_SIZE
    
    img = Image.new('RGBA', (width, height), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Helper to draw tile at index
    def draw_tile(index, color, outline_color):
        x = index * TILE_SIZE
        draw.rectangle([x, 0, x + TILE_SIZE - 1, TILE_SIZE - 1], fill=color, outline=outline_color)

    # Tile 0 (GID 1 in Phaser): Water / Void
    draw_tile(0, (26, 26, 46), (10, 10, 30)) # Deep Blue

    # Tile 1 (GID 2): Grass (Land)
    draw_tile(1, (45, 90, 39), (30, 70, 25)) # Forest Green

    # Tile 2 (GID 3): Stone (Courtyard)
    draw_tile(2, (120, 120, 120), (100, 100, 100)) # Stone Gray

    # Tile 3 (GID 4): Wood (Interior)
    draw_tile(3, (93, 64, 55), (62, 39, 35)) # Wood Brown

    # Tile 4 (GID 5): Path / Dirt
    draw_tile(4, (62, 39, 35), (40, 20, 20)) # Dark Path

    # Tile 5 (GID 6): Wall / Cliff Edge
    draw_tile(5, (20, 20, 20), (0, 0, 0)) # Almost Black

    output_path = 'assets/maps/tilesets/placeholder_tiles.png'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Tileset {width}x{height} generated at {output_path}")

if __name__ == "__main__":
    create_tileset()
