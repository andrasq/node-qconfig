QConfig
=======

Small, light configuration loader.  Loads json and javascript config files (also
coffee-script).  Configuration can be hierarchical, inheriting from multiple sources
specified by name or by regular expression.

Configurations are returned as hierarchical key-value objects (hashes) without
methods on them.


Features
--------

* simple, no dependencies
* hierarchical, with configurable multiple inheritance
* config hierarchy can be matched to environment by name or by regular expression
* configurable config file loader, supports any config file format
* shareable, can be called from multiple places
* can locate config directory along filepath, does not require the current working directory to be set
* supports different configurations for multiple apps all started from the same directory
* specify environment with NODE_ENV or opts.env
* specify configuration directory to use with NODE_CONFIG_DIR or opts.configDirectory
* can read additional project-specific opts settings from `config/qconfig.conf.js`


Quick Guide
-----------

### Common Usage

Load the default configuration named by the NODE_ENV environment variable
(else 'development' by default).  The configuration is searched for and is
read from the nearest enclosing '/config' directory.

        var config = require('qconfig')

As above, but using 'qconfig.load', a function that allows arbitrary options
to be used while loading

        var config = require('qconfig/load')({ env: 'staging' })

Load the 'staging' configuration from the testConfigs directory, overriding
NODE_ENV and the config directory search

        var config = require('qconfig/load')({
            env: 'staging',
            dir: 'testConfigs'
        })

As above, but using 'qconfig'

        process.env.NODE_ENV = 'staging'
        process.env.NODE_CONFIG_DIR = 'testConfigs'
        var config = require('qconfig')

### Configuration Environments

### Default Settings

Qconfig default settings can be built in or loaded from `qconfig.conf` in the
target configuration directory.  The `qconfig.conf` file can be any format that
is loadable by `require()`, typically `.js`, `.json` and `.coffee`.

### Built In

- `env` - config environment to load (default `development`)
- `dirname` - config directory name (default `config`)
- `dir` - config directory filepath (default is to search on calling file filepath)
- `preload` - pre-install configuration inheritance hierarchy, see Inheritance Hierarchies below
- `postload` - post-install configuration inheritance hierarchy, see Inheritance Hierarchies below
- `loader` - function to use to convert the config files to objects
  (default `require`)
- `extensions` - config filename extensions to look for, see Configuration File
  Formats below (default `['', '.js', '.json']`)

#### qconfig.conf

Qconfig.conf should evaluate to an object in the same format as the QConfig
constructor opts and may contain any option (though the ones used to locate the
config directory will not be used).  This provides a handy place to customize
the project inheritance hierarchy and/or config file format.  The format of
qconfig.conf must be understood by the node built-in `require()`.

- `preload`
- `postload`
- `loader`

### Inheritance Hierarchies

Config sections can load other config sections as prerequisites, and load other
config sections as overrides.  These are configured in the `preload` and `postload`
sections of `qconfig.conf`, or via the `preload` and `postload` properties of the
constructor options.

As of version 1.7.0, environments with no inheritance hierarchy specified preload
'default' and postload 'local' for more convenient `config` compatibility.

### Configation File Formats

### Config compatibility

[Config](http://npmjs.com/package/config) compatibility can be configured in
qconfig.conf, for example

        {
          preload: {
            '/development|staging|production/': ['default']
          },
          postload: {
            '/development|staging|production/': ['local']
          }
        }


Layout
------

Simple project layout

        app/
            lib/
            test/
            config/
            index.js: require('qconfig') => app/config

Complex project layout

        app/
            lib/
            test/
            config/
            index.js: require('qconfig') => app/config
            services/
                s1/
                    lib/
                    test/
                    config/
                    index.js: require('qconfig) => app/services/s1/config
                s2/
                    lib/
                    test/
                    config/
                    index.js: require('qconfig) => app/services/s2/config


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
        qconfig.QConfig === require('qconfig/qconfig')

### config = require('qconfig/load')( [env,] opts )

Shortcut for loading a custom configuration.  Returns a function that uses a new
QConfig instance to load the environment specified in `opts.env` (else the default).

        var QConfig = require('qconfig/qconfig')
        config = require('qconfig/load')(opts)
        config === new QConfig(opts).load()

Configurations loaded with `qconfig/load` or the `load()` method do not have
the QConfig property set.

### QConfig = require('qconfig/qconfig')

The config loader implementation class.

### new QConfig( opts )

The QConfig is the actual implementation class.  `require('qconfig')` internally
uses a QConfig object to load the config settings that it returns.

Options:

* `env` - name of config section to load, as can also be passed to `load()`.
  If not specified in options looks for the NODE_ENV environment variable,
  or uses the default `development`.
* `dirname` - relative directory name holding the config files (default `config`).
  Also recognized as `dirName`.
* `dir` - absolute directory name holding the config files (no default).
  If not specified in options looks for the `NODE_CONFIG_DIR` environment variable,
  or searches up along the directory path of the calling file.  `configDirectory`
  is accepted as an alias for `dir`.
* `preload` - the inherits-from list of environments.  The default inheritance rules are
  `{ default: [], development: ['default'], staging: ['default'], production: ['default'],
  canary: ['production'], custom: ['production'] }`.  Also recognized as `layers`.
  Passed in layers are merged into the defaults; to delete a layer define it as falsy.
* `postload` - the overridden-with list of environments.  Postload is an object mapping
  environment names to override configuration sections, e.g. `{production: ['local']}`.
  The default is none, `{}`.
* `loader` - function to read and parse the config file (default `require()`) or a
  hash mapping extensions to loader functions
* `extensions` - config filename extensions to try to load with the `loader` function,
  in order `['', '.js', '.json', '.coffee']`.  The object returned by the first successful load
  (no error thrown) is the one used.

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

1.7.0
* if no hierarchy specified, preload `default` and postload `local`
* fix pre-, postload layer merging
* test with qnit 0.19.0

1.6.3
* fix loading from a nested subdirectory listed without surrounding parentheses

1.6.2
* optimizations, now 70% faster

1.6.1
* never reuse any part of a layer, always copy it recursively into the target

1.6.0

* support coffee-script sources
* when loaded from the command line, look for configs relative to $cwd

1.5.0

* accept an optional `env` parameter to `qconfig/load`
* allow preload layers to be strings (layer names), not just arrays of strings

1.4.0

* accept a `loader` object that maps extensions to loader functions
* prefer dirname over dirName
* prefer dir over configDirectory

1.3.0

* accept `preload` to mean `layers` for pre-install layers
* introduce `postload` post-install layers
* test with qnit
* only load config files that explicitly occur in `extensions`
* simplify bootstrap, remove _supplementConfig
* guard against runaway merge recursion

1.2.3

* allow Array, Date, and RegExp objects in config files

1.2.2

* fix caller-specified layering overrides qconfig.conf

1.2.1

* fix .json config file loading
* make call-time options override qconfig.conf

1.2.0

* allow regular expressions (object or string) as layer names
* use NODE_CONFIG_DIR env var when locating config directory
* also load settings from config/qconfig.conf.js or .json
* built-in `custom` environment

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

* [config-node](http://npmjs.com/package/config-node) - tiny lean config loader with a great Readme
* [config](http://npmjs.com/package/config) - limited and inflexible, but seems to be popular
