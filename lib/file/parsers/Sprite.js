import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import Log from '../../log/Log';
import { Parser } from 'binary-parser';
import File from '../File';
import Polygon from '../../geometry/Polygon';
import { error } from 'util';

const point32 = new Parser()
  .endianess('little')
  .int32('x')
  .int32('y');

const point16 = new Parser()
  .endianess('little')
  .uint16('x')
  .uint16('y');


const shape = new Parser()
  .endianess('little')
  .uint8('type')
  .uint32('size')
  .uint8('textureIndex')
  .uint8('pointCount')
  .array('spritePoints', {
    type: point32,
    length: 'pointCount'
  })
  .array('texturePoints', {
    type: point16,
    length: 'pointCount'
  });

const scObject = new Parser()
  .endianess('little')
  .uint8('type')
  .uint32('size')
  .buffer('data', {length: 'size'});

const parser = new Parser()
  .endianess('little')
  .create(() => new Sprite())
  .uint16('uid')
  .uint16('shapeCount')
  .uint16('pointCount')
  .array('shapes', {
    type: shape,
    length: 'shapeCount'
  })
  .array('extraObjects', {
    type: scObject,
    readUntil: function(item){
      if(item.type === 0) return true;
      else return false;
    }
  });

export default class Sprite {

  static from(type, data, parentName, objectIndexes){
    const { textures } = objectIndexes;
    const sprite = parser.parse(data);
    sprite.type = type;
    sprite.textures = textures;

    if(!sprite.isValid()) Log.warn(`Sprite (${parentName})`, 'Invalid sprite type found');
    sprite._deNormalizeShapes();
    sprite._calculateDimensions();
    sprite._calculateTransformations();
    return sprite;
  }

  _calculateTransformations() {
    this.shapes.forEach((shape) => {
      shape.textureRotation = Math.round(Polygon.getRotation(shape.texturePoints, shape.spritePoints));
      shape.textureMirrored = Polygon.isMirrored(shape.texturePoints, shape.spritePoints);
    });
  }

  _calculateDimensions() {
    const bounds = { width: 0, height: 0, minX: 65535, minY: 65535, maxX: -65535, maxY: -65535 };

    this.shapes.forEach((shape) => {
      shape.bounds = Polygon.bounds(shape.spritePoints);
      shape.textureBounds = Polygon.bounds(shape.texturePoints);

      bounds.minX = Math.min(bounds.minX, shape.bounds.minX);
      bounds.maxX = Math.max(bounds.maxX, shape.bounds.maxX);
      bounds.minY = Math.min(bounds.minY, shape.bounds.minY);
      bounds.maxY = Math.max(bounds.maxY, shape.bounds.maxY);
    });

    bounds.width = bounds.maxX - bounds.minX;
    bounds.height = bounds.maxY - bounds.minY;

    bounds.offsetX = -bounds.minX;
    bounds.offsetY = -bounds.minY;

    this.bounds = bounds;
  }

  _deNormalizeShapes() {
    this.shapes.forEach((shape) => {
      this._convertTexturePolygon(shape.texturePoints, this.textures[shape.textureIndex]);
      this._convertSpritePolygon(shape.spritePoints);
    });
  }

  /**
   * Shape.texturePoints:
   * the sprite points in the sprite sheet: these are normalized between 0000 and FFFF. 
   * To get the real coordinates, divide the resulting integer by 65535 
   * and multiply by the spritesheet's width or height.
   */
  _convertTexturePolygon (polygon, texture) {
    polygon.forEach((point) => {
      point.x = Math.round(point.x * texture.widthFactor);
      point.y = Math.round(point.y * texture.heightFactor);
    });
  }

  /**
   * Shape.spritePoints:
   * there are negative numbers to align all sprites in the origin. 
   * This is useful when building a unit's animation. 
   * The coordinates are 10x the width/height of the final sprite.
   */
  // TODO the 0.05 might be wrong (it might be 0.1)
  _convertSpritePolygon (polygon) {
    let minX = 65535;
    let minY = 65535;

    polygon.forEach((point) => {
      point.x *= 0.05;
      point.y *= 0.05;
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
    });
  }

  _getShapeImages () {
    return Promise.all(this.shapes.map((shape, index) => {
      
      if (shape.textureBounds.width === 0 
        || shape.textureBounds.width === NaN
        || shape.textureBounds.height === 0
        || shape.textureBounds.height === NaN) return Promise.resolve;

      const extract = { left: shape.textureBounds.x, top: shape.textureBounds.y, width: shape.textureBounds.width, height: shape.textureBounds.height };
      const mask = Polygon.asSvg(shape.texturePoints, shape.textureBounds, {zero: true});

      const texture = this.textures[shape.textureIndex];
      if (!texture.image) return Promise.resolve();  

      return new Promise((resolve, reject) => {
        texture.image
          .extract(extract)
          .overlayWith(mask, {cutout: true})
          .raw()
          .toBuffer((err, data, info) => {
            if (err) return reject();
            const rotation = shape.textureRotation % 90 === 0 ? shape.textureRotation : 0;

            sharp(data, { raw: info })
              .flip(shape.textureMirrored)
              .rotate(rotation)
              .resize(Math.round(shape.bounds.width), Math.round(shape.bounds.height), { kernel: 'lanczos3', interpolator: 'bilinear' })
              .raw()
              .toBuffer((err, data, info) => {
                if (err) return reject();

                if (shape.textureRotation % 90 !== 0) console.log('Rot', this.name, shape.name);
                // TODO rotate via node if non 90 degree rotation
                // TODO adjust imageInfo

                shape.image = data;
                shape.imageInfo = info;

                resolve();
              });
          });
      });
    }));
  }

  async to (folderPath) {
    const file = new File(path.join(folderPath, `${this.name}.png`));
    const jsonFile = new File(path.join(folderPath, `${this.name}.json`));

    await this._getShapeImages();

    const imageDimensions = {
      width: Math.round(this.bounds.width),
      height: Math.round(this.bounds.height),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    };

    let image = sharp(null, { create: imageDimensions });

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      
      if (shape.image){
        const rawImage = await image.overlayWith(shape.image, {raw: shape.imageInfo, left: Math.round(shape.bounds.minX + this.bounds.offsetX), top: Math.round(shape.bounds.minY + this.bounds.offsetY)}).toBuffer();
        image = sharp(rawImage, { raw: imageDimensions });
      } 
    }

    file.ensurePath();
    
    // fs.writeFileSync(jsonFile.path, JSON.stringify(this), 'utf8');
    await image.png().toFile(file.path);
  }

  isValid() {
    if(this.extraObjects.length !== 1) Log.info(`Sprite (${parentName} - ${this.exportName})`, `${this.extraObjects.length - 1} Extra objects found.`);
    return (this.type === 18 || this.type === 2);
  }

}