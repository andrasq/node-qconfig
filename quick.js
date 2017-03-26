/**
 * quicker quick config file loader, similar to the basic `require('config')`
 *
 * 2017-03-26 - AR.
 */

// kds: qqconfig: 7850/s, qconfig: 3210/s, config: 575/s; also trying local-$env is 15% slower
// kcs: qqconfig: 8850/s, qconfig: 2550/s, config: 388/s

var fs = require('fs');
var path = require('path');

module.exports = loadConfig();


function loadConfig( env, dir ) {
    env = env || process.env.NODE_ENV || 'development';
    dir = dir || 'config';

    dir = _locateConfigDirectory(process.cwd(), dir);
    if (!dir) return {};

    var target = {};
    merge(target, _loadConfigFile(dir + '/default', false), 0);
    merge(target, _loadConfigFile(dir + '/' + env, true), 0);
    merge(target, _loadConfigFile(dir + '/local', false), 0);
    //merge(target, _loadConfigFile(dir + '/local-' + env, false), 0);  // 15% slower
    return target;
}


// recursively merge layer into base, overriding existing in base
function merge( base, layer, _depth ) {
    _depth = _depth || 0
    if (_depth > 100) throw new Error("runaway merge recursion")
    for (var k in layer) {
        if (_isHash(layer[k])) {
            // always copy hashes, never assign directly
            if (!_isHash(base[k])) base[k] = {}
            merge(base[k], layer[k], _depth+1)
        }
        else base[k] = layer[k]
    }
    return base

    function _isHash( o ) {
        // a hash object is not instanceof any class
        return o && typeof o === 'object' && o.constructor && o.constructor.name === 'Object';
    }
}

function _locateConfigDirectory( basepath, dirName ) {
    if (dirName[0] === '/') return dirName;
    var pathname = (basepath || ".") + '/' + dirName;
    if (_isDirectory(pathname)) return pathname;
    if (basepath === "." || basepath === "/") {
        console.error("config directory '%s' not found", dirName);
        return null;
    }
    return _locateConfigDirectory(path.dirname(basepath), dirName);

    function _isDirectory( dirname ) {
        try { return fs.statSync(dirname).isDirectory() }
        catch (err) { return false }
    }
}

function _loadConfigFile( filename, primary ) {
    try {
        return require(filename);
    }
    catch (err) {
        if (primary) {
            var notFound = /Cannot find/.test(err.message) || /EEXIST/.test(err.message) || /ENOENT/.test(err.message);
            if (notFound) console.error("%s: no config file", path.basename(filename));
            else throw err;
        }
        return {};
    }
}
