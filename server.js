'use strict';

var express = require('express'),
    app = express();

app.root = __dirname;

app.set('view engine', 'jade');
app.set('views', app.root + '/public/views');

app.use(express.static(__dirname + '/out'));
app.use('/webapp', express.static(__dirname + '/out/webapp'));

app.get('*', function(req, res){
  res.render('index');
});

module.exports = app;
