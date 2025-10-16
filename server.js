const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const fs = require('fs');
app.use(express.json());
app.use(express.static('public'));

let CARDS = {};
try { CARDS = JSON.parse(fs.readFileSync('./public/cards/cards.json')); }
catch (e) { console.warn('cards.json missing; please add your cards in public/cards/cards.json'); CARDS={divines:[],followers:[]}; }

function findCard(id){ return CARDS.divines.find(d=>d.id===id) || CARDS.followers.find(f=>f.id===id); }

function encodeDeck(arr){ const s=arr.join(','); return Buffer.from(s).toString('base64').replace(/=/g,''); }
function decodeDeck(code){ try{ let pad = code.length%4; if(pad) code += '='.repeat(4-pad); const s = Buffer.from(code,'base64').toString('utf8'); return s.split(',').filter(Boolean); } catch(e){return null;} }

const rooms = {};

function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }

function newGameState(mode, deckA, deckB){
  return {
    mode: mode||'pvp',
    players: {},
    order: [],
    turnIndex: 0,
    table: [],
    decks: { A: deckA?deckA.slice():[], B: deckB?deckB.slice():[] },
    started: false,
    currentRoundPlays: [] // plays in current resolution round
  };
}

function summarizeRoom(roomId){
  const r = rooms[roomId]; if(!r) return null;
  const players = Object.entries(r.players).map(([id,p])=>({ id, name:p.name, hand: p.hand, handSize: p.hand.length, ready: p.ready, divine: p.divine, divineHP: p.divineHP, runes: p.runes }));
  return {
    id: roomId, mode: r.mode, players, deckCounts: {A: r.decks.A.length, B: r.decks.B.length},
    table: r.table, started: r.started, order: r.order, turnIndex: r.turnIndex, currentRoundPlays: r.currentRoundPlays
  };
}

// Resolve a round when each active player has played >=1 in currentRoundPlays
function tryResolveRound(roomId){
  const r = rooms[roomId]; if(!r) return;
  const activePlayers = r.order.filter(pid=> r.players[pid]);
  // require each active player to have at least one play in currentRoundPlays
  const playedSet = new Set(r.currentRoundPlays.map(p=>p.playerId));
  if(!activePlayers.every(p=>playedSet.has(p))) return; // not ready yet

  // calculate total attack per player for plays in this round
  const totals = {};
  const elementsPlayed = {};
  for(const p of r.currentRoundPlays){
    const info = findCard(p.card);
    if(!info) continue;
    totals[p.playerId] = (totals[p.playerId]||0) + (info.attack||0);
    elementsPlayed[p.playerId] = elementsPlayed[p.playerId] || new Set();
    if(info.element) elementsPlayed[p.playerId].add(info.element);
  }

  // determine winner (highest total attack). if tie -> no damage, clear plays
  let winner = null; let best = -1; let tie=false;
  for(const pid of activePlayers){
    const val = totals[pid]||0;
    if(val > best){ best = val; winner = pid; tie=false; }
    else if(val === best) tie = true;
  }

  if(tie || winner===null){
    // no damage, just clear current round plays and leave runes as-is
    r.currentRoundPlays = [];
    // keep r.table history but mark round separation
    r.table.push({system:'Round resolved - tie or no plays'});
    io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
    return;
  }

  // Opponent(s) take damage. For 1v1, opponent is the other player.
  const opponent = activePlayers.find(p=>p!==winner);
  if(!opponent){ r.currentRoundPlays = []; io.to(roomId).emit('roomUpdate', summarizeRoom(roomId)); return; }

  const attackValue = totals[winner]||0;
  // sum runes matching elements of winner's played cards
  const elSet = elementsPlayed[winner] || new Set();
  let runeBonus = 0;
  for(const el of elSet){
    runeBonus += (r.players[winner].runes[el]||0);
  }
  const damage = attackValue + runeBonus;

  // subtract from opponent divine HP
  r.players[opponent].divineHP = (r.players[opponent].divineHP || 0) - damage;

  // record the resolution in table for UI
  r.table.push({system:`${r.players[winner].name} wins round: dealt ${damage} damage to ${r.players[opponent].name}`});

  // clear current round plays
  r.currentRoundPlays = [];

  // check victory
  if(r.players[opponent].divineHP <= 0){
    r.table.push({system:`${r.players[winner].name} wins the match!`});
    r.started = false;
  }

  io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
}

io.on('connection', socket=>{
  console.log('conn', socket.id);

  socket.on('generateDeckCode', ({divineId, followers}, cb)=>{
    if(!divineId || !followers || followers.length!==15) return cb({error:'Deck must include 1 divine and 15 followers'});
    const code = encodeDeck([divineId].concat(followers));
    cb({ok:true, code});
  });

  socket.on('decodeDeck', ({code}, cb)=>{ const arr = decodeDeck(code); if(!arr) return cb({error:'Invalid code'}); cb({ok:true, deck:arr}); });

  socket.on('createRoomWithDeck', ({roomId, name, deckCode, mode}, cb)=>{
    if(!roomId) return cb({error:'roomId required'}); if(rooms[roomId]) return cb({error:'room exists'});
    const arr = decodeDeck(deckCode); if(!arr) return cb({error:'invalid deck code'});
    const deckA = shuffleArray(arr.slice());
    let deckB = [];
    if(mode==='ai'){
      const divs = CARDS.divines.map(d=>d.id).filter(x=>x!==arr[0]);
      const botDiv = divs[Math.floor(Math.random()*divs.length)];
      const followers = CARDS.followers.map(f=>f.id);
      shuffleArray(followers);
      deckB = [botDiv].concat(followers.slice(0,15));
    }
    rooms[roomId] = newGameState(mode, deckA, deckB);
    // add creator as first player
    const p = { id: socket.id, name: name||'Player', hand:[], ready:false, divine: arr[0], runes:{}, isBot:false, divineHP: (findCard(arr[0])||{}).hp || 30 };
    rooms[roomId].players[socket.id] = p;
    rooms[roomId].order.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
    cb({ok:true});
    if(mode==='ai'){
      const botId = 'BOT_'+Math.random().toString(36).slice(2,8);
      rooms[roomId].players[botId] = { id: botId, name:'Bot', hand:[], ready:true, divine: rooms[roomId].decks.B[0], runes:{}, isBot:true, divineHP: (findCard(rooms[roomId].decks.B[0])||{}).hp || 30 };
      rooms[roomId].order.push(botId);
      // start immediately
      startMatch(roomId);
    }
  });

  socket.on('joinRoomWithDeckCode', ({roomId, name, deckCode}, cb)=>{
    const r = rooms[roomId]; if(!r) return cb({error:'no room'});
    const arr = decodeDeck(deckCode); if(!arr) return cb({error:'invalid deck code'});
    const p = { id: socket.id, name: name||'Player', hand:[], ready:false, divine: arr[0], runes:{}, isBot:false, divineHP: (findCard(arr[0])||{}).hp || 30 };
    r.players[socket.id] = p;
    r.order.push(socket.id);
    if(r.decks.B.length===0) r.decks.B = shuffleArray(arr.slice());
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
    cb({ok:true});
  });

  socket.on('startIfReady', ({roomId}, cb)=>{
    const r = rooms[roomId]; if(!r) return;
    if(Object.keys(r.players).length < 2) return cb({error:'Need 2 players'});
    const players = Object.values(r.players);
    if(r.mode==='ai' || players.every(p=>p.ready)) { startMatch(roomId); cb({ok:true}); }
    else cb({error:'Not ready'});
  });

  socket.on('drawFromDeck', ({roomId}, cb)=>{
    const r = rooms[roomId]; if(!r) return cb({error:'no room'});
    const player = r.players[socket.id]; if(!player) return cb({error:'not in room'});
    const ownerIndex = r.order.indexOf(socket.id); const deckKey = ownerIndex===0 ? 'A' : 'B';
    if(r.decks[deckKey].length===0) return cb({error:'deck empty'});
    const c = r.decks[deckKey].pop(); player.hand.push(c);
    io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
    cb({ok:true, card:c});
  });

  socket.on('playCard', ({roomId, cardId}, cb)=>{
    const r = rooms[roomId]; if(!r) return cb({error:'no room'});
    const player = r.players[socket.id]; if(!player) return cb({error:'not in room'});
    const currentId = r.order[r.turnIndex]; if(currentId !== socket.id) return cb({error:'Not your turn'});
    const idx = player.hand.indexOf(cardId); if(idx===-1) return cb({error:'Card not in hand'});
    // remove from hand and add to table and currentRoundPlays
    player.hand.splice(idx,1);
    r.table.push({playerId: socket.id, card: cardId});
    r.currentRoundPlays.push({playerId: socket.id, card: cardId});
    // grant rune
    const info = findCard(cardId);
    if(info && info.element) player.runes[info.element] = (player.runes[info.element]||0)+1;
    // advance turn
    r.turnIndex = (r.turnIndex + 1) % r.order.length;
    io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
    // try resolve if all played
    tryResolveRound(roomId);
    // if next is bot, schedule bot
    const nextId = r.order[r.turnIndex];
    if(r.players[nextId] && r.players[nextId].isBot) setTimeout(()=>botPlay(roomId), 500 + Math.random()*800);
    cb({ok:true});
  });

  socket.on('mulligan', ({roomId}, cb)=>{
    const r = rooms[roomId]; if(!r) return cb({error:'no room'});
    const p = r.players[socket.id]; if(!p) return cb({error:'not in room'});
    if(p.mulliganed) return cb({error:'Already mulliganed'});
    const ownerIndex = r.order.indexOf(socket.id); const deckKey = ownerIndex===0 ? 'A' : 'B';
    r.decks[deckKey] = r.decks[deckKey].concat(p.hand); p.hand = [];
    for(let i=0;i<4;i++){ if(r.decks[deckKey].length===0) break; p.hand.push(r.decks[deckKey].pop()); }
    p.mulliganed = true;
    io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
    cb({ok:true});
  });

  socket.on('disconnecting', ()=>{
    for(const roomId of Object.keys(socket.rooms)){ const r = rooms[roomId]; if(!r) continue; delete r.players[socket.id]; const idx = r.order.indexOf(socket.id); if(idx!==-1) r.order.splice(idx,1); io.to(roomId).emit('roomUpdate', summarizeRoom(roomId)); if(Object.keys(r.players).length===0) delete rooms[roomId]; }
  });

  function startMatch(roomId){
    const r = rooms[roomId]; if(!r) return;
    r.started = true; r.table = []; r.turnIndex = 0; r.currentRoundPlays = [];
    for(const id of r.order){
      const p = r.players[id];
      p.hand = []; p.runes = { fire:0, water:0, grass:0 }; p.mulliganed = false;
      const deckKey = r.order.indexOf(id)===0 ? 'A' : 'B';
      for(let i=0;i<4;i++){ if(r.decks[deckKey].length===0) break; p.hand.push(r.decks[deckKey].pop()); }
      // starting rune equal to divine element
      const dv = findCard(p.divine); if(dv && dv.element) p.runes[dv.element] = (p.runes[dv.element]||0)+1;
      p.divineHP = (dv && dv.hp) ? dv.hp : 30;
    }
    io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
  }

});

// simple bot logic: draw or play random from hand
function botPlay(roomId){
  const r = rooms[roomId]; if(!r) return;
  const botId = Object.keys(r.players).find(id=>r.players[id].isBot); if(!botId) return;
  const bot = r.players[botId];
  if(bot.hand.length>0){
    const idx = Math.floor(Math.random()*bot.hand.length);
    const card = bot.hand.splice(idx,1)[0];
    r.table.push({playerId: botId, card}); r.currentRoundPlays.push({playerId: botId, card});
    const info = findCard(card); if(info && info.element) bot.runes[info.element] = (bot.runes[info.element]||0)+1;
    r.turnIndex = (r.turnIndex + 1) % r.order.length;
    io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
    tryResolveRound(roomId);
  } else {
    // draw
    const deckKey = r.order.indexOf(botId)===0 ? 'A':'B';
    if(r.decks[deckKey].length>0){
      const c = r.decks[deckKey].pop(); bot.hand.push(c); io.to(roomId).emit('roomUpdate', summarizeRoom(roomId));
    }
  }
}

const PORT = process.env.PORT || 3000; server.listen(PORT, ()=>console.log('Server listening', PORT));
