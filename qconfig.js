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
        layers: [
            // list of [environment name, list of environments it inherits from]
            // environment name can be a string or a regex pattern
        ],
        caller: opts.caller || QConfig.getCallingFile(new Error().stack),
        dirName: opts.dirName || 'config',
        configDirectory: null,
        loadConfig: opts.loader || require,
    }
    this._installLayers({
        default: [],
        development: ['default'],
        staging: ['default'],
        production: ['default'],
        canary: ['production'],
    })
    this.opts.configDirectory = opts.configDirectory || this._locateConfigDirectory(this.opts.caller, this.opts.dirName)
    if (opts.layers) this._installLayers(opts.layers)
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
            for (var i=0; i<layers.length; i++) this._layerConfig(config, this.load(layers[i]), null, true)
        }
        this._layerConfig(config, this._loadConfigFile(env, configDirectory, _nested))
        this._depth -= 1
        return config
    },

    _installLayers: function _installLayers( layering ) {
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
        try {
            return this.opts.loadConfig(configDirectory + "/" + env)
        }
        catch (err) {
            // "not found" is ok, other errors are fatal
            if (err.message.indexOf('Cannot find') == -1 && err.message.indexOf('ENOENT') == -1) throw err
            // warn if the requested environment is not configured
            if (!_nested) console.log("qconfig: env '%s' not configured (NODE_ENV=%s)", env, process.env.NODE_ENV)
        }
    },

    _layerConfig: function _layerConfig( base, layer ) {
        for (var k in layer) {
            if (typeof base[k] === 'object' && typeof layer[k] === 'object') this._layerConfig(base[k], layer[k])
            else base[k] = layer[k]
        }
        return base
    },

    _locateConfigDirectory: function _locateConfigDirectory( basepath, dirName ) {
        var pathname = basepath + '/' + dirName
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
    var builtinFilename = new RegExp("[(][^/]*:[0-9]+:[0-9]+[)]$")
    stack = stack.split('\n')
    stack.shift()
    // find the first line in the backtrace that called this file
    while (
        stack.length && (
            myFilename.test(stack[0]) ||
            qconfigFilename.test(stack[0]) && !qconfigTestfile.test(stack[0]) ||
            builtinFilename.test(stack[0])
        ))
    {
        stack.shift()
    }

    // over-deep stack will not include all lines
    var line = stack.length ? stack[0] : ''

    var mm
    if ((mm = line.match(/ at \(((.*):([0-9]+):([0-9]+))\)$/)) || (mm = line.match(/ at .+ \(((.*):([0-9]+):([0-9]+))\)$/))) {
        // mm[2] is filename, mm[3] is line num, mm[4] is column
        return mm[2]
    }
    return ''
}

module.exports = QConfig
