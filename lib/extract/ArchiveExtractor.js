import CsvTransform from './CsvTransform';
import ScTransform from './ScTransform';
import File from '../file/File';
import ZipOperation from './ZipOperation';
import lzma from 'lzma-native';

export default class ArchiveExtractor {
  constructor(archivePath) {
    this.archivePath = archivePath;
    this.csvFiles = [];
    this.scFiles = {};
    this._csvFiles = [];
    this._scFiles = [];
    this._scTexFiles = [];
  }

  to = (extractionPath) => {
    const zip = new ZipOperation(this.archivePath);
    
    zip.onEntry = (entry) => {
      const file = new File(entry.name);
      if (file.not('csv','sc')) return;    

      // Call the file type handler on this class by extension name
      if(file.ext === 'sc') this._sc(zip, entry, file, extractionPath);
      else this._csv(zip, entry, file, extractionPath)
    };

    zip.onComplete = () => {
      this.scFiles = this._scFiles.map((scFile) => {
        let textureFile = null;
        let textureName = scFile.name + '_tex';

        this._scTexFiles.forEach(aTextureFile => {
          if (aTextureFile.name === textureName) textureFile = aTextureFile;
        });

        return {
          metadata: scFile,
          texture: textureFile
        }
      });
    };

    return zip.run();
  }


  _sc = (zip, zipEntry, source, dest) => {
    if (source.contains('tex')) this._scTexFiles.push(source);
    else this._scFiles.push(source);

    source.remove(['_highres','_lowres']).changePath(dest, 'tmp', 'sc');
    const t = new ScTransform();
    t.name = source.name;
    zip.extract(zipEntry, source, new ScTransform(), lzma.createDecompressor());
  }

  _csv = (zip, zipEntry, source, dest) => {
    source.changePath(dest, 'csv', source.parent);
    this._csvFiles.push(source);
    const t = new CsvTransform();
    t.name = source.name;
    zip.extract(zipEntry, source, t);
  }

}