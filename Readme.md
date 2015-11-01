QConfig
=======

Small, light configuration loader.  Loads json and javascript config files (also
coffee-script).  Configuration can be hierarchical, inheriting from multiple sources
specified by name or by regular expression.


Features
--------

* short, simple, no dependencies
* hierarchical, with multiple inheritance
* inheritance hierarchy can be configured by absolute name name or by regular expression
* configurable config file loader
* can find config directory along filepath
* shareable, can be called from multiple places


Usage
-----

        // load the default configuration (set in the NODE_ENV env var)
        // the config is read from the nearest enclosing '/config' dir
        var config = require('qconfig')

        // load the 'staging' configuration
        var config = require('qconfig/load')({ env: 'staging' })


API
---

### config = require('qconfig')

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
case the implementation class is not exported.  To help disambiguate, the QConfig
class is also exported as `require('qconfig/qconfig')`

        var config = require('qconfig')
        var QConfig = require('qconfig').QConfig
        var QConfig = require('qconfig/qconfig')

### config = require('qconfig/load')( opts )

Shortcut for loading a custom configuration.  Returns a function that uses a new
QConfig instance to load the environment specified in `opts.env` (else the default).

        var QConfig = require('qconfig/qconfig')
        var config = new QConfig(opts).load()
        // same as config = require('qconfig/load')(opts)

### QConfig = require('qconfig/qconfig')

The config loader implementation class.

### new QConfig( opts )

The QConfig is the actual implementation class.  `require('qconfig')` internally
uses a QConfig object to load the config settings that it returns.

Options:

* `env` - name of config section to load, as can also be passed to `load()`
* `dirName` - relative directory name holding the config files (default `config`)
* `configDirectory` - absolute directory name holding the config files (no default)
* `layers` - the rules of which environments to inherit from.  The default rules are
  `{ default: [], development: ['default'], staging: ['default'], production: ['default'],
  canary: ['production'], custom: ['production'] }`.
  Passed in layers are merged into the defaults; to delete layer set it to `undefined`.
* `loader` - function to read and parse the config file (default `require()`)

        var QConfig = require('qconfig/qconfig')
        var qconf = new QConfig()

### qconf.load( [environmentName] [,configDirectory] )

Read and return the configuration for the named environment from the named
directory.  If the config directory is omitted, it will be located by searching
upward the directory hierarchy containing the file that called qconf.load().  If
the config directory is not found returns `{ notConfigured: true }`.  If
environmentName is omitted, the value of the `NODE_ENV` environment variable is
used (process.env.NODE_ENV), else 'development'.  If the named environment is
not configured, returns an empty config `{ }`.

        var qconf = new QConfig()
        var config = qconf.load('development', './config')


ChangeLog
---------

1.2.0

* allow regular expressions (object or string) as layer names

1.1.1

* fix caller filepath detection

1.1.0

* export QConfig directly via require('qconfig/qconfig')
* allow to-load environment name to be passed in opts.env
* support require('qconfig/load')

1.0.0

* initial release


Related Work
------------

* [config](http://npmjs.com/package/config) - what everyone uses
* [config-node](http://npmjs.com/package/config-node) - tiny lean config loader with a great Readme
