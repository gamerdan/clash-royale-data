import path from 'path';
import fs from 'fs';
import ArchiveExtractor from './lib/extract/ArchiveExtractor';
import MetadataFile from './lib/file/MetadataFile';
import TextureFile from './lib/file/TextureFile';

// Path to the apk for ipa file
const archivePath = path.join(__dirname, 'data', 'clash-royale-2-1-8.apk');

// Where to extract files to
const extractedPath = path.join(__dirname, 'assets', 'clash-royale-2-1-8');


const process = async () => {
  // Extract the CSV and SC files and decode them at the same time
  const archive = new ArchiveExtractor(archivePath);
  await archive.to(extractedPath);

  // Decode/export sequentially so that we don't have all sc files in memory at once
  for (let i = 0; i < archive.scFiles.length; i++) {
    const pair = archive.scFiles[i];
    const textureFile = await new TextureFile(pair.texture).decode();
    const metadataFile = await new MetadataFile(pair.metadata, textureFile).decode();

    // await textureFile.to(path.join(extractedPath, 'images'));
    await metadataFile.to(path.join(extractedPath, 'images'));
  }

}

process().then(() => {
  console.log('All done!');
}).catch((error) => {
  console.log(error);
});