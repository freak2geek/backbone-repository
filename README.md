# backbone-repository

Backbone extension that implements purposes of the Repository pattern, which means the enhancement of the model management and synchronization, so as to provide strong features to build online, offline and hybrid web applications.

![enter image description here](http://s30.postimg.org/xzax33qxt/diagrama_Con_Registro.png)

The library mainly supports the following features:

* **Model register**: A *Collection* (C) keeps models instantiated.
* **Sync modes**: *Sync modes* (m) are sync functions to different data sources that are managed by a *Repository* (R).
* **Sync state and operations**: A *Model* (M) keeps changes not synchronized and run sync operations using a sync mode.

## Versions
* **backbone-repository** - core library.
* **backbone-respository-locally** - core library + localStorage support through the [Locally plugin](https://github.com/ozantunca/locally).

## Table of Contents
- [Usage](#usage)
	- [Model register](#model-register)
	- [Sync mode](#sync-mode)
		- [Server mode](#server-mode)
		- [Client mode](#client-mode)
		- [LocalStorage mode](#localstorage-mode-requires-locally-extension)
		- [Custom mode](#custom-mode)
	- [Sync state](#sync-state)
		- [Fetch state](#fetch-state)
		- [Dirty attributes state](#dirty-attributes-state)
		- [Dirty destroy state](#dirty-destroy-state)
		- [Destroy state](#destroy-state)
		- [Version attribute](#version-attribute)
	- [Sync operations](#sync-operations)
		- [Pull method](#pull-method)
		- [Push method](#push-method)
		- [Check method](#check-method)
- [Reference API](#reference-api)
	- [Backbone.Repository](#backbonerepository)
  		- [modes](#modes-backbonerepositorymodes)
  		- [getMode](#getmode-backbonerepositorygetmodename)
  		- [setMode](#setmode-backbonerepositorysetmodename-fn)
  		- [getDefaultMode](#getdefaultmode-backbonerepositorygetdefaultmode)
  		- [setDefaultMode](#setdefaultmode-backbonerepositorysetdefaultmodename)
  		- [removeMode](#removemode-backbonerepositoryremovemodename)
  		- [reset](#reset-backbonerepositoryresetname)
  		- [storagePrefix](#storageprefix-backbonerepositorystorageprefix)
  		- [compressStorage](#compressstorage-backbonerepositorycompressstorage)
	- [Backbone.Model](#backbonemodel)
      - [create](#create-backbonemodelcreateattrs-options)
      - [find](#find-backbonemodelfindattrs)
      - [register](#register-backbonemodelregister)
      - [reset](#reset-backbonemodelreset)
      - [isFetched](#isfetched-modelisfetchedoptions)
      - [dirtied](#dirtied-modeldirtied)
      - [dirtiedAttributes](#dirtiedattributes-modeldirtiedattributesoptions)
      - [hasDirtied](#hasdirtied-modelhasdirtiedoptions)
      - [isDirtyDestroyed](#isdirtydestroyed-modelisdirtydestroyed)
      - [clearDirtied](#cleardirtied-modelcleardirtied)
      - [set](#set-modelsetattrs-options)
      - [isDestroyed](#isdestroyed-modelisdestroyedoptions)
      - [pull](#pull-modelpulloptions)
      - [push](#push-modelpushoptions)
      - [checkUrl](#checkurl-modelcheckurl)
      - [check](#check-modelcheckoptions)
      - [storeName](#storename-modelstorename)
	- [Backbone.Collection](#backbonecollection)
      - [save](#save-collectionsaveattrs-options)
      - [destroy](#destroy-collectiondestroyoptions)
      - [pull](#pull-collectionpulloptions)
      - [push](#push-collectionpushoptions)
      - [check](#check-collectioncheckoptions)
      - [storeName](#storename-collectionstorename)
- [Building and Testing](#building-and-testing)
	- [Building](#building)
	- [Testing](#testing)
- [Release History](#release-history)
- [License](#license)

## Usage

### Model register
The extension implements a model caching strategy. By this, a model register in the form of a collection will be responsible for keeping in-memory all instantiated models.
```javascript
var User = Backbone.Model.extend();

// A static method that returns the collection of users
var userRegister = User.register();
```
Along with that, a factory method will manage such register and will instantiate or return a model ensuring that it is not instantiated twice according to its identifier attribute. Both model register and factory method will be accessed through a static method of the model. 

```javascript
// Creating instances through the factory method
var user = User.create({id: 1});
var duplicate = User.create({id: 1, name: "Nacho"});

// Ensures a model has been instantiated once.
user === duplicate; // true

// The user has been updated as well.
user.get("name") === "Nacho"; // true
```

Besides, collections will rely on the factory method to create the instances of the model class associated. So,

```javascript
var Users = Backbone.Collection.extend({
  model: function(attrs, options) {
      return User.create(attrs, options);
  } 
});
```

### Sync mode
A sync mode is responsible to provide logic to access to different data sources. There exists several predefined modes, but you are enable to configure your custom sync mode as well.

For using a mode, you must pass the mode as an option for every single sync operation, whether fetch, update, destroy, pull, push or check.

```javascript
// E.g. fetching operation from server mode
user.fetch({
  mode: "server"
});
```

#### Server mode
The server mode uses the Backbone's sync function to perform a remote call against a REST API. It is the mode executed by default when using the model manager methods. Both the success and error callbacks are allowed in this mode.

#### Client mode
The client mode just perform local operations to the model. The success callback is only enabled in this mode.

#### LocalStorage mode (requires Locally extension)
The LocalStorage mode runs the model operations against LocalStorage. Both the success and error callbacks are allowed in this mode. For working, it requires [Locally plugin](https://github.com/ozantunca/locally) and the "backbone-repository-locally" version of the library.

For using this mode, you must specify an `storeName` whether in the model definition or by parameter when saving.

```javascript
// Specify `storeName` in the model definition.
var User = Backbone.Model.extend({
  storeName: "User"
});

var user = User.create({id: 1});

// Specify `storeName` when saving.
user.save({
	mode: "localStorage",
    storeName: "User"
});
```

You may also specify an `storagePrefix` for all your models when persisting in LocalStorage.
 
 ```javascript
// Specify `storagePrefix`.
Backbone.storagePrefix = "MyPrefix"; 
```

Finally, the LocalStorage key will read as follows: storagePrefix:storeName:[id|localId].


#### Custom mode
The extension features a way to configure your custom sync modes.

```javascript
var syncStrategy = function (method, model, options) {
  // sync function logic
};

// Registers a new sync mode.
Backbone.Repository.setMode({
  mySyncMethod: syncStrategy
});
```
It is also possible to establish which mode will be selected by default.

```javascript
// Defaults a sync mode.
Backbone.Repository.setDefaultMode("mySyncMethod");
```

### Sync state
The model prototype has been expanded to work up the Repository features intented.

#### Fetch state
The fetch state means whether the model has been fetched against the sync mode or not.
```javascript
user.fetch({
  mode: "server",
    success: function (model, response, options) {
    	user.isFetched(); // true
	}
});

user.isFetched(); // false
```

#### Dirty attributes state
The dirty attributes is a hash that keeps the model attributes that have changed since its last sync. For this, the `set` method has been altered and configured to handle dirty changes.

```javascript
// The 'set' method automatically stores dirtied attributes.
// same happens to user.save({name: "Nacho"}, {mode: "client"});
user.set({
    name: "Nacho"
}); 

user.hasDirtied(); // true

user.dirtiedAttributes(); // outputs {name: "Nacho"}
```

The dirty handler may be turned off by passing dirty option to `set` method.

```javascript
// The 'set' method won't store dirtied attributes.
user.set({
    name: "Nacho"
}, {
  dirty: false
});

user.hasDirtied(); // false
```
#### Dirty destroy state
The dirty destroy state means whether the model has been destroyed locally or not.

```javascript
user.destroy({
  mode: "client"
});

user.isDirtyDestroyed(); // true
```

#### Destroy state
The destroy state means whether the model has been destroyed against a sync mode or not.

```javascript
user.destroy({
  mode: "server",
    success: function (model, response, options) {
      user.isDestroyed(); // true
    }
});

user.isDestroyed(); // false
```

#### Version attribute
The version state is an attribute configured for each model. It is useful to stamp versions on the models when working with serveral data sources, for example a REST server and LocalStorage.

```javascript
var User = Backbone.Model.extend({
  versionAttribute: "version"
});
```

When calling some operation that uses `set` method, you are enabled to check if the version has been updated by passing an option. In case the model is outdated, it will force the fetched state to `false`. An event named `outdated` is also triggered when the version attribute is changed.

```javascript
var user = User.create({
  version: 1
});

user.isFetched(); // true, lets suppose that the model is fetched

user.set({
  version: 2
}, {
  version: true // forces to check version status
});

user.isFetched(); // false, the version has changed.
```

### Sync operations
Along with predefined sync operations you can perform from a model such as fetch, save and destroy, the extension implements three useful methods: pull, push and check.

By default, all sync operations use the server mode, but it may use another one just by passing the mode as parameter.

Besides, all sync operations has been adapted to be used from Collection.

#### Pull method
The pull method performs a read request only if the model has not been fetched before.

```javascript
var user = User.create({
  id: 1
});

// Performs a sync call in its first fetching.
user.pull({
	mode: "server"
});

// It won't request since it was fetched before.
user.pull({
	mode: "server"
});
```

#### Push method
The push method performs a request whether create, update or destroy methods according to the sync status.

```javascript
// Create example
var user = User.create({
  name: "Nacho"
});

// A create request will be emitted.
user.push({
	mode: "server"
});

// Update example
user = User.create({
  id: 1,
  name: "Nacho"
});

// An update request will be emitted.
user.push({
	mode: "server"
});

// Destroy example
user.destroy({
  mode: "client"
});

// A destroy request will be emitted.
user.push({
	mode: "server"
});
```

#### Check method
The check method is devised to fetch only the model version attribute and check is up to date. This has the sense to be used with remote sync modes. The server mode is configured to accept the `checkUrl`, which represent the checking endpoint.

```javascript
var User = Backbone.Model.extend({
  versionAttribute: "version",
  checkUrl: "A_CHECKING_ENDPOINT"
});

var user = User.create({
	id: 1,
    version: 1
});

// Assuming that the user is already fetched
user.isFetched(); // true

user.check({
	mode: "server",
    success: function (model, response, options) {
    	// Lets assume a new version is available,        
        // then the user is about to be fetched again.
        user.isFetched(); // false
    }
});
```
This method meant to be useful using through a **Collection** since you will verify the models all at once.

## Reference API

### Backbone.Repository

#### modes `Backbone.Repository.modes()`
Returns an array with the name of the available modes.

#### getMode `Backbone.Repository.getMode(name)`
Returns the sync function of the provided mode.

Available parameters:
* name {String} The mode name.

#### setMode `Backbone.Repository.setMode(name, [fn])`
Registers a new mode by provinding its name and sync function.

Available parameters:
* name {String|Object} The mode name or an object containing the name and sync function.
* fn {Function} The sync function

#### getDefaultMode `Backbone.Repository.getDefaultMode()`
Returns the default mode.

#### setDefaultMode `Backbone.Repository.setDefaultMode(name)`
Establish which mode will be used by default.

Available parameters:
* name {String} The mode name.
 
#### removeMode `Backbone.Repository.removeMode(name)`
Removes the sync mode registered.

Available parameters:
* name {String} The mode name.

#### reset `Backbone.Repository.reset(name)`
Cleans all the sync modes registered.
 
#### storagePrefix `Backbone.Repository.storagePrefix`
The prefix used in all storages. Requires [Locally extension](https://github.com/ozantunca/locally).

#### compressStorage `Backbone.Repository.compressStorage`
Wheter to use Locally compression by default or not. Requires [Locally extension](https://github.com/ozantunca/locally).

### Backbone.Model

#### create `Backbone.Model.create(attrs, [options])`
Factory method that returns a model instance and ensures only one is gonna be created with same id.

Available parameters:
* attrs {Object} The attributes for the new instance.
* options {Object} The options for the new instance.

#### find `Backbone.Model.find(attrs)`
Returns a model by its id or cid from the local cache of the model.

Available parameters:
* attrs {Object} An id or cid for looking up.

#### register `Backbone.Model.register()`
Returns the collection that represents the local cache of the model.

#### reset `Backbone.Model.reset()`
Resets the local cache of the model.

----
#### isFetched `model.isFetched([options])`
Returns `true` whether this model has been fetched through the sync mode or `false` otherwise.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name for checking.

#### dirtied `model.dirtied`
Internal hash containing all attributes that have changed since the last sync for each sync mode.

#### dirtiedAttributes `model.dirtiedAttributes([options])`
Retrieve a copy of the attributes that have changed since the last sync.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### hasDirtied `model.hasDirtied([options])`
Returns `true` in case the model changed since its last sync, `false` otherwise.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### isDirtyDestroyed `model.isDirtyDestroyed()`
Returns `true` if this model has been destroyed locally, `false` otherwise.

#### clearDirtied `model.clearDirtied()`
Erases dirtied changes of the model, whether attribute change or model destroy.

#### set `model.set(attrs, [options])`
Alters set method to provide new options.

Available parameters:
* options.dirty {Boolean} [dirty=true] Whether to handle dirtied changes or not.
* options.version {Boolean} [version=true] Whether to handle version changes or not.
* options.localStorage {Boolean} [localStorage= true] Forces to save the model in LocalStorage. Requires [Locally extension](https://github.com/ozantunca/locally).

#### isDestroyed `model.isDestroyed([options])`
Returns `true` if this model has been destroyed remotely, `false` otherwise.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### pull `model.pull([options])`
Fetches the model using the sync mode selected if it has not been fetched before.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### push `model.push([options])`
Pushes the changes performed to the model using the sync mode selected. It may emitt create, update or destroy operations.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### checkUrl `model.checkUrl`
The checking endpoint in the server mode.

#### check `model.check([options])`
Fetches version attribute of the model and checks the uptodate status.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.
* options.checkUrl {String} The checking endpoint in the server mode.

#### storeName `model.storeName`
The storage key for persisting the model. Requires [Locally extension](https://github.com/ozantunca/locally).

### Backbone.Collection

#### save `collection.save(attrs, [options])`
Saves the whole collection using the sync mode. The server mode emitts one request per model.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### destroy `collection.destroy([options])`
Destroys the whole collection using the sync mode. The server mode emitts one request per model.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### pull `collection.pull([options])`
Pulls the whole collection using the sync mode. The server mode may emit urls that take the form of url+ subset of ids for fetching separated by comma.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### push `collection.push([options])`
Pushes the changes of the whole collection using the sync mode. The server mode emitts one request per model.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.

#### check `collection.check([options])`
Checks the whole collection using the sync mode.

Available parameters:
* options.mode {String} [mode=defaultMode] The sync mode name.
* options.checkUrl {String} The checking endpoint in the server mode.

#### storeName `collection.storeName`
The storage key for persisting the collection. Requires [Locally extension](https://github.com/ozantunca/locally).

## Building and Testing
First install locally all the required development dependencies.
```bash
npm install
```

### Building

#### backbone-repository
```bash
grunt base
```

#### backbone-repository-locally
```bash
grunt baseLocally
```

### Testing
```bash
grunt test
```

## Release History
Read the CHANGELOG.md file distributed with the project.

## License
Read the LICENSE file distributed with the project.
