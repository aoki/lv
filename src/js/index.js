'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('config');
var I = require('immutable');

var util = require('./util');

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/public/index.html`);
});

app.use('/static', express.static('public'));
app.use('/public/images', express.static('images'));
app.get('/list', (req, res) => {
  res.sendFile(`${__dirname}/public/list.html`);
});


let listClients = (namespace, room, ioObj) => {
  util.info(`List Clients: ${ioObj.nsps[namespace].adapter.rooms[room]}`);
};

io.on('connection', (socket) => {
  util.info(`A user connected: ${socket.id}`);

  io.emit('chat message', 'Connected new user.');
  io.sockets.connected[socket.id].emit('log-list', config.follow);

  socket.on('disconnect', () => {
    util.info('User disconnected');
    io.emit('chat message', 'Disconnect user.');
  });

  socket.on('chat message', (msg) => {
    util.info(`message: ${msg}`);
    io.emit('chat message', msg);
  });

  /**
   * data = { host: 'local', name: 'system' }
   */
  socket.on('join', (data) => {
    util.info('JOIN: ');
    util.dump(data);
    socket.join(`${data.name}-${data.host}`);
    listClients('/', `${data.name}-${data.host}`, io);
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
let tailSetup = (info) => {

  let tail = ((d) => {
    let target = d.info.path;

    let getH = (h) => {
      return (h !== 'local') ? `ssh ${info.user}@${info.host}` : '';
    };
    let getT = (t) => {
      return (t === 'file') ? `tail -F ${target}` : `docker logs -f ${target}`;
    };

    let cmdArray = `${getH(d.host)} ${getT(d.info.type)}`.trim().split(' ');
    util.dump(cmdArray);

    return spawn(cmdArray[0], cmdArray.slice(1));
  })(info);

  tail.stdout.on('data', (data) => {
    console.log(`REMOTE_DATA: ${data.toString('UTF-8')}`);
    util.info(`${info.info.name}-${info.host}`);
    io.to(`${info.info.name}-${info.host}`).json.emit('send', I.Map(info).set('msg', data.toString('UTF-8')));
  });

  tail.stderr.on('data', (data) => {
    io.emit('tail-error', data);
    util.error(`REMOTE_ERR: ${data}`);
  });

  tail.on('data', (code) => {
    util.dump(code);
    console.log(`child process exited with code ${code}`);
  });
};

Object.keys(config.follow).forEach((host) => {
  config.follow[host].forEach((info) => {
    let data = {
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


http.listen(3000, () => {
  util.info('listening on *:3000');
});
