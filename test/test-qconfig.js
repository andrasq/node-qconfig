/**
 * quick little configuration loader
 *
 * Copyright (C) 2015 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2015-10-01 - AR.
 */

'use strict'

var path = require('path')
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
                var qconf = new qconfig.QConfig({configDirectory: path.dirname(__filename)+'/../config2'})
                t.equal(qconf.load('default').config2, true)
                t.done()
            },

            'should accept NODE_CONFIG_DIR': function(t) {
                var save = process.env.NODE_CONFIG_DIR
                process.env.NODE_CONFIG_DIR = path.dirname(__filename)+'/../config2'
                var qconf = new qconfig.QConfig()
                t.equal(qconf.load('default').config2, true)
                if (save) process.env.NODE_CONFIG_DIR = save; else delete process.env.NODE_CONFIG_DIR
                t.done()
            },

            'should incorporate new preload layers': function(t) {
                var qconf = new qconfig.QConfig({layers: {target: ['layer1', 'layer2']}})
                t.deepEqual(qconf._findLayers(qconf.preload, 'target'), ['layer1', 'layer2'])
                t.done()
            },

            'should register postload layers': function(t) {
                var qconf = new qconfig.QConfig({postload: {target: ['layerN1', 'layerN']}})
                t.deepEqual(qconf._findLayers(qconf.postload, 'target'), ['layerN1', 'layerN'])
                t.done()
            },

            'should combine preload and postload layers': function(t) {
                var qconf = new qconfig.QConfig({postload: {development: ['canary']}})
                var conf = qconf.load();
                t.equal(conf.development, true)
                t.equal(conf.production, true)
                t.equal(conf.canary, true)
                t.equal(conf.name, 'canary')
                t.done()
            },

            'should accept loader function': function(t) {
                var called = false
                function loadConfig(filename) { called = true; return require(filename) }
                var qconf = new qconfig.QConfig({loader: loadConfig})
                qconf.load('default')
                t.equal(called, true)
                t.done()
            },

            'should apply qconfig.conf found in config dir': function(t) {
                var qconf = new qconfig.QConfig({ dirName: 'config3' })
                var config = qconf.load('preconfigured')
                t.equal(config.canary, 'config3')
                t.done();
            },

            'caller-specified layers should override qconfig.conf': function(t) {
                var qconf = new qconfig.QConfig({ dirName: 'config3', layers: {preconfigured: ['other3']} })
                var config = qconf.load('preconfigured')
                t.equal(config.name, 'other3')
                t.done();
            },

            '_installLayers should build regexes from regex strings': function(t) {
                var qconf = new qconfig.QConfig({ layers: {'/te\/s*t/i': ['a', 'b']} })
                var last = qconf.preload.pop()
                t.ok(last[0] instanceof RegExp)
                t.equal(last[0].toString(), '/te\/s*t/i')
                t.deepEqual(last[1], ['a', 'b'])
                t.done()
            },

            '_installLayers should accept regex array': function(t) {
                var qconf = new qconfig.QConfig({ layers: [ [/te\/s*t/i, ['a', 'b']] ] })
                var last = qconf.preload.pop()
                t.equal(last[0].toString(), '/te\\/s*t/i')
                t.deepEqual(last[1], ['a', 'b'])
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
                var config = this.qconf.load('default', path.dirname(__filename)+'/../config2')
                t.equal(config.config2, true)
                t.done()
            },

            'should use defined layers': function(t) {
                var qconf = new qconfig.QConfig({ layers: {target: ['canary']} })
                var config = qconf.load("target")
                t.equal(config.canary, true)
                t.done()
            },

            'should use defined layer regex string': function(t) {
                var qconf = new qconfig.QConfig({ layers: {'/-override$/': ['canary', 'development']} })
                var config = qconf.load("canary-override")
                t.equal(config.canary, true)
                t.equal(config.production, true)
                t.equal(config.development, true)
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

            'should catch self-recursive dependencies': function(t) {
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

            'should load a non-existent configuration': function(t) {
                var config = this.qconf.load('notexist')
                t.done()
            },
        },

        'merge should overwrite existing': function(t) {
            var conf = this.qconf.merge({a:1, b:2, c:{a:3, b:4}}, {b:22, c:{a:4, d:5}})
            t.deepEqual(conf, {a:1, b:22, c:{a:4, b:4, d:5}})
            t.done()
        },

        'should locate config dir closest to calling file walking up filepath': function(t) {
            var config = require('./nested/deeper/load.js')
            t.equal(config.default, 'nested')
            t.done()
        },

        'should merge config settings from layer hierarchy': function(t) {
            var config = this.qconf.load('canary')
            t.equal(config.canary, true)
            t.equal(config.production, true)
            t.done()
        },
    },
}
