'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('config');
var I = require('immutable');

var util = require('./util');

app.get('/', function (req, res) {
  console.log(__dirname + '/public/index.html');
  res.sendFile(__dirname + '/public/index.html');
});

app.use('/public', express['static']('static'));
app.use('/public/images', express['static']('images'));
app.get('/list', function (req, res) {
  res.sendFile(__dirname + '/public/list.html');
});

var listClients = function listClients(namespace, room, ioObj) {
  util.info('List Clients: ' + ioObj.nsps[namespace].adapter.rooms[room]);
};

io.on('connection', function (socket) {
  util.info('A user connected: ' + socket.id);

  io.emit('chat message', 'Connected new user.');
  io.sockets.connected[socket.id].emit('log-list', config.follow);

  socket.on('disconnect', function () {
    util.info('User disconnected');
    io.emit('chat message', 'Disconnect user.');
  });

  socket.on('chat message', function (msg) {
    util.info('message: ' + msg);
    io.emit('chat message', msg);
  });

  /**
   * data = { host: 'local', name: 'system' }
   */
  socket.on('join', function (data) {
    util.info('JOIN: ');
    util.dump(data);
    socket.join(data.name + '-' + data.host);
    listClients('/', data.name + '-' + data.host, io);
  });
});

var spawn = require('child_process').spawn;

/**
 * { host: 'local',
 *   info: { name: 'system', type: 'file', path: '/var/log/system.log' }
  *  user: 'foo' // remote only
  *   }
 * @param info
 */
var tailSetup = function tailSetup(info) {

  var tail = (function (d) {
    var target = d.info.path;

    var getH = function getH(h) {
      return h !== 'local' ? 'ssh ' + info.user + '@' + info.host : '';
    };
    var getT = function getT(t) {
      return t === 'file' ? 'tail -F ' + target : 'docker logs -f ' + target;
    };

    var cmdArray = (getH(d.host) + ' ' + getT(d.info.type)).trim().split(' ');
    util.dump(cmdArray);

    return spawn(cmdArray[0], cmdArray.slice(1));
  })(info);

  tail.stdout.on('data', function (data) {
    console.log('REMOTE_DATA: ' + data.toString('UTF-8'));
    util.info(info.info.name + '-' + info.host);
    io.to(info.info.name + '-' + info.host).json.emit('send', I.Map(info).set('msg', data.toString('UTF-8')));
  });

  tail.stderr.on('data', function (data) {
    io.emit('tail-error', data);
    util.error('REMOTE_ERR: ' + data);
  });

  tail.on('data', function (code) {
    util.dump(code);
    console.log('child process exited with code ' + code);
  });
};

Object.keys(config.follow).forEach(function (host) {
  config.follow[host].forEach(function (info) {
    var data = {
      'info': info
    };

    if (host !== 'local') {
      data.user = host.split('@')[0];
      data.host = host.split('@')[1];
    } else {
      data.host = host;
    }
    util.dump(data);
    tailSetup(data);
  });
});

http.listen(3000, function () {
  util.info('listening on *:3000');
});