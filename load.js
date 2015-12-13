'use strict'

var QConfig = require('./qconfig.js')

// require('qconfig/load')() is a one-shot custom config loader
module.exports = function( env, opts ) {
    if (opts === undefined) { opts = env; env = null }
    opts = opts || {}
    opts.caller = QConfig.getCallingFile(new Error().stack, __filename)
    return new QConfig(opts).load(env)
}
