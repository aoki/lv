'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('config');
//var I = require('immutable');

var util = require('./util');

util.dump(config);

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

app.use('/static', express.static('static'));
app.use('/images', express.static('images'));
app.get('/list', (req, res) => {
  res.sendFile(`${__dirname}/list.html`);
});


let listClients = (namespace, room, ioObj) => {
  //Object.keys()
  //for (var socketId in ) {
  console.log(ioObj.nsps[namespace].adapter.rooms[room]);
  //}
};

io.on('connection', (socket) => {
  console.log('a user connected');
  io.emit('log list', config.follow);
  //io.emit('logList', )
  io.emit('chat message', 'Connected new user.');
  socket.on('disconnect', () => {
    console.log('user disconnected');
    io.emit('chat message', 'Disconnect user.');
  });
  socket.on('chat message', (msg) => {
    console.log(`message: ${msg}`);
    io.emit('chat message', msg);
  });

  socket.on('join', (data) => {
    socket.join(data.name);
    listClients('/', data.room, io);
  });
});


var spawn = require('child_process').spawn;

// {
//    host: 'example.com',
//    key: 'nginx',
//    container: 'nginx'
//    path: '/var/log/nginx/access.log'
// }
let tailSetup = (info) => {
  // TODO: userはどうするか

  let tail = ((d) => {
    // TODO: containerかどうかフラグを持たせてしまた方がいい
    // TODO: containerの場合JSONを見やすいように整形する必要がある

    if (d.hasOwnProperty('host')) {
      let cmd = (d.hasOwnProperty('container')) ? 'docker' : 'tail';
      let subCmd = (d.hasOwnProperty('container')) ? 'logs' : '';
      let target = (d.hasOwnProperty('container')) ? d.container : d.path;
      if (d.host === 'local') {
        return spawn(cmd, [subCmd, '-f', `${target}`]);
      } else {
        return spawn('ssh', [d.host, `${cmd} ${subCmd} -f ${target}`]);
      }
    }
  })(info);

  tail.stdout.on('data', (data) => {
    console.log(`REMOTE_DATA: ${data}`);
    io.emit('chat message', data.toString('UTF-8'));
    util.dump(info);
    io.to(`${info.host}/${info.key}`).emit('send', data.toString('UTF-8'));
    //io.to('local/nginx').emit('send', data.toString('UTF-8'));
  });

  tail.stderr.on('data', (data) => {
    util.dump(data);
    console.log(`REMOTE_ERR: ${data}`);
  });

  tail.on('data', (code) => {
    util.dump(code);
    console.log(`child process exited with code ${code}`);
  });
};
//
//let followList = () => {
//  let host2x = (host) => {
//    Object.keys(config.follow[host]).forEach((k) => {
//    }
//  };
//
//  Object.keys(config.follow).reduce((host) => {
//    Object.keys(config.follow[host]).forEach((acc, k) => {
//      acc[]
//    }, {});
//}

Object.keys(config.follow).forEach((host) => {
  Object.keys(config.follow[host]).forEach((k) => {
    console.log(`${host}: ${k}`);

    let data = {
      'host': host,
      'key': k
    };
    if (config.follow[host][k].hasOwnProperty('container')) {
      data.container = config.follow[host][k].container;
    } else {
      data.path = config.follow[host][k];
    }
    tailSetup(data);
  });
});


http.listen(3000, () => {
  console.log('listening on *:3000');
});
