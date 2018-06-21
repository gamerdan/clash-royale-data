export default class Pixels {

  static decode(pixelData, pixelType, imageType, width, height) {
    let outPixels;

    switch (pixelType) {
      case 0:
        outPixels = Pixels.rgba_depremultiply(pixelData);
        break;
      case 2:
        outPixels = Pixels.rgba_16(pixelData);
        break;
      case 4:
        outPixels = Pixels.rgba_565(pixelData);
        break;
      case 6:
        outPixels = Pixels.rgba_LA88(pixelData);
        break;
      case 8:
        outPixels = Pixels.rgba_233(pixelData);
        break;
      case 10:
        outPixels = Pixels.rgba_L8(pixelData);
        break;
      default:
        return false;
    }

    if (imageType === 28 || imageType === 27 || pixelType === 32) {
      return Pixels.demux(outPixels, width, height);
    }

    return outPixels;
  }

  // VERIFIED AS PRODUCING CORRECT IMAGES
  // RGBA 32 bit (SC Type 0)
  // R = 1 byte
  // G = 1 byte
  // B = 1 byte
  // A = 1 byte
  // Pixel color values are premultiplied, so we unpremultiply them
  static rgba_depremultiply(px) {
    const len = px.length;
    for (let i = 0; i < len; i += 4) {
      const a = px[i + 3];
      if (a === 0) continue;
      px[i] = (px[i] * 255) / a;
      px[i + 1] = (px[i + 1] * 255) / a;
      px[i + 2] = (px[i + 2] * 255) / a;
    }
    return px;
  }

  // UNVERIFIED
  // RGBA 16 bit (SC Type 2)
  static rgba_16(px) {
    const newPx = Buffer.alloc(px.length * 2);
    for (let i = 0, ii = 0, len = px.length; i < len; i += 2, ii += 4) {
      const colorData = px.readUInt16LE(i);
      newPx[ii] = ((colorData >> 12) & 0xF) << 4;   //R
      newPx[ii+1] = ((colorData >> 8) & 0xF) << 4;  //G
      newPx[ii+2] = ((colorData >> 4) & 0xF) << 4;  //B
      newPx[ii+3] = (colorData & 0xF) << 4;         //A
    }
    return newPx;
  }

  // VERIFIED AS PRODUCING CORRECT IMAGES
  // RGB 16 bit (SC Type 4)
  static rgba_565(px) {
    const newPx = Buffer.alloc(px.length * 2);
    for (let i = 0, ii = 0, len = px.length; i < len; i += 2, ii += 4) {
      const colorData = px.readUInt16LE(i);
      newPx[ii] = ((colorData >> 11) & 0x1F) << 3;   //R
      newPx[ii+1] = ((colorData >> 5) & 0x3F) << 2;  //G
      newPx[ii+2] = (colorData & 0x1F) << 3;         //B
      newPx[ii+3] = 255;                             //A
    }
    return newPx;
  }

  // VERIFIED AS PRODUCING CORRECT IMAGES
  // RGBA LA88 16 bit (SC Type 6)
  static rgba_LA88(px) {
    const newPx = Buffer.alloc(px.length * 2, 1);
    for (let i = 0, ii = 0, len = px.length; i < len; i += 2, ii += 4) {
      const colorData = px.readUInt16LE(i);
      newPx[ii] =   colorData >> 8;    //R
      newPx[ii+1] = colorData >> 8;    //G
      newPx[ii+2] = colorData >> 8;    //B
      newPx[ii+3] = colorData & 0xFF;  //A
    }
    return newPx;
  }

  // UNVERIFIED
  // BGR233 10 bit SC Type 8
  static rgba_233(px) {
    const newPx = Buffer.alloc(px.length * 4, 1);
    for (let i = 0, ii = 0, len = px.length; i < len; i += 1, ii += 4) {
      const colorData = px.readUInt8(i);
      newPx[ii] = (colorData) & 0x3;                  //R
      newPx[ii+1] = ((colorData >> 2) & 0x7) << 2;  //G
      newPx[ii+2] = ((colorData >> 5) & 0x7) << 5;  //B
      newPx[ii+3] = 255;                              //A
    }
    return newPx;
  }

  // UNVERIFIED
  // L8 SC Type 10
  static rgba_L8(px) {
    const newPx = Buffer.alloc(px.length * 4, 1);
    for (let i = 0, ii = 0, len = px.length; i < len; i += 1, ii += 4) {
      const colorData = px.readUInt8(i);
      newPx[ii] = colorData;    //R
      newPx[ii+1] = colorData;  //G
      newPx[ii+2] = colorData;  //B
      newPx[ii+3] = 255;          //A
    }
    return newPx;
  }

  // TODO rename this shit and figure out how to do it better so it doesn't take up one quarter of the
  // whole processing time to do (Example: exporting all brawl stars textures takes 15 sec without demux and 20 sec with)
  static demux(px, width, height) {
    const newPx = Buffer.alloc((width * height) * 4);
    const h32 = Math.floor(height / 32);
    const hm32 = height % 32;
    const w32 = Math.floor(width / 32);
    const wm32 = width % 32;
    let offset = 0;

    for (let l = 0; l < h32; l++) {  
      for (let k = 0; k < w32; k++) {
        for (let j = 0; j < 32; j++) {
          for (let h = 0; h < 32; h++) {
            Pixels.setPixel(newPx, width, height, h+ (k * 32),j + (l * 32), px.slice(offset, offset + 4));
            offset += 4;
      }}}
      
      for (let j = 0; j < 32; j++) {
        for (let h = 0; h < wm32; h++) {
          Pixels.setPixel(newPx, width, height, h + (width - (width % 32)), j + (l * 32), px.slice(offset, offset + 4));
          offset += 4;
      }}
    }
  
    for (let k = 0; k < w32; k++) {
      for (let j = 0; j < hm32; j++) {
        for (let h = 0; h < 32; h++) {
          Pixels.setPixel(newPx, width, height, h + (k * 32),  j + (height - (height % 32)), px.slice(offset, offset + 4));
          offset += 4;
    }}}
  
    for (let j = 0; j < hm32; j++) {
      for (let h = 0; h < wm32; h++) {
        Pixels.setPixel(newPx, width, height, h + (width - (width % 32)), j + (height - (height % 32)), px.slice(offset, offset + 4));
        offset += 4;
    }}

    return newPx;
  }

  // set a 4 byte pixel at the proper x and y offset
  static setPixel(buff, w, h, x, y, pixel) {
    let i = x + w * y;
    i *= 4;
    buff[i] = pixel[0];
    buff[i + 1] = pixel[1];
    buff[i + 2] = pixel[2];
    buff[i + 3] = pixel[3];
  }
}