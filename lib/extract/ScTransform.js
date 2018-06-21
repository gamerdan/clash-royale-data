import { Transform } from 'stream';
import lzma from 'lzma-native';

export default class ScTransform extends Transform {

    constructor(options){
      super(options);
      this._chunk = 0;
      this._buffer = new Buffer(0);
    }

    _transform(data, encoding, done) {

      this._chunk += 1;
      let tdata = null;
      
      if(this._chunk === 1) {
        const info = this._getInfo(data);
        if(info.magic !== 'SC'){
          this.emit('error', new Error('Invalid Sc File. Missing SC header.'));
          return;
        }
  
        if(info.sign === 'SCLZ'){
          this.emit('error', new Error('LZHAM Compression is not supported.'));
          return;
        }

        
        tdata = Buffer.concat([data.slice(26, 35), Buffer.from([0x00, 0x00, 0x00, 0x00]), data.slice(35)]);
      } else {
        tdata = data;
      }

      done(null, tdata);

    }

    // Returns information about an sc file
    _getInfo(data){
      let offset = 0;
      const magic = data.toString('utf-8', offset, 2);
      offset += 2;
      const version = data.readInt32BE(offset);
      offset += 4;
      const strLen = data.readInt32BE(offset);
      offset += 4;
      const str = data.toString('utf-8', offset, strLen);
      offset += strLen;
      const sign = data.toString('utf-8', offset, 4);

      if(sign === 'SCLZ') offset += 4;

      let lzmaOffset = offset;
      const lzma = data.toString('utf-8', lzmaOffset, 5);
      lzmaOffset+=5;
      const lzmaSize = data.readInt32LE(offset);

      return {magic, version, sign, offset, lzma, lzmaSize};

    }
}