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
    this.opts = {}
    this.opts.env = opts.env || process.env.NODE_ENV || 'development'
    this.opts.layers = {
        default: [],
        development: ['default'],
        staging: ['default'],
        production: ['default'],
        canary: ['production'],
    }
    this.opts.caller = opts.caller || QConfig.getCallingFile(new Error().stack)
    this.opts.dirName = opts.dirName || 'config'
    this.opts.configDirectory = opts.configDirectory || this._locateConfigDirectory(this.opts.caller, this.opts.dirName)
    if (opts.layers) for (var i in opts.layers) this.opts.layers[i] = opts.layers[i]
    this.opts.loadConfig = opts.loader || require
}

QConfig.prototype = {
    opts: null,
    _depth: 0,

    load: function load( env, configDirectory ) {
        var env = env || this.opts.env
        var configDirectory = configDirectory || this.opts.configDirectory
        if (!configDirectory || !this._isDirectory(configDirectory)) return {notConfigured: true}      // no config directory
        var calledFrom = QConfig.getCallingFile(new Error().stack)

        this._depth += 1
        var config = {}, layers = this.opts.layers[env]
        if (layers) {
            if (this._depth > 100) throw new Error("runaway recursion")
            for (var i in layers) this._layerConfig(config, this.load(layers[i]))
        }
        this._layerConfig(config, this._loadConfigFile(env, configDirectory))
        this._depth -= 1
        return config
    },

    _loadConfigFile: function _loadConfigFile( env, configDirectory ) {
        try {
            return this.opts.loadConfig(configDirectory + "/" + env)
        }
        catch (err) {
            // "not found" is ok, other errors are fatal
            if (err.message.indexOf('Cannot find') == -1 && err.message.indexOf('ENOENT') == -1) throw err
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
    var myFilename = '/' + path.basename(filename) + ':'
    stack = stack.split('\n')
    stack.shift()
    // find the first line in the backtrace that called this file
    while (stack.length && stack[0].indexOf(myFilename) >= 0) stack.shift()

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
