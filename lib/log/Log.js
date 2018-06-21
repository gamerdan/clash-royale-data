import colors from 'colors';

const bars = {};

export default {

  error(on, info) {
    console.log('[error]'.red, on.green, ' -- ' + info)
  },

  warn(on, info) {
    console.log('[warn]'.yellow, on.green, ' -- ' + info)
  },

  info(on, info) {
    console.log('[info]'.blue, on.green, ' -- ' + info)
  }
}