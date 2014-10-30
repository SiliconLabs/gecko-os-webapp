# ACKme WiConnect Web Setup GUI

## Installation

```bower install```
```npm install```


## Development Testing

```grunt```

Will run a local nodejs server on port 5002 for testing

```grunt watch```

Will start a task that listens for file changes, and compile/compress HTML, CSS and JS

When developing on a local server and communicating with a remote device, set the option `host:'[device IP]'` when creating the device model in `/public/js/app.js`. Install the following chrome extension to allow cross origin requests. POST requests will not work when running a local server that communicates with a remote device

[chrome extension cross origin ajax requests](https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi?hl=en)


## Build / Compile

```grunt build```

Compiled and compressed JS, CSS and HTML files will be exported to `/out`
