import { Parser } from 'binary-parser';
import sharp from 'sharp';
import path from 'path';
import Pixels from './Pixels';
import File from '../File';

const texture = new Parser()
  .endianess('little')
  .int8('type')
  .uint32('size')
  .int8('pixelType')
  .uint16('width')
  .uint16('height')
  .buffer('pixelData', {length: function(){
    return this.size - 5;
  }});

const parser = new Parser()
  .array('textures', {
    type: texture,
    readUntil: function(item, buffer) { 
      return buffer[0] === 0;
    }
  });

export default class Texture {

  constructor (data, name) {
    this.name = name;
    this.type = data.type;
    this.size = data.size;
    this.width = data.width;
    this.height = data.height;
    this.pixelType = data.pixelType;
    this.widthFactor = this.width / 65535;
    this.heightFactor = this.height / 65535;

    if(this.type === 0) {
      console.log('invalid texture',this.name, this, data.pixelData.length);
      return;
    }

    console.log('texture', name, 'pixel type', this.pixelType);
    let pixelData = Pixels.decode(data.pixelData, data.pixelType, data.type, data.width, data.height);
    this.isPremultiplied = (data.pixelType !== 0);
    if (pixelData) this.image = sharp(pixelData, { raw: { width: this.width, height: this.height, channels: 4, premultiplied: true} });

  }

  to (folderPath) {
    if (this.image) {
      const file = new File(path.join(folderPath, this.name + '.png'));
      file.ensurePath();
      return this.image.toFile(file.path);
    }
    console.log('no image');
    return Promise.resolve;
  }

  static multipleFrom(data, name){
    const textureData = parser.parse(data);
    return textureData.textures.map((textureData, index) => new Texture(textureData, name + '_' + index));
  }

}