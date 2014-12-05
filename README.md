# ACKme WiConnect Web Setup GUI

## Installation

The WiConnect WebGUI uses the following development tools:
-NodeJS
-Grunt
-Bower

To develop, build or run the WebGUI on your local machine, these will need to be installed. Instructions for installation of these tools:
-[Windows](docs/windows-install.md)
-[Linux](docs/linux-install.md)

After pulling the repo, run the following commands in a terminal to download and install required packages:
```
bower install
npm install
```


## Development Testing

```grunt```

Will run a local nodejs server on port 5002 for testing

```grunt watch```

Will start a task that listens for file changes, and compile/compress HTML, CSS and JS

When developing on a local server and communicating with a remote device, set the option `host:'[device IP]'` when creating the device model in `/public/js/app.js`. _N.B. a comma will have to be added between the key value pairs (the line above) as this adds an additional property to the object._ To sucessfully communicate with a remote device, the WiConnect variable `http.server.cors_origin` needs to be set appropriately.

If a grunt task fails to run and an error about missing packages is displayed, you may need to run `npm install` to install any missing packages.

## Build / Compile

```grunt build```

Compiled and compressed JS, CSS and HTML files will be exported to `/out`

Version, git hash, and build date information are automatically built into the complied JS as an object named `_webgui` for debugging purposes. To view the version/hash/build-date for reporting a bug, open the developer console in your browser, and type `_webgui` and press enter to view the current webgui version/hash/build-date information.

## Release

```grunt release:[type]```

Release an official major|minor|patch verion.
When the task is run, the project version is updated and the release will be committed and tagged with the appropriate version, and all files packaged into `/out/release/Release-[version].zip`

Appropriate uses of the release task:
```
grunt release:major
grunt release:minor
grunt release:patch
```


