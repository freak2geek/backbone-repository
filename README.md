# backbone-repository

**The module is under development. It will be available soon.**

Backbone extension that implements purposes of the Repository pattern, which means the enhancement of the model management and synchronization, so as to provide strong features to build online, offline and hybrid web applications.

## Versions
* **backbone-repository** - core library.
* **backbone-respository-locally** - core library + localStorage support through the [Locally plugin](https://github.com/ozantunca/locally)

## Table of Contents
- [Features](#features)
	- [Model register](#model-register)
	- [Sync mode](#sync-mode)
		- [Server mode](#server-mode)
		- [Client mode](#client-mode)
		- [LocalStorage mode (requires Locally extension)](#localstorage-mode-requires-locally-extension)
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
- [Reference API](#reference-api)
	- [Backbone.Repository](#backbonerepository)
	- [Backbone.Model](#backbonemodel)
	- [Backbone.Collection](#backbonecollection)
- [Building and Testing](#building-and-testing)
	- [Building](#building)
	- [Testing](#testing)
- [Release History](#release-history)
- [License](#license)

## Features

![enter image description here](http://s30.postimg.org/xzax33qxt/diagrama_Con_Registro.png)

The library mainly supports the following features:

* **Model register**: A *Collection* (C) keeps models instantiated.
* **Sync modes**: *Sync modes* (m) are sync functions to different data sources that are managed by a *Repository* (R).
* **Sync state and operations**: A *Model* (M) keeps changes to sync and run sync operations against a sync mode.

### Model register
The extension implements a model caching strategy. By this, a model register in the form of a collection will be responsible for keeping in-memory all instantiated models.
```javascript
var User = Backbone.Model.extend();

// A static method that returns the collection of users
User.register();
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

### Sync mode
A sync mode is responsible to provide logic to access to different data sources. There exists several predefined modes, but you are enable to configure your custom sync mode as well.

For using a mode, you must pass the mode as an option for every single sync operation.

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
The LocalStorage mode runs the model operations against LocalStorage. Both the success and error callbacks are allowed in this mode. For working, it requires [Locally plugin](https://github.com/ozantunca/locally) and the backbone-repository-locally version of the library.


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
// The 'set' method automatically stores dirtied attributes.
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
Along with predefined sync operations you can perform from a model such as fetch, save and destroy, the extension implements two useful methods: pull and push.

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
The push method performs a request whether destroy, create or update methods according to the sync status.

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

## Reference API
### Backbone.Repository
### Backbone.Model
### Backbone.Collection

## Building and Testing
First install locally all the required development dependencies.
```bash
npm install
```

### Building
```bash
grunt
```

### Testing
```bash
grunt test
```

## Release History
Read the CHANGELOG.md file distributed with the project.

## License
Read the LICENSE file distributed with the project.
