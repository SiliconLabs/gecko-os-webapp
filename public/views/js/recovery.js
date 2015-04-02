var w = {};

w.send = function(args, callback) {
  var x = new XMLHttpRequest();
  if('withCredentials' in x) {
  }else if(typeof XDomainRequest !== "undefined") {
    // fknIE
    x = new XDomainRequest();
  }else{
      return new Error('CORS not supported');
  }

  args.url = args.url || '/command';
  args.async = args.async || true;

  x.timeout = 30000;

  x.open(args.method, args.url, args.async);

  x.onreadystatechange = function() {
    if (x.readyState === 4 && x.status === 200) {
      return callback(null, JSON.parse(x.responseText));
    }
    if (x.readyState === 4) {
      return callback(new Error(x.status), x.responseText);
    }
  };

  if(args.contentType){
    //avoid CORS preflight
    x.setRequestHeader('Content-type', args.contentType);
  }


  x.send(args.data);
};

w.get = function(args, callback) {
  args.method = 'GET';
  w.send(args, callback);
};

w.post = function(args, callback) {
  args.method = 'POST';
  w.send(args, callback);
};

var output = {
  el: document.getElementById('output'),
  log: function() {
    var args = Array.prototype.slice.call(arguments);
    var line = document.createElement('line');
    line.innerHTML = args.join(' ');
    this.el.appendChild(line);

    //add status placeholder
    var status = document.createElement('span');
    line.appendChild(status);

    //return method to update status placeholder
    return function(s){status.innerHTML = s;};
  },
  clear: function() {
    var self = this;
    while(self.el.firstChild){
      self.el.removeChild(self.el.firstChild);
    }
  }
};

//task runner
var run = function(seq, done, logging) {
  //sequence:{
  //  'process-name': {
  //    fn: function(data, next){},
  //    [onErr]: function(){} || break,
  //    [retries]: 3 || 0
  //  },
  //  'just-process': function(data, next),
  //  'next-process': {}
  //}
  logging = logging || false;

  if(seq.length <= 0) {
    return done();
  }

  var data = {};

  var runner = function(q, attempt){
    if(q === Object.keys(seq).length) {
      return done(null, data);
    }

    var k = Object.keys(seq)[q];

    if(typeof seq[k] === 'function') {
      seq[k] = {fn: seq[k]};
    }

    attempt = attempt || 0;
    seq[k].retries = seq[k].retries || 3;

    var s;
    if(logging) {
      s = output.log('<b>running</b> <u>' + k + '</u>');
    }

    seq[k].fn(data, function(err, res) {
      if(err){
        if(logging) {
          s('<b class="err">error</b>');
        }

        if(seq[k].retries < attempt) {
          return runner(q, attempt++);
        }

        if(typeof seq[k].onErr === 'function') {
          return seq[k].onErr(err, done);
        }

        return done(err);
      }

      if(logging) {
        s('<b class="pass">complete</b>');
      }

      data[k] = res;

      runner(q+1);
    });
  };

  runner(0);
};

// var host = 'http://10.5.6.68'; //testing
var host = '';

var clean = function(str) {
  return str.replace('\r\n','');
};

//default response handler
var defRes = function(err, res, next){
  if(err) {
    return next(err);
  }
  if(clean(res.response).toLowerCase() === 'command failed') {
    return next(new Error());
  }
  return next(null, clean(res.response));
};

//setup sequence
var setupSeq = {
  'setup': function(data, next) {
    w.get({url: host + '/command/setup%20status'}, function(err, res) {defRes(err, res, next);});
  },
  'http-interface': function(data, next) {
    w.get({url: host + '/command/get%20ht%20s%20i'}, function(err, res) {defRes(err, res, next);});
  },
  'default-interface': function(data, next) {
    w.get({url: host + '/command/get%20ne%20f'}, function(err, res) {defRes(err, res, next);});
  },
  'interface': function(data, next) {
    var iface = data['http-interface'];
    if(Boolean(Number(data.setup))) {
      return next(null, 'setup');
    }
    if(iface === 'default') {
      iface = data['default-interface'];
    }
    if(iface !== 'wlan'){
      return next(new Error('Recovery not available in SoftAP mode.'));
    }
    next(null, iface);
  },
  'gui': function(data, next){
    switch(data.interface) {
      case 'setup':
        document.querySelectorAll('.setup')[0].className = 'setup';
        break;
      case 'wlan':
        document.querySelectorAll('.wlan')[0].className = 'wlan';
        break;
      default:
        return next(new Error('Recovery not available in SoftAP mode'));
    }
    output.clear();
    output.log('<b>Ready</b>');
    next();
  }
};

// set network sequence
var netSeq = {
  'set-ssid': function(data, next) {
    w.post({url: host + '/command', data: JSON.stringify({flags:0, command: 'set wl s \"' + document.getElementsByName("ssid")[0].value + '\"'}) }, function(err, res) {defRes(err, res, next); });
  },
  'set-password': function(data, next) {
    w.post({url: host + '/command', data: JSON.stringify({flags:0, command: 'set wl p \"' + document.getElementsByName("password")[0].value + '\"'}) }, function(err, res) {defRes(err, res, next); });
  },
  'save': function(data, next) {
    w.post({url: host + '/command', data: JSON.stringify({flags:0, command: 'save'}) }, function(err, res) {defRes(err, res, next); });
  },
  'setup-stop': function(data, next) {
    w.post({url: host + '/command', data: JSON.stringify({flags:0, command: 'setup stop'}) }, function(err, res) {defRes(err, res, next); });
  }
};

//recovery sequence
var recSeq = {
  'start': function(data, next) {
    output.log('starting recovery');
    next();
  },
  'version': function(data, next) {
    w.get({url: host + '/command/ver'}, function(err, res) {
      if(err) {
        return next(err);
      }
      if(clean(res.response).toLowerCase() === 'command failed') {
        return next(new Error());
      }
      var ver = clean(res.response).split(',')[0].split('-');
      ver = ver[ver.length-1];
      ver = ver.split('.').slice(0,2).join('.');

      return next(null, ver);
    });
  },
  'manifest': function(data, next) {
    var status = output.log('retrieving manifest from CDN: resources.ack.me/webapp/' + data.version + '/release');

    w.get({url:'http://resources.ack.me/webapp/' + data.version + '/release/version.json'}, function(err, res){
      status('done');
      next(err, res);
    });
  },
  'download-webapp': function(data, next) {
    var dl = function(f, attempt) {
      if(f >= data.manifest.files.length) {
        return next(null);
      }

      attempt = Number(attempt) || 1;

      var file = data.manifest.files[f];
      var s = output.log('downloading', file.name, '(' + Number(attempt) + '/3)');
      s('downloading');
      w.post({url: host + '/command',
        data: JSON.stringify({flags:0, command: 'http_download -e -c ' + file.crc + ' http://resources.ack.me/webapp/' + data.version + '/release/' + file.name + ' webapp/' + file.name})
      }, function(err, res) {
        if(err || (clean(res.response).toLowerCase() === 'command failed')) {
          s('failed');
          if(attempt < 3) {
            return dl(f, attempt+1);
          }
          return next(err || new Error('download failed'));
        }
        s('downloaded');
        dl(f+1);
      });
    };
    dl(0);
  },
  'set-web-root': function(data, next) {
    w.post({url: host + '/command', data: JSON.stringify({flags:0, command: 'set ht s r webapp/index.html'}) }, function(err, res) {defRes(err, res, next); });
  },
  'set-setup-root': function(data, next) {
    w.post({url: host + '/command', data: JSON.stringify({flags:0, command: 'set se w r webapp/index.html'}) }, function(err, res) {defRes(err, res, next); });
  },
  'save': function(data, next) {
    w.post({url: host + '/command', data: JSON.stringify({flags:0, command: 'save'}) }, function(err, res) {defRes(err, res, next); });
  },
  'network-restart': function(data, next) {
    w.post({url: host + '/command', data: JSON.stringify({flags:0, command: 'nre'}) }, function(err, res) {defRes(err, res, next); });
  },
  'reconnect': function(data, next) {
    var reconnect = function(attempt) {
      attempt = Number(attempt) || 1;
      var s = output.log('waiting for response');
      w.get({url: host + '/command/ver'}, function(err, res) {
        if(err) {
          s('timeout');
          if(attempt < 3){ //3 retries * 3 taskmanager retries * 30sec timeout
            return reconnect(attempt+1);
          }
          return next(new Error('unable to reconnect to device'));
        }
        s('success');
        return next(err, res);
      });
    };

    reconnect();
  }
};

var recover = function() {
  run(recSeq, function(err, res){
    if(err) {
      return output.log('<b class="err">Error:</b>')(err.message);
    }
    output.log('<b class="pass">Recovery complete.</b>')('redirecting in 5 seconds');
    setTimeout(function(){top.location = document.location.origin;}, 5000);
  }, true);
};

var saveNetwork = function() {
  document.querySelectorAll('.setup')[0].className += ' hidden';
  run(netSeq, function(err, res){
    if(err) {
      return output.log('<b class="err">Error:</b>')(err.message);
    }
    output.log('<b class="pass">Network SSID and password saved.</b>')('setup stopped');
  }, true);
};

var interface = '';

document.onreadystatechange = function(){
  if (document.readyState === "interactive") { //DOM ready
    run(setupSeq, function(err, res){
      if(err){
        return output.log('<b class="err">Error during setup:</b>')(err.message);
      }
      interface = res.interface;
    }, true);
  }
};
