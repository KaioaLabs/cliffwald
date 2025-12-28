from PIL import Image, ImageDraw

def create_tileset():
    # 3 tiles: Grass (Green), Dirt (Brown), Stone (Gray)
    # Size 48x16 (3 tiles of 16x16)
    width = 48
    height = 16
    img = Image.new('RGB', (width, height), color='black')
    draw = ImageDraw.Draw(img)

    # Tile 1: Grass (Green)
    draw.rectangle([0, 0, 15, 15], fill=(34, 139, 34), outline=(0, 100, 0))
    
    # Tile 2: Dirt (Brown)
    draw.rectangle([16, 0, 31, 15], fill=(139, 69, 19), outline=(100, 50, 0))
    
    # Tile 3: Stone (Gray)
    draw.rectangle([32, 0, 47, 15], fill=(128, 128, 128), outline=(100, 100, 100))

    img.save('assets/maps/tilesets/placeholder_tiles.png')
    print("Tileset generated.")

if __name__ == "__main__":
    create_tileset()
