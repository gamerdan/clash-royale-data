import Log from '../log/Log';
import StreamZip from 'node-stream-zip';
import fs from 'fs';

/**
 * Tracks a set of stream operations on a zip archive.
 */

export default class ZipOperation {
  constructor(archivePath) {
    this.archivePath = archivePath;
    this.resolve = null;
    this.reject = null;
    this.allOperationsIn = false;
    this.operationCount = 0;
    this.totalOperationCount = 0;
    this.onEntry = null;
    this.onComplete = null;
    this.onProgress = null;
  }

  run(entriesCallback){
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;

      if (!this.onEntry){
        this.reject(new Error('onEntry callback must be defined before calling run.'));
        return;
      } 

      this.zip = new StreamZip({
        file: this.archivePath,
        storeEntries: false
      });
  
      this.zip.on('entry', this.onEntry);
      this.zip.on('error', err => this.reject(err));
      this.zip.on('ready', err => {
        this.allOperationsIn = true;
        this._checkStatus();
      });
    });
  }

  extract = (zipEntry, destinationFile, transformStream, decodeStream = null) => {
    destinationFile.ensurePath();
    const writeStream = fs.createWriteStream(destinationFile.path);

    this.zip.stream(zipEntry, (err, zipStream) => {
      this._trackOperation([zipStream, transformStream, decodeStream, writeStream], destinationFile.path);
      if(decodeStream) zipStream.pipe(transformStream).pipe(decodeStream).pipe(writeStream);
      else zipStream.pipe(transformStream).pipe(writeStream);
    });
  }

  _operationError(err, name){
    this.operationCount--;
    Log.error(name, err.message);
    this._checkStatus();
  }

  _operationComplete(name){
    this.operationCount--;
    this._checkStatus();
  }

  _checkStatus(){
    if (this.operationCount === 0 && this.allOperationsIn) {
      if(this.onComplete) this.onComplete();
      this.zip.close();
      this.resolve();
    }
  }

  _trackOperation(streams, name){
    this.operationCount++;
    let streamCount = 0;
    streams.forEach(stream => {
      if(stream === null) return;
      streamCount++;
      const errCallback = (err) => {
        this._operationError(err, name);
      }

      stream.on('error', errCallback);

      stream.once('finish', () => {
        stream.removeListener('error', errCallback);
        streamCount--;
        if(streamCount === 0) this._operationComplete();
      });
    });
  }

}