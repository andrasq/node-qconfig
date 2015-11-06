/**
 * quick little configuration loader
 * Loads the configuration named by the NODE_ENV environment variable,
 * with support for inherited settings from other configurations.
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
        dirName: opts.dirName || 'config',
        configDirectory: null,
        loadConfig: opts.loader || require,
        extensions: ['', '.js', '.json'],
        layers: [],
    }
    this.opts.configDirectory =
        opts.configDirectory || opts.dir || process.env.NODE_CONFIG_DIR || this._locateConfigDirectory(this.opts.caller, this.opts.dirName)

    this._installLayers({
        default: [],
        development: ['default'],
        staging: ['default'],
        production: ['default'],
        canary: ['production'],
        custom: ['production'],
    })
    if (opts.layers) this._installLayers(opts.layers)

    // read additional config settings from config/qconfig.conf
    try {
        var opts = require(this.opts.configDirectory + "/qconfig.conf")
        if (opts.layers) { this._installLayers(opts.layers) ; delete opts.layers }
        this._supplementConfig(this.opts, opts)
    }
    catch (e) { }
}

QConfig.prototype = {
    opts: null,
    _depth: 0,

    load: function load( env, configDirectory, _nested ) {
        var env = env || this.opts.env
        var configDirectory = configDirectory || this.opts.configDirectory
        if (!configDirectory || !this._isDirectory(configDirectory)) return {notConfigured: true}      // no config directory
        var calledFrom = QConfig.getCallingFile(new Error().stack)

        this._depth += 1
        var config = {}, layers = this._findLayers(env)
        if (layers) {
            if (this._depth > 100) throw new Error("runaway recursion")
            for (var i=0; i<layers.length; i++) {
                this._layerConfig(config, this.load(layers[i]), configDirectory, true)
            }
        }
        this._layerConfig(config, this._loadConfigFile(env, configDirectory, _nested))
        this._depth -= 1
        return config
    },

    _installLayers: function _installLayers( layering ) {
        if (!this.opts.layers) this.opts.layers = [
            // list of [environment name, list of environments it inherits from] tuples
            // environment name can be a string or a regex pattern
        ]
        var layerStack = this.opts.layers
        if (Array.isArray(layering) && Array.isArray(layering[0])) {
            for (var i=0; i<layering.length; i++) installLayer(layering[i][0], layering[i].slice(1))
        }
        else if (Array.isArray(layering)) {
            installLayer(layering[0], layering.slice(1))
        }
        else {
            for (var i in layering) installLayer(i, layering[i])
        }

        function installLayer( name, inheritsFrom ) {
            if (name instanceof RegExp) {
                layerStack.push([name, inheritsFrom])           // regex object
            }
            else if (name[0] === '/' && name[name.length-1] === '/') {
                var pattern = new RegExp(name.slice(1, -1))
                layerStack.push([pattern, inheritsFrom])        // regex object from string
            }
            else {
                layerStack.push([name, inheritsFrom])           // string
            }
        }
    },

    _findLayers: function _findLayers( env ) {
        // matching layer O(n) linear search, faster than hash for short lists
        // search newest to oldest, newest matching entry wins
        var layers = this.opts.layers
        for (var i=layers.length-1; i>=0; i--) {
            if (typeof layers[i][0] === 'string') {
                if (layers[i][0] === env) return layers[i][1]
            }
            else {
                if (layers[i][0].test(env)) return layers[i][1]
            }
        }
        return null
    },

    _loadConfigFile: function _loadConfigFile( env, configDirectory, _nested ) {
        var file = configDirectory + "/" + env
        for (var i=0; i<this.opts.extensions.length; i++) {
            // TODO: match the loader to the filename extension
            var loadConfig = this.opts.loadConfig
            try {
                return loadConfig(file + this.opts.extensions[i])
            }
            catch (err) {
                // "not found" is ok, other errors are fatal
                if (err.message.indexOf('Cannot find') == -1 && err.message.indexOf('ENOENT') == -1) throw err
            }
        }
        // if the user-supplied loader does not succeed, fall back to the built-in require()
        try { return require(file) } catch (e) { }
        // warn if the requested environment is not configured
        if (!_nested) console.log("qconfig: env '%s' not configured (NODE_ENV=%s)", env, process.env.NODE_ENV)
    },

    // merge layer into base, overriding existing
    _layerConfig: function _layerConfig( base, layer ) {
        for (var k in layer) {
            if (typeof base[k] === 'object' && typeof layer[k] === 'object') this._layerConfig(base[k], layer[k])
            else base[k] = layer[k]
        }
        return base
    },

    // merge layer into base, retaining existing
    _supplementConfig: function _supplementConfig( base, layer ) {
        for (var k in layer) {
            if (typeof base[k] === 'object' && typeof layer[k] === 'object') this._supplementConfig(base[k], layer[k])
            else if (base[k] === undefined || base[k] === null) base[k] = layer[k]
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
    var line, sourceLines = [];
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
