/**
 * quick little configuration loader
 * Loads the configuration named by the NODE_ENV environment variable,
 * with support for inherited and override settings from other configurations.
 *
 * Copyright (C) 2015 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2015-10-01 - AR.
 */

'use strict'

var fs = require('fs')
var path = require('path')

function QConfig( opts ) {
    opts = opts || {}
    this.opts = {
        env: opts.env || process.env.NODE_ENV || 'development',
        caller: opts.caller || QConfig.getCallingFile(new Error().stack),
        dirname: opts.dirname || opts.dirName || 'config',
        configDirectory: opts.dir || opts.configDirectory || process.env.NODE_CONFIG_DIR || null,
        loader: opts.loader || require,
        extensions: opts.extensions || ['.js', '.json', '.coffee'],     // extensions to try, in order
    }
    this.opts.configDirectory = this.opts.configDirectory || this._locateConfigDirectory(this.opts.caller, this.opts.dirname)

    var qconf = this._loadConfigFile('qconfig.conf', this.opts.configDirectory, true)
    this.opts = this.merge(this.opts, qconf)
    this.opts = this.merge(this.opts, opts)

    this.preload = this._installLayers([], {
        default: [],
        development: ['default'],
        staging: ['default'],
        production: ['default'],
        canary: ['production'],
        custom: ['production'],
    })
    this.postload = []
    if (this.opts.layers) this._installLayers(this.preload, this.opts.layers)
    if (this.opts.preload) this._installLayers(this.preload, this.opts.preload)
    if (this.opts.postload) this._installLayers(this.postload, this.opts.postload)

    this.opts.loader = this._normalizeLoader(this.opts.loader, this.opts.extensions)
}

QConfig.prototype = {
    opts: null,
    preload: null,
    postload: null,
    _depth: 0,

    load: function load( env, configDirectory, _nested ) {
        var env = env || this.opts.env
        var configDirectory = configDirectory || this.opts.configDirectory
        if (!configDirectory || !this._isDirectory(configDirectory)) return {notConfigured: true}      // no config directory
        var calledFrom = QConfig.getCallingFile(new Error().stack)

        this._depth += 1
        if (this._depth > 100) throw new Error("runaway layer recursion")
        var config = {}, layers

        // install the preload layers
        layers = this._findLayers(this.preload, env)
        if (layers) for (var i=0; i<layers.length; i++) {
            this.merge(config, this.load(layers[i]), configDirectory, true)
        }

        this.merge(config, this._loadConfigFile(env, configDirectory, _nested))

        // install the postload layers
        layers = this._findLayers(this.postload, env)
        if (layers) for (var i=0; i<layers.length; i++) {
            this.merge(config, this.load(layers[i]), configDirectory, true)
        }

        this._depth -= 1
        return config
    },

    _installLayers: function _installLayers( layerStack, layering ) {
        if (Array.isArray(layering)) {
            for (var i=0; i<layering.length; i++) {
                if (typeof layering[i][0] === 'string' || layering[i][0] instanceof RegExp) {
                    layerStack.push(layering[i])
                }
            }
        }
        else for (var name in layering) {
            var inheritsFrom = layering[name] 
            if (name[0] === '/' && name.lastIndexOf('/') > 0) {
                var flagIdx = name.lastIndexOf('/')
                var pattern = new RegExp(name.slice(1, flagIdx), name.slice(flagIdx+1))
                layerStack.push([pattern, inheritsFrom])        // regex object from string
            }
            else {
                layerStack.push([name, inheritsFrom])           // string
            }
        }
        return layerStack
    },

    _findLayers: function _findLayers( layers, env ) {
        // linear search newest to oldest, newest matching entry wins
        for (var i=layers.length-1; i>=0; i--) {
            // TODO: if (layers[i][0] == env || layers[i][0].test && layers[i][0].test(env)) return layres[i][1]
            if (typeof layers[i][0] === 'string') {
                if (layers[i][0] === env) return layers[i][1]
            }
            else {
                if (layers[i][0].test(env)) return layers[i][1]
            }
        }
        return null
    },

    _loadConfigFile: function _loadConfigFile( env, configDirectory, _silenced ) {
        var file = configDirectory + "/" + env
        var filename, loader = this.opts.loader
        for (var ext in loader) {
            filename = file + ext
            try { return fs.statSync(filename) && loader[ext](filename) }
            catch (err) { if (err.message.indexOf('Cannot find') == -1 && err.message.indexOf('ENOENT') == -1) throw err }
        }
        // if the user-supplied loader does not succeed, fall back to the built-in require()
        try { return require(file) } catch (e) { return {} }
        // warn if the requested environment is not configured
        if (!_silenced) console.log("qconfig: env '%s' not configured (NODE_ENV=%s)", env, process.env.NODE_ENV)
    },

    _normalizeLoader: function _normalizeLoader( loader, extensions ) {
        if (typeof this.opts.loader === 'function') {
            if (!Array.isArray(extensions)) extensions = []
            if (!extensions.length) exts.push('')
            var extensionLoader = {}
            for (var i in extensions) extensionLoader[extensions[i]] = loader
            return extensionLoader
        }
        else return loader
    },

    _isHash: function _isHash( a ) {
        return (a) && Object.prototype.toString.call(a) === '[object Object]'
    },

    // recursively merge layer into base, overriding existing in base
    merge: function merge( base, layer, _depth ) {
        _depth = _depth || 0
        if (_depth > 100) throw new Error("runaway merge recursion")
        for (var k in layer) {
            if (this._isHash(base[k]) && this._isHash(layer[k])) this.merge(base[k], layer[k], _depth+1)
            else base[k] = layer[k]
        }
        return base
    },

    _locateConfigDirectory: function _locateConfigDirectory( basepath, dirName ) {
        var pathname = (basepath || ".") + '/' + dirName
        if (this._isDirectory(pathname)) return pathname
        else return (basepath.indexOf('/') >= 0 && basepath !== '/') ? this._locateConfigDirectory(path.dirname(basepath), dirName) : null
    },

    _isDirectory: function _isDirectory( dirname ) {
        try { return fs.statSync(dirname).isDirectory() }
        catch (err) { return false }
    },
}

QConfig.getCallingFile = function getCallingFile( stack, filename ) {
    filename = filename || __filename
    var myFilename = new RegExp("/" + path.basename(filename) + ":[0-9]+:[0-9]+[)]$")
    var qconfigFilename = new RegExp("/qconfig/")
    var qconfigTestfile = new RegExp("/qconfig/test/")
    var builtinFilename = new RegExp("[(][^/]*:[0-9]+:[0-9]+[)]$")      // (module.js:1:2)
    var sourceFilename = new RegExp("[(]\/[^:]*:[0-9]+:[0-9]+[)]$")     // (/path/file.js:1:2)
    stack = stack.split('\n')

    // find just the js files with absolute filepaths, skip [eval] and built-in sources
    var line, sourceLines = []
    while ((line = stack.shift())) {
        if (sourceFilename.test(line)) sourceLines.push(line)
    }
    stack = sourceLines

    // find the first line in the backtrace that called qconfig
    var prevLine = stack.shift()
    while (
        stack.length && (
            myFilename.test(stack[0]) ||
            qconfigFilename.test(stack[0]) && !qconfigTestfile.test(stack[0]) && stack.length > 1 ||
            builtinFilename.test(stack[0])
        ))
    {
        prevLine = stack.shift()
    }

    // over-deep stack will not include all lines
    line = stack.length ? stack[0] : ''

    // if loading from the command line, the first file is the caller
    if (!line) line = prevLine

    var mm
    if ((mm = line.match(/ at \(((.*):([0-9]+):([0-9]+))\)$/)) || (mm = line.match(/ at .+ \(((.*):([0-9]+):([0-9]+))\)$/))) {
        // mm[2] is filename, mm[3] is line num, mm[4] is column
        return mm[2]
    }
    return ''
}

module.exports = QConfig
module.exports.load = function( env, opts ) {
    if (opts === undefined) { opts = env; env = null }
    return new QConfig(opts).load(env)
}
