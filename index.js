'use strict'

var QConfig = require('./qconfig.js')

// require returns the configuration loaded for the calling file
module.exports = new QConfig().load()

if (!('QConfig' in module.exports)) {
    // make QConfig available as a hidden property on the configuration,
    // unless the configuration itself contains a QConfig field
    Object.defineProperty(module.exports, 'QConfig', {value: QConfig, writable: true, enumerable: false, configurable: true})
}
