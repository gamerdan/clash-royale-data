import { Transform } from 'stream';
import lzma from 'lzma-native';

export default class ScTransform extends Transform {

    constructor(options){
      super(options);
      this._chunk = 0;
      this._compressed = false;
      this._buffer = new Buffer(0);
    }

    _transform(data, encoding, done) {

      this._chunk += 1;
      let tdata = null;
      
      if(this._chunk === 1) {
        if((data[0] === 0x5D || data[0] === 0x5E) && data[3] === 0x04 && data[4] === 0x00){
          this._compressed = true;
          tdata = Buffer.concat([data.slice(0, 9), Buffer.from([0x00, 0x00, 0x00, 0x00]), data.slice(9)]);
        } else {
          tdata = data;
        }
      } else {
        tdata = data;
      }
      
      this._buffer = Buffer.concat([this._buffer, tdata]);
      done(null,null);

    }

    _flush(done){
      if(this._compressed) {
        lzma.decompress(this._buffer, (result) => {
          this.push(result);
          done();
        });
      } else {
        this.push(this._buffer);
        done();
      }
    }

}