import { Container, TilingSprite, Texture } from 'pixi.js';

interface ParallaxLayer {
    sprite: TilingSprite;
    speed: number;
}

export class ParallaxBackground {
    public container: Container;
    private layers: ParallaxLayer[];

    constructor(textures: { texture: Texture, speed: number }[], screenWidth: number, screenHeight: number) {
        this.container = new Container();
        this.layers = [];

        for (const layerData of textures) {
            const sprite = new TilingSprite(layerData.texture, screenWidth, screenHeight);
            this.container.addChild(sprite);
            this.layers.push({ sprite: sprite, speed: layerData.speed });
        }
    }

    public update(cameraX: number, cameraY: number) {
        for (const layer of this.layers) {
            layer.sprite.tilePosition.x = cameraX * layer.speed;
            layer.sprite.tilePosition.y = cameraY * layer.speed;
        }
    }
}