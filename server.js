const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

// Rooms store
const rooms = {};

function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (let s of suits) for (let v of values) deck.push(`${v}${s}`);
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

io.on("connection", socket => {
  console.log("connect", socket.id);

  socket.on("createRoom", ({roomId, name}, cb) => {
    if (!roomId) return cb({error: "Room ID required"});
    if (rooms[roomId]) return cb({error: "Room exists"});
    rooms[roomId] = {
      id: roomId,
      players: {},
      order: [],
      deck: createDeck(),
      table: [],
      state: "waiting" // waiting, playing
    };
    console.log("room created", roomId);
    joinRoom(roomId, socket, name, cb);
  });

  socket.on("joinRoom", ({roomId, name}, cb) => {
    if (!roomId) return cb({error: "Room ID required"});
    if (!rooms[roomId]) return cb({error: "No such room"});
    joinRoom(roomId, socket, name, cb);
  });

  function joinRoom(roomId, socket, name, cb) {
    const room = rooms[roomId];
    room.players[socket.id] = { id: socket.id, name: name || "Player", hand: [], ready: false };
    room.order.push(socket.id);
    socket.join(roomId);
    emitRoom(roomId);
    cb({ok:true, room: roomSummary(room)});
  }

  socket.on("leaveRoom", ({roomId}, cb) => {
    leaveRoom(roomId, socket.id);
    cb && cb({ok:true});
  });

  socket.on("toggleReady", ({roomId}, cb) => {
    const room = rooms[roomId]; if (!room) return;
    const p = room.players[socket.id]; if (!p) return;
    p.ready = !p.ready;
    // if all ready and at least 2 players, start
    const players = Object.values(room.players);
    if (players.length >= 2 && players.every(x => x.ready)) {
      startGame(roomId);
    } else {
      emitRoom(roomId);
    }
    cb && cb({ok:true});
  });

  socket.on("drawCard", ({roomId}, cb) => {
    const room = rooms[roomId]; if (!room) return;
    if (room.deck.length === 0) return cb && cb({error:"deck empty"});
    const card = room.deck.pop();
    room.players[socket.id].hand.push(card);
    emitRoom(roomId);
    cb && cb({ok:true, card});
  });

  socket.on("playCard", ({roomId, card}, cb) => {
    const room = rooms[roomId]; if (!room) return;
    const player = room.players[socket.id]; if (!player) return;
    // enforce turn if playing
    if (room.state === "playing") {
      const currentTurnId = room.order[room.turnIndex];
      if (currentTurnId !== socket.id) return cb && cb({error:"Not your turn"});
    }
    const idx = player.hand.indexOf(card);
    if (idx === -1) return cb && cb({error:"Card not in hand"});
    player.hand.splice(idx,1);
    room.table.push({playerId: socket.id, card});
    // advance turn if playing
    if (room.state === "playing") {
      room.turnIndex = (room.turnIndex + 1) % room.order.length;
    }
    emitRoom(roomId);
    cb && cb({ok:true});
  });

  socket.on("disconnecting", () => {
    // remove from any rooms
    for (const roomId of Object.keys(socket.rooms)) {
      if (rooms[roomId]) leaveRoom(roomId, socket.id);
    }
  });

  function leaveRoom(roomId, sid) {
    const room = rooms[roomId]; if (!room) return;
    delete room.players[sid];
    const idx = room.order.indexOf(sid);
    if (idx !== -1) room.order.splice(idx,1);
    // if no players left, delete room
    if (Object.keys(room.players).length === 0) {
      delete rooms[roomId];
      return;
    }
    // adjust turnIndex
    if (room.turnIndex !== undefined) {
      if (room.turnIndex >= room.order.length) room.turnIndex = 0;
    }
    emitRoom(roomId);
  }

  function emitRoom(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    io.to(roomId).emit("roomUpdate", roomSummary(room));
  }

  function roomSummary(room) {
    return {
      id: room.id,
      players: Object.values(room.players).map(p => ({id:p.id, name:p.name, handSize: p.hand.length, ready: p.ready})),
      deckCount: room.deck.length,
      table: room.table,
      state: room.state,
      order: room.order,
      turnIndex: room.turnIndex
    };
  }

  function startGame(roomId) {
    const room = rooms[roomId];
    room.state = "playing";
    room.turnIndex = 0;
    // deal 5 cards each (or as many as available)
    const n = 5;
    for (let i = 0; i < n; i++) {
      for (const pid of room.order) {
        if (room.deck.length === 0) break;
        const c = room.deck.pop();
        room.players[pid].hand.push(c);
      }
    }
    emitRoom(roomId);
  }

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server listening on", PORT));