import fs from 'fs';
import path from 'path';
import { Parser } from 'binary-parser';
import Metadata from './parsers/Metadata';
import Log from '../log/Log';

export default class MetadataFile {
  constructor(file, textureFile) {
    this._file = file;
    this._textureFile = textureFile;
    this.name = this._file.name;
  }

  decode() {
    return new Promise((resolve, reject) => {
      fs.readFile(this._file.path, (err, data) => {
        if (err) return reject(err);
        const metadata = Metadata.from(data, this._file.name, this._textureFile.textures);
        this.sprites = metadata.sprites;
        this.movieClips = metadata.movieClips;
        this.spriteIndex = {};

        this.sprites.forEach((sprite) => {
          this.spriteIndex[sprite.uid] = sprite;
        });

        this.movieClips.forEach((mc) => {
          if (mc.exported) {
            mc.spriteIds.forEach((spriteId, index) => {
              const sprite = this.spriteIndex[spriteId];
              if (sprite) {
                sprite.name = `${mc.exportName}_${index}`;
                sprite.exported = true;
              } 
            });
          }
        });

        if (!metadata.isValid()) Log.warn(this._file.name, 'Metadata counts do not match up');

        resolve(this);
      });
    });
  }

  to(folderPath) {
    return Promise.all(this.sprites.map((sprite) => {
      if (sprite.exported) return sprite.to(path.join(folderPath, this.name));
    }));
  }
}