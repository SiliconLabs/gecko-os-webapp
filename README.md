# Gecko OS Web App

## Installation

The Gecko OS Web App uses the following development tools:

* [Node.js](http://nodejs.org)
* [Grunt](http://gruntjs.com)
* [Bower](http://bower.io)

To develop, build or run the WebGUI on your local machine, these will need to be installed. Instructions for installation of these tools:

* [Windows](docs/windows-install.md)
* [Linux](docs/linux-install.md)

After pulling the repo, run the following commands in a terminal to download and install required packages:
```
bower install
npm install
```

## Preparing the Gecko OS Device for Web App Development on a Local Server

To prepare the Gecko OS device to communicate with the local server, open a Gecko OS terminal on the device and issue the following commands:

```
set wlan.ssid               <NETWORK NAME>
set wlan.passkey            <NETWORK PASSWORD>
set wlan.auto_join.enabled  1
set http.server.enabled     1
set http.server.cors_origin *
save
reboot
```

For a tutorial in customizing the Gecko OS Web App, see:
[https://docs.silabs.com/](https://docs.silabs.com/)

## Development Testing

```grunt```

Will run a local nodejs server on port 5002 for testing

```grunt watch```

Will start a task that listens for file changes, and compile/compress HTML, CSS and JS

When developing on a local server and communicating with a remote device, set the option `host:'[device IP]'` when creating the device model in `/public/js/app.js`. _N.B. a comma will have to be added between the key value pairs (the line above) as this adds an additional property to the object._ To sucessfully communicate with a remote device, the Gecko OS variable `http.server.cors_origin` needs to be set appropriately.

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

## Licence

Gecko OS Web App, Gecko OS JS API Library & Gecko OS JS Build System

Copyright (C) 2019, Silicon Labs
All Rights Reserved.

The Gecko OS Web App, Gecko OS JavaScript API and Gecko OS JS build system are
provided by Silicon Labs. The combined source code, and all derivatives, are licensed
by Silicon Labs SOLELY for use with devices manufactured by Silicon Labs, or hardware
authorized by Silicon Labs.

THIS SOFTWARE IS PROVIDED BY THE AUTHOR 'AS IS' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
OF SUCH DAMAGE.
