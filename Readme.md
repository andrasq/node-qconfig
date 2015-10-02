QConfig
=======

Small, light, configuration loader.  Loads json and javascript config files (also
coffee-script).

Usage
-----

        process.env.NODE_ENV = 'development'
        var config = require('qconfig')
        // config now contains the configuration read from the
        // nearest enclosing `./config/` directory

        var qconf = new config.QConfig()
        var config = qconf.load('development')
        // same thing, config now contains the configuration read from ./config/


API
---

### require('qconfig')

Load the configuration for the environment specified by the NODE_ENV environment
variable (or 'development' by default).  The configuration files are read from a
directory `config` in the same directory as, or in the nearest containing directory
of, the source file that loaded the configuration.

E.g., if a source file `/src/project/lib/main.js` calls `require('qconfig')` the
config directory is checked to exist as name, in order, `/src/project/lib/config`,
`/src/project/config`, `/src/config`, and finally `/config`.  Typically the config
directory lives in the project root, ie at `/src/project/config`

The configuration is returned as a data object with properties corresponding to
named values in the configuration file(s).  The data object has no get/set methods.
The configuration files can not be modified at runtime using these calls.

Configurations are distinct and are named for their intended environment, ie
'development', 'staging', 'production'.  Each environment can optionally inherit
the configuration one or more other environments (or none), which in turn can
themselves inherit, recursively.  A few environments are built in, but the
environments and their inheritance hierarchy is totally configurable.

Each config returned has a hidden element `QConfig` that is the implementation
class of the config loader, unless the config itself has a section QConfig in which
case the implementation class is not exported.

        var config = require('config')

### qconf = new require('qconfig').QConfig( opts )

The QConfig is the actual implementation class.  `require('qconfig')` internally
uses a QConfig object to load the config settings that it returns.

Options:

* `dirName` - relative directory name holding the config files (default `config`)
* `configDirectory` - absolute directory name holding the config files (no default)
* `layers` - the rules of which environments to inherit from.  The default rules are
  `{ development: ['default'], staging: ['default'], production: ['default'], canary: ['production'] }`.
  Passed in layers are merged into the defaults; to delete layer a layer set it to `undefined`.
* `loader` - function to read and parse the config file (default `require()`)

        var QConfig = require('qconfig').QConfig
        var qconf = new QConfig()

### qconf.load( [environmentName] [,configDirectory] )

Read and return the configuration for the named environment from the named
directory.  If the config directory is omitted, it will be located by searching
upward the directory hierarchy containing the file that called qconf.load().  If
the config directory is not found returns `{ notConfigured: true }`.  If
environmentName is omitted, it defaults to 'development'.  If the named environment
is not configured, returns an empty config `{ }`.

        var qconf = new QConfig()
        var config = qconf.load('development', './config')


Related Work
------------

[config](http://npmjs.com/package/config) - what everyone uses
