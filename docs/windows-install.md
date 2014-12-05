Install NVM and NodeJS
----------------------

Download NodeJS [Windows Installer](http://nodejs.org/download/)

Run the installer (next, next, next, next, next, next, next ...... next, finish)


Check NodeJS Install
--------------------

Open windows command prompt, type `npm help`, if you see help documentation then installed correctly. If you see a `ENOENT c:\users\[username]\AppData\Roaming` error then create a new empty folder named `npm` in the `c:\users\[username]\AppData\Roaming directory`. Retry `npm help` in the command prompt and you should see the help documentation.


Install Bower package manager
-----------------------------

Enter `npm install -g bower` in a command prompt, wait for it to finish (it may take a few minutes)


Install Grunt Task runner:
--------------------------

Enter `npm install -g grunt-cli` in a command prompt, wait for it to finish (it may take a few minutes)
