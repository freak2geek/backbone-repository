# Backbone.Syncer

Backbone helper that alters and add manager methods to Backbone Model and Collection. Provides a local cache to track models and supports LocalStorage.

## Table of Contents

## Usage
### Backbone.Model
#### Class methods
##### Model.create(attrs, [options])
* **attrs** {Object} Attributes for the new instance.
* **options** {Object} Options for the new instance.

Factory method that returns a model instance and ensures only one is gonna be created with same id. It keeps the instantiated models in a local cache collection.

##### Model.find(attrs)
* **attrs** {Object} An id or cid for looking up.

Returns a model, by its id or cid, from the local cache collection of the model.

##### Model.all()

Returns the collection that represents the local cache of the model.

##### Model.reset()

Resets the local cache collection of the model.

#### Instance methods

##### model.fetch([options])
* **options** {Object} Options for the fetch call.
  * **options.mode** {String} [default:infinite]
	  * *infinite*. 
	  
        Fetches the model locally if exists. Otherwise, remotelly.
    * *server*. 

        Fetches the model remotely.
  * **options.localStorage** {Boolean|Object} Whether or not use LocalStorage or Locally options.

##### model.save(attrs, [options])
* **options** {Object} Options for the save call.
  * **options.mode** {String} [default:server]
	  * *client*. 
	  
        Updates the model locally. The changes no synchronized are kept for future pushes.
    * *server*. 

        Updates the model both locally and remotely.
  * **options.localStorage** {Boolean|Object} Whether or not use LocalStorage or Locally options.

##### model.destroy([options])
* **options** {Object} Options for the destroy call.
  * **options.mode** {String} [default:server]
	  * *client*. 
	  
        Deletes the model locally. The destroy change no synchronized is kept for future pushes.
    * *server*. 

        Deletes the model both locally and remotely.
  * **options.localStorage** {Boolean|Object} Whether or not use LocalStorage or Locally options.

##### model.pull([options])
* **options** {Object} Options for the fetch call.
  * **options.localStorage** {Boolean|Object} Whether or not use LocalStorage or Locally options.

Fetches the model if it has not been fetched before.

##### model.push([options])
* **options** {Object} Options for the remote calls.
  * **options.localStorage** {Boolean|Object} Whether or not use LocalStorage or Locally options.

Pushes the changes performed to the model; create, update or destroy. In case you wish to distingish which call was finished in remote callbacks, an option "method" is passed.
``` javascript
model.push({
  success: function (model, response, options) {
    // options.method ["create"|"update"|"patch"|"destroy"]
  }
})
```

##### model.isFetched()

Returns 'true' if this model has been fetched remotely, 'false' otherwise.

##### model.dirtiedAttributes()

Retrieves a copy of the attributes that have changed since the last server synchronization.

##### model.hasDirtied(attr)
* **attr** {String} The attribute to check if has been changed.

Returns 'true' in case the model changed since its last sever synchronization, 'false' otherwise.

##### model.isDirtyDestroyed()

Returns 'true' if this model has been destroyed locally, 'false' otherwise.

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

## Contributing
In lieu of a formal styleguide, take care to maintain the existing
coding style.
Add unit tests for any new or changed functionality. Lint and test your
code using [grunt](https://github.com/cowboy/grunt).

## Release History
Read the CHANGELOG.md file distributed with the project.

## License
Read the LICENSE file distributed with the project.
