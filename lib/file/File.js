import path, { basename } from 'path';
import fs from 'fs';

/**
 * Simple file to abstract away path operations and include some easy file and path methods.
 * Any public method relates to the filename unless the method includes 'path'.
 * All methods that do not expect a return will return the file to allow for chaining.
 */

const sep = path.sep;

export default class File {

  constructor(filePath) {
    this._init(filePath);
  }

  _init(filePath) {
    this.path  = filePath;
    this.dir  = path.dirname(filePath);
    this.file  = path.basename(filePath); 
    this.ext   = path.extname(this.file).replace('.','');
    this.name  = this.file.replace('.' + this.ext, '');
    this.parent   = this.dir.split(path.sep).pop();
    this.title = this.name.replace('_', '');
  }

  /**
   * Remove an array of strings from the filename
   * @param {array} strings 
   */
  remove(strings) {
    let newFileName = this.file;
    strings.forEach(string => newFileName = newFileName.replace(string, ''));
    this._init(this.path + sep + newFileName );
    return this;
  }

    /**
   * Checks if this file matches any of the extensions passed
   * @param {array} extensions -- a list of extensions to check 
   */
  is(...extensions) {
    return extensions.includes(this.ext);
  }

  /**
   * Checks if this file does not match any of the extensions passed
   * @param {array} extensions -- a list of extensions to check 
   */
  not(...extensions) {
    return !extensions.includes(this.ext);
  }

  /**
   * Check if the file name includes a string
   * @param {string} needle 
   */
  contains(needle) {
    return this.file.includes(needle);
  }

  changePath(...parts) {
    const newPath = parts.join(sep);
    this._init(newPath + sep + this.file);
    return this;
  }

  /**
   * Ensures that the directory exists for the file path
   */
  ensurePath() {
    const initDir = path.isAbsolute(this.dir) ? sep : '';
    this.dir.split(sep).reduce((parentDir, childDir) => {
      const curDir = path.resolve(parentDir, childDir);
      if (!fs.existsSync(curDir)) {
        fs.mkdirSync(curDir);
      }
    
      return curDir;
    }, initDir);
    return this;
  }

}