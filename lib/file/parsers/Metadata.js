import { Parser } from 'binary-parser';
import Log from '../../log/Log';
import Sprite from './Sprite';
import MovieClip from './MovieClip';

/**
 * Simple string parser
 * @param {int8} len
 * @param {string} value
 */
const string = new Parser()
  .endianess('little')
  .int8('len')
  .string('value',{
    length: 'len'
  });

/**
/**
 * Exports ID Parser
 * @param {uint16} len
 * @param {string} value
 */
const id = new Parser()
  .endianess('little')
  .uint16('id')

/**
 * Exports parser
 * @param {uint16} exportsCount
 * @param {array<uint16>} exportIDs 
 * @param {array<string>} exportNames 
 */
const exports = new Parser()
  .endianess('little')
  .uint16('count')
  .array('ids', {
    type: id,
    length: 'count',
    formatter: (arr) => arr.map((str) => str.id) 
  })
  .array('names', {
    type: string,
    length: 'count',
    formatter: (arr) => arr.map((str) => str.value) 
  });

const scObject = new Parser()
  .endianess('little')
  .uint8('type')
  .uint32('size')
  .buffer('data', {length: 'size'});


/**
 * Metadata format:
 * Little Endian
 * @param {uint16} spriteCount
 * @param {uint16} animationCount
 * @param {uint16} textureCount
 * @param {uint16} textCount
 * @param {uint16} transformCount
 * @param {uint16} colorTransformCount
 * @param {byte[5]} skipped
 * @param {uint16} exportsCount
 * @param {array<uint16>} exportIDs 
 * @param {array<string>} exportNames 
 * 
 * Followed by a list of scObjects in this format
 * @param {uint8} objectType
 * @param {uint32} objectSize
 * @param {byte[objectSize]} objectBytes -- See individual object parsers for format
 */
const parser = new Parser()
  .endianess('little')
  .create(() => new Metadata())
  .uint16('spriteCount')
  .uint16('movieClipCount')
  .uint16('textureCount')
  .uint16('textCount')
  .uint16('transformCount')
  .uint16('colorTransformCount')
  .skip(5)
  .nest('exports', {
    type: exports
  })
  .array('ignored', {
    type: scObject,
    readUntil: (item, buffer) => {
      const type = buffer.readUInt8();
      return (type !== 26 && type !== 23);
    }
  })
  .array('textures', {
    type: scObject,
    length: 'textureCount'
  })
  .array('sprites', {
    type: scObject,
    length: 'spriteCount'
  })
  .array('texts', {
    type: scObject,
    length: 'textCount'
  })
  .array('transforms', {
    type: scObject,
    length: 'transformCount'
  })
  .array('colorTransforms', {
    type: scObject,
    length: 'colorTransformCount'
  })
  .array('movieClips', {
    type: scObject,
    length: 'movieClipCount'
  })


export default class Metadata {

  /**
   * Returns a metadata object with 
   * @param {Buffer} data -- The metadata bytes to parse
   * @param {array<Texture>} textures -- a list of textures to use in place of the ones in the file
   * @returns {Metadata} -- A metadata object 
   */
  static from(data, name, textures = null){
    const metadata = parser.parse(data);
    metadata.name = name;
    metadata.indexExports();
    metadata.mergeTextures(textures);
    metadata.parseObjects();
    return metadata;
  }

  indexExports() {
    const newExports = {};
    this.exports.ids.forEach((id, index) => {
      newExports[id] = this.exports.names[index];
    });
    this.exports = newExports;
  }

  indexSprites() {
    const spriteIndex = {};
    this.sprites.forEach((sprite) => {
      spriteIndex[sprite.uid] = sprite;
    });
    this.spriteIndex = spriteIndex;
  }

  mergeTextures(newTextures) {
    if (newTextures) {
      newTextures.forEach((texture, index) => {
        this.textures[index] = texture;
      });
    }
  }

  parseObjects() {
    this.sprites = this._parseObjects(this.sprites, Sprite, { exports: this.exports, textures: this.textures });
    this.indexSprites();
    this.movieClips = this._parseObjects(this.movieClips, MovieClip, { exports: this.exports, sprites: this.spriteIndex });
  }

  _parseObjects(objects, objectClass, objectIndexes) {
    return objects.map(object => objectClass.from(object.type, object.data, this.name, objectIndexes));
  }

  /**
   * Returns true if the metadata passes basic integrity checks
   * - Check that the object lengths match the actual parsed object arrays
   */
  isValid() {
    return (
      this.spriteCount === this.sprites.length
      && this.movieClipCount === this.movieClips.length
      && this.textureCount === this.textures.length
      && this.textCount === this.texts.length
      && this.transformCount === this.transforms.length
      && this.colorTransformCount === this.colorTransforms.length
    )
  }

}