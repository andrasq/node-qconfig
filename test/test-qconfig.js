/**
 * quick little configuration loader
 *
 * Copyright (C) 2015 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2015-10-01 - AR.
 */

'use strict'

var qconfig = require('..')
var QConfig = require('../qconfig')

module.exports = {
    'package': {
        'should parse': function(t) {
            require ('../package.json')
            t.done()
        },

        'should load config': function(t) {
            t.equal(typeof qconfig, 'object')
            t.ok(! (qconfig instanceof QConfig))
            t.done()
        },

        'should both export and expose QConfig': function(t) {
            t.equal(qconfig.QConfig, QConfig)
            t.done()
        },
    },

    'qconfig': {
        setUp: function(done) {
            this.qconf = new qconfig.QConfig()
            done()
        },

        'constructor': {
            'should accept dirName': function(t) {
                var qconf = new qconfig.QConfig({dirName: 'config2'})
                t.equal(qconf.load('default').config2, true)
                t.done()
            },

            'should accept configDirectory': function(t) {
                var qconf = new qconfig.QConfig({configDirectory: './config2'})
                t.equal(qconf.load('default').config2, true)
                t.done()
            },

            'should incorporate new layers': function(t) {
                var qconf = new qconfig.QConfig({layers: {target: ['layer1', 'layer2']}})
                t.deepEqual(qconf.opts.layers.target, ['layer1', 'layer2'])
                t.done()
            },

            'should accept loader': function(t) {
                var called = false
                function loadConfig(filename) { called = true; return require(filename) }
                var qconf = new qconfig.QConfig({loader: loadConfig})
                qconf.load('default')
                t.equal(called, true)
                t.done()
            },
        },

        'load': {
            'should return object': function(t) {
                t.equal(typeof require('../index'), 'object')
                t.equal(typeof this.qconf.load(), 'object')
                t.done()
            },

            'should return config for named environment': function(t) {
                var config = this.qconf.load('development')
                t.equal(config.development, true)
                t.done()
            },

            'should return config from named directory': function(t) {
                var config = this.qconf.load('default', './config2')
                t.equal(config.config2, true)
                t.done()
            },

            'should throw error on fatal problem': function(t) {
                try {
                    this.qconf.load('')
                    t.fail()
                }
                catch (err) {
                    t.done()
                }
            },

            'should return notConfigured if directory not exists': function(t) {
                var config = this.qconf.load('development', './notexist')
                t.equal(config.notConfigured, true)
                t.done()
            },

            'should catch self-recursive layering': function(t) {
                var qconf = new qconfig.QConfig({layers: {test1: ['test1'], test2: ['test3'], test3: ['test2']}})
                try { qconf.load('test1'); t.fail() } catch (err) { t.ok(err.message.indexOf("recursion") >= 0) }
                try { qconf.load('test2'); t.fail() } catch (err) { t.ok(err.message.indexOf("recursion") >= 0) }
                t.done()
            },

            'should be available as qconfig/load': function(t) {
                var config = (require('../load'))({env: 'canary'})
                t.equal(config.canary, true)
                t.done()
            },
        },

        'should locate config dir closest to calling file walking up filepath': function(t) {
            var config = require('./nested/deeper/load.js')
            t.equal(config.default, 'nested')
            t.done()
        },

        'should merge layers from layer hierarchy': function(t) {
            var config = this.qconf.load('canary')
            t.equal(config.canary, true)
            t.equal(config.production, true)
            t.done()
        },
    },
}
