export default class Polygon {

  static getRotation(ply1, ply2){
    if (ply1.length < 2 || ply2.length < 2) {
      return 0;
    }

    const angle1 = Polygon.getAngleDegrees(ply1[0], ply1[1]);
    const angle2 = Polygon.getAngleDegrees(ply2[0], ply2[1]);

    return angle2 - angle1;
  }

  static toZero(ply, bounds) {
    let offsetX = -bounds.minX;
    let offsetY = -bounds.minY;

    return ply.map((point) => {
      return {x: point.x + offsetX, y: point.y + offsetY};
    });
  }

  // TODO implement mirroring and rotating
  static asSvg(ply, bounds = null, options) {
    if (!bounds) bounds = Polygon.bounds(ply);
    if (options.zero) ply = Polygon.toZero(ply, bounds);
    const svgPoints = ply.map((point) => `${point.x},${point.y}`).join(' ');
    return Buffer.from(`
    <svg><polygon points="${svgPoints}" /></svg>
    `,'utf8');
  }

  static bounds(ply) {
    const bounds = { width: 0, height: 0, minX: 65535, minY: 65535, maxX: -65535, maxY: -65535 };

    for (let i = 0, len = ply.length; i < len; i++) {
      const { x, y } = ply[i];
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
    }

    bounds.width = bounds.maxX - bounds.minX;
    bounds.height = bounds.maxY - bounds.minY;
    bounds.x = bounds.minX;
    bounds.y = bounds.minY;

    return bounds;
  }

  static getAngleDegrees (p1, p2) {
    return  Math.atan2( p2.y - p1.y, p2.x - p1.x ) * 180 / Math.PI;
  }

  static isClockwise(ply){
    let sum = 0;

    for (let i = 0, len = ply.length; i < len; i++) {
      const p1 = ply[i];
      const p2 = ply[(i + 1) % len];
      sum += (p2.x - p1.x) * (p2.y + p1.y);
    }

    return sum > 0;
  }

  static isMirrored(ply1, ply2) {
    const cw1 = Polygon.isClockwise(ply1);
    const cw2 = Polygon.isClockwise(ply2);

    return (cw1 !== cw2);
  }

  static getScale(bounds1, bounds2) {

  }


}