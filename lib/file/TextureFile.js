import fs from 'fs';
import { Parser } from 'binary-parser';
import Texture from './parsers/Texture';
import path from 'path';

export default class TextureFile {
  
  constructor(file) {
    this._file = file;
    this.name = this._file.name.replace('_tex','');
  }

  decode() {
    return new Promise((resolve, reject) => {
      fs.readFile(this._file.path, (err, data) => {
        if (err) return reject(err);
        const textures = Texture.multipleFrom(data, this.name);
        this.textures = textures;
        resolve(this);
      });
    });
  }

  to(folderPath) {
    return Promise.all(this.textures.map((texture) => {
      return texture.to(path.join(folderPath, this.name));
    }));
  }

}