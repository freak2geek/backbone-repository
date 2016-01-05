# backbone-repository

**The module is under development. It will be available soon.**

Backbone extension that implements purposes of the Repository pattern, which means the enhancement of the model management and synchronization, so as to provide strong features to build online, offline and hybrid web applications.

## Versions
* **backbone-repository** - core library.
* **backbone-respository-locally** - core library + localStorage support through Locally plugin

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
		- [Attributes state](#attributes-state)
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
* **Sync modes**: *Sync modes* (m) are sync functions to different persistance layers that are managed by a *Repository* (R).
* **Sync state and operations**: A *Model* (M) keeps changes to sync and run sync operations against a sync mode.

### Model register

### Sync mode

#### Server mode

#### Client mode

#### LocalStorage mode (requires Locally extension)

#### Custom mode

### Sync state
#### Fetch state
#### Attributes state
#### Destroy state
#### Version attribute

### Sync operations

#### Pull method

#### Push method

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
