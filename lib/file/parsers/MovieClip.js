import Log from '../../log/Log';
import { Parser } from 'binary-parser';

const transforms = new Parser()
  .endianess('little')
  .int16('transformIndex')
  .int16('colorTransformIndex')
  .int16('spriteIndex')

const string255 = new Parser()
  .endianess('little')
  .uint8('len')
  .string('value', {
    length: function(){ 
      return this.len === 255 ? 0 : this.len;
    }
  })

const frame = new Parser()
  .endianess('little')
  .uint8('type')
  .uint32('size')
  .uint8('num1')
  .uint8('num2')
  .nest('name', {
    type: string255
  })

const scObject = new Parser()
  .endianess('little')
  .uint8('type')
  .uint32('size')
  .buffer('data', {length: 'size'});

const parser = new Parser()
  .endianess('little')
  .create(() => new MovieClip())
  .uint16('uid')
  .uint8('fps')
  .uint16('frameCount')
  .uint16('transformCount')
  .int16('constant')
  .array('transforms', {
    type: transforms,
    length: 'transformCount'
  })
  .uint16('spriteCount')
  .array('spriteIds', {
    type: 'uint16le',
    length: 'spriteCount',
  })
  .array('spriteOpacities', {
    type: 'uint8',
    length: 'spriteCount',
  })
  .array('spriteNames', {
    type: string255,
    length: 'spriteCount',
    formatter: (arr) => arr.map((str) => str.value) 
  })
  .array('frames', {
    type: frame,
    length: 'frameCount'
  })
  .array('extraObjects', {
    type: scObject,
    readUntil: function(item){
      if(item.type === 0) return true;
      else return false;
    }
  })

export default class MovieClip {

  static from(type, data, parentName, objectIndexes){
    const { exports } = objectIndexes;
    const movieClip = parser.parse(data);
    movieClip.type = type;

    if (exports[movieClip.uid]) {
      movieClip.exportName = exports[movieClip.uid];
      movieClip.exported = true;
    } else {
      movieClip.exportName = 'no name';
      movieClip.exported = false;
    }

    if(!movieClip.isValid(parentName)) Log.warn(`Movie Clip (${parentName} - ${movieClip.exportName})`, 'Unknown Movie Clip type found');
    return movieClip;
  }

  

  isValid(parentName) {
    // if(this.extraObjects.length !== 1) Log.info(`Movie Clip (${parentName} - ${this.exportName})`, `${this.extraObjects.length - 1} Extra objects found.`);
    return (this.type === 3 || this.type === 10 || this.type === 12 || this.type === 14);
  }

}