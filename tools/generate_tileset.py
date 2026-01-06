from PIL import Image, ImageDraw

def create_tileset():
    # 3 tiles: Grass (Green), Floor (Light Gray), Wall (Dark Gray)
    # Size 96x32 (3 tiles of 32x32)
    width = 96
    height = 32
    img = Image.new('RGB', (width, height), color='black')
    draw = ImageDraw.Draw(img)

    # Tile 1: Grass (Green)
    draw.rectangle([0, 0, 31, 31], fill=(34, 139, 34), outline=(0, 100, 0))
    
    # Tile 2: Floor (Light Gray)
    draw.rectangle([32, 0, 63, 31], fill=(180, 180, 180), outline=(150, 150, 150))
    
    # Tile 3: Wall (Dark Gray)
    draw.rectangle([64, 0, 95, 31], fill=(60, 60, 60), outline=(40, 40, 40))

    img.save('assets/maps/tilesets/placeholder_tiles.png')
    print("Tileset 32x32 generated.")

if __name__ == "__main__":
    create_tileset()
