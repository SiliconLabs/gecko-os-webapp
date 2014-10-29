# ACKme WiConnect Web Setup GUI

## Installation

```bower install```
```npm install```


## Development Testing

```grunt```

Will run a local nodejs server on port 5002 for testing

### Development Options

The WiConnect GUI has been primarily developed using Jade HTML templating `http://jade-lang.com/` and LESS CSS pre-processing language `http://lesscss.org/`

If you are unfamiliar with Jade and wish to write traditional HTML run the following grunt task:

```grunt no-jade```

This will create the file `public/views/index.html` for development.

#### N.B. running this grunt task again will overwrite any changes made to `index.html`

If you are unfamiliar with LESS and wish to write traditional CSS run the following grunt task:

```grunt no-less```

This will create the file `public/css/wiconnect-webgui.css` for development.

#### N.B. running this grunt task again will overwrite any changes made to `wiconnect-webgui.css`

## Build / Compile

```grunt build```

Compiled and compressed JS, CSS and HTML files will be exported to `/out`
