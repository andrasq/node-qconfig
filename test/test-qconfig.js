/**
 * quick little configuration loader
 *
 * Copyright (C) 2015-2018 Andras Radics
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

            'should accept loader object': function(t) {
                var called = false
                function loadConfig(filename) { called = true; return require(filename) }
                var qconf = new qconfig.QConfig({loader: {'.js': loadConfig}})
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
        },

        '_installLayers': {
            '_installLayers should build regexes from regex strings': function(t) {
                var qconf = new qconfig.QConfig({ layers: {'/te/s*t/i': ['a', 'b']} })
                var last = qconf.preload.pop()
                t.ok(last[0] instanceof RegExp)
                // note: RegExp.toString() changed between v0.10 and v4.4, it now
                // backslash-escapes / in the string output, a breaking change
                t.ok(last[0].toString() == '/te/s*t/i' || last[0].toString() == '/te\\/s*t/i')
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

            '_installLayers should only install layers with string or regex names': function(t) {
                var patt = /test2/
                var layers = this.qconf._installLayers([], [ [1, 2, 3], ['test', 2, 3], [patt, 2, 3] ])
                t.deepEqual(layers, [ ['test', 2, 3], [patt, 2, 3] ])
                t.done()
            },

            '_installLayers should install a layer name': function(t) {
                var layers = this.qconf._installLayers([], { test4: 'test3', test5: 'test3' });
                t.deepEqual(layers, [ ['test4', ['test3']], ['test5', ['test3']] ]);
                t.done();
            },
        },

        '_loadConfigFile': {
            'should suppress file-not-found error': function(t) {
                this.qconf._loadConfigFile('nonesuch', '/', true);
                t.done();
            },

            'should use a default loader': function(t) {
                var qconf = new qconfig.QConfig({ loader: null });
                var conf = qconf._loadConfigFile('canary', __dirname + '/config');
                t.strictEqual(conf.canary, true);
                t.done();
            },

            'should use a mapped loader': function(t) {
                var qconf = new qconfig.QConfig({ loader: { '': require } });
                var conf = qconf._loadConfigFile('canary.js', __dirname + '/config');
                t.strictEqual(conf.canary, true);
                t.done();
            },

            'should throw if function loader can not read file': function(t) {
                var qconf = new qconfig.QConfig({ loader: require });
                t.throws(function(){ qconf._loadConfigFile('sudoers', '/etc') }, /EACCES/);
                t.done();
            },

            'should throw if mapped loader can not read file': function(t) {
                var qconf = new qconfig.QConfig({ loader: { '': require } });
                t.throws(function(){ qconf._loadConfigFile('sudoers', '/etc') }, /EACCES/);
                t.done();
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
                t.equal(config.default, true)
                t.equal(config.local, true)
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

            'should load default and local by default': function(t) {
                var config = this.qconf.load('empty')
                t.strictEqual(config.default, true)
                t.strictEqual(config.local, true)
                t.done()
            },

            'should load default and local for built-in targets': function(t) {
                var targets = [ 'development', 'staging', 'production', 'canary', 'custom' ]
                for (var i=0; i<targets.length; i++) {
                    var target = targets[i]
                    var config = this.qconf.load(target)
                    t.equal(config.default, true, target)
                    t.equal(config.local, true, target)
                }
                t.done()
            },

            'should not auto-load default if explicit layering is given': function(t) {
                var qconf = new qconfig.QConfig({ preload: { production: ['other'], other: [] } })
                var config = qconf.load('production', null, true)
                t.strictEqual(config.default, undefined)
                t.done();
            },

            'should not auto-load local if explicit layering is given': function(t) {
                var qconf = new qconfig.QConfig({ postload: { production: ['other'], other: [] } })
                var config = qconf.load('production')
                t.strictEqual(config.local, undefined)
                t.done();
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
                var config = (require('../load'))('canary', {})
                t.equal(config.canary, true)
                t.done()
            },

            'qconfig/load should accept just options': function(t) {
                var config = (require('../load'))({ env: 'canary' });
                t.equal(config.canary, true)
                t.done()
            },

            'qconfig/load should load development by default': function(t) {
                var config = (require('../load'))();
                t.equal(config.development, true)
                t.done()
            },

            'should load a non-existent configuration': function(t) {
                var config = this.qconf.load('notexist', null, true)
                t.done()
            },
        },

        'merge should overwrite existing': function(t) {
            var conf = this.qconf.merge({a:1, b:2, c:{a:3, b:4}}, {b:22, c:{a:4, d:5}})
            t.deepEqual(conf, {a:1, b:22, c:{a:4, b:4, d:5}})
            t.done()
        },

        'merge should never use the source object directly': function(t) {
            var source = { a: { b: { c: 123 } } };
            var target = {};
            var merged = this.qconf.merge(target, source);
            t.deepEqual(merged.a, source.a);
            t.ok(merged.a != source.a);
            t.done();
        },

        'merge should detect self-recursion': function(t) {
            var qconf = this.qconf;
            var a = {}, b = {a: a};
            a.b = b;
            t.throws(function() {
                qconf.merge({}, a);
            }, /recursion/)
            t.done();
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

        'getCallingFile': {
            'should return $cwd for eval': function(t) {
                var stack = "Error:\n" +
                    "  at (node_module:1:1)\n" +
                    "  at /module/path/qconfig/qconfig.js:1:1\n" +
                    "  at [eval]:1:1"
                t.contains(QConfig.getCallingFile(stack, 'index.js'), process.cwd())
                t.done()
            },

            'should return $cwd if no user source found': function(t) {
                var stack = "Error:\n" +
                    "  at (node_module:1:1)\n" +
                    "  at /module/path/qconfig/qconfig.js:1:1\n" +
                    "  at /module/path/coffee-script/loader:1:1\n" +
                    "  at unrecognized backtrace syntax\n"
                t.contains(QConfig.getCallingFile(stack, 'index.js'), process.cwd())
                t.done()
            },
        },

        'maybeWarn': {
            'should console.log if verbose': function(t) {
                var spy = t.stubOnce(console, 'log', function(){})
                QConfig.maybeWarn(true, "test")
                t.equal(spy.callCount, 1)
                t.done()
            },

            'should suppress output if not verbose': function(t) {
                var spy = t.stubOnce(console, 'log', function(){})
                QConfig.maybeWarn(false, "test")
                t.equal(spy.callCount, 0)
                t.done()
            }
        },
    },
}
