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

Load the configuration for the environment specified by NODE_ENV (default
'development').  The configuration files are read from a directory `config` in the
same directory as, or in a containing parent directory along the filepath of, the
source file that loaded the configuration.

E.g., if a source `/home/andras/src/project/lib/main.js` calls `require('qconfig')`
the config directory is checked to be `/home/andras/src/project/lib/config`,
`/home/andras/src/project/config`, `/home/andras/src/config`,
`/home/andras/config`, etc.  Typically the config directory lives in the project
root, ie at `/home/andras/src//project/config`

### new QConfig( opts )

Options:

* `dirName` - relative directory name holding the config files (default `config`)
* `configDirectory` - absolute directory name holding the config files (no default)
* `layers` - the rules of which environments to inherit from.  The default rules are
  `{ development: ['default'], staging: ['default'], production: ['default'], canary: ['production'] }`.
  Passed in layers are merged into the defaults; to delete layer a layer set it to `undefined`.
* `loader` - function to read and parse the config file (default `require()`)

### qconf.load( [environmentName] [,configDirectory] )

Read and return the configuration for the named environment from the named
directory.  If the config directory is omitted, it will be located by searching
upward the directory hierarchy containing the file that called qconf.load().  If
the directory is not found returns `{ notConfigured: true }`.  If environmentName
is omitted, the 'development' environment is looked up.  If the named environment
is not configured, return the empty config `{ }`.


Related Work
------------

[config](npmjs.com/package/config) - what everyone uses
