import gm from 'gm';
import File from '../file/File';

export default class Image {

  constructor(bytes){
    this.image = gm(bytes);
  }

  to(file) {
    file.ensurePath();
    return new Promise((resolve, reject) => {
      this.image.write(file.path, (err) => {
        if (err) return reject(err);
        else resolve();
      });
    });
  }

}