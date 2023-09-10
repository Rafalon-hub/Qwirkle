const path = require('path');
const qwirkle = require('./qwirkle');
const express = require('express');
const app = express();
const serv = require('http').Server(app);
const io = require('socket.io')(serv, {});
const PORT = process.env.PORT || 8080;

app.get('/', function (_req: any, res: any) {
  res.sendFile(path.resolve('./client/index.html'));
});
app.use('/client', express.static(path.resolve('./client')));

serv.listen(PORT);
console.log(`Server started on port ${PORT}`);

io.sockets.on('connection', function (socket: any) {
  qwirkle.initGame(io, socket);
});
