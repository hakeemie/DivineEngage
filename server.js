import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use('/cards', express.static(path.join(__dirname, 'public', 'cards')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use(express.static(path.join(__dirname, 'dist')));

let CARDS = { divines: [], followers: [] };
try{ CARDS = JSON.parse(fs.readFileSync(path.join(__dirname,'src','data','cards.js')).toString().replace(/^\s*export default\s*/,'').trim()); }catch(e){ console.warn('cards not loaded',e.message); }

function findCard(id){ return (CARDS.divines.find(d=>d.id===id) || CARDS.followers.find(f=>f.id===id)); }
function encodeDeck(arr){ return Buffer.from(JSON.stringify(arr)).toString('base64').replace(/=/g,''); }
function decodeDeck(code){ try{ let pad = code.length%4; if(pad) code += '='.repeat(4-pad); return JSON.parse(Buffer.from(code,'base64').toString('utf8')); }catch(e){return null;} }

const rooms = {}; // private room store

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }

function newGameState(mode, deckA, deckB){ return { mode:mode||'pvp', players:{}, order:[], turnIndex:0, table:[], decks:{A:deckA?deckA.slice():[], B:deckB?deckB.slice():[]}, started:false, currentRoundPlays:[], confirms: {} }; }

function summarize(roomId){ const r = rooms[roomId]; if(!r) return null; const players = Object.entries(r.players).map(([id,p])=>({ id, name:p.name, hand:p.hand, handSize:p.hand.length, divine:p.divine, divineHP:p.divineHP, runes:p.runes, isBot:p.isBot })); return { id: roomId, mode: r.mode, players, deckCounts: {A: r.decks.A.length, B: r.decks.B.length}, table: r.table, started: r.started, order: r.order, turnIndex: r.turnIndex, currentRoundPlays: r.currentRoundPlays, confirms: r.confirms }; }

io.on('connection', socket=>{
  console.log('conn', socket.id);

  socket.on('createRoomPrivate', ({roomId}, cb)=>{
    if(!roomId) return cb && cb({error:'roomId required'});
    if(rooms[roomId]) return cb && cb({error:'room exists'});
    rooms[roomId] = newGameState('pvp', [], []);
    rooms[roomId].created = Date.now();
    console.log('created', roomId);
    cb && cb({ok:true});
  });

  socket.on('joinRoom', ({roomId}, cb)=>{
    const r = rooms[roomId];
    if(!r) return cb && cb({error:'room not found'});
    if(Object.keys(r.players).length >= 2) return cb && cb({error:'room full'});
    // add player placeholder - waiting for deck
    const name = 'Player_'+Math.random().toString(36).slice(2,6).toUpperCase();
    r.players[socket.id] = { id: socket.id, name, hand: [], ready:false, divine:null, runes:{fire:0,water:0,grass:0}, isBot:false, divineHP:30 };
    r.order.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    cb && cb({ok:true});
    // if two human players and both have decks, start when both entered decks
  });

  socket.on('enterRoomWithDeck', ({roomId, deckCode, name}, cb)=>{
    const r = rooms[roomId]; if(!r) return cb && cb({error:'room not found'});
    const arr = decodeDeck(deckCode); if(!arr) return cb && cb({error:'invalid deck code'});
    // place or replace player
    if(!r.players[socket.id]){
      r.players[socket.id] = { id: socket.id, name: name||'Player', hand: [], ready:false, divine:arr[0], runes:{fire:0,water:0,grass:0}, isBot:false, divineHP: (findCard(arr[0])||{}).hp || 30 };
      r.order.push(socket.id);
      socket.join(roomId);
    } else {
      r.players[socket.id].divine = arr[0];
      r.players[socket.id].divineHP = (findCard(arr[0])||{}).hp || 30;
    }
    // put rest of deck into decks.A or B depending on slot (first human is A)
    const idx = r.order.indexOf(socket.id);
    const key = idx===0 ? 'A':'B';
    r.decks[key] = shuffle(arr.slice());
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    cb && cb({ok:true});
    // if both players present with decks, start match
    if(Object.keys(r.players).length===2 && r.decks.A.length>0 && r.decks.B.length>0){
      startMatch(roomId);
    }
  });

  socket.on('createRoomWithDeck', ({roomId,name,deckCode,mode}, cb)=>{
    // convenience: create a unique room and start AI match (old behavior)
    const arr = decodeDeck(deckCode); if(!arr) return cb && cb({error:'invalid deck code'});
    const deckA = shuffle(arr.slice());
    const botDivs = CARDS.divines.map(d=>d.id).filter(x=>x!==arr[0]); const botDiv = botDivs[Math.floor(Math.random()*botDivs.length)];
    const followers = CARDS.followers.map(f=>f.id); shuffle(followers); const deckB = [botDiv].concat(followers.slice(0,15));
    const r = newGameState('ai', deckA, deckB);
    rooms[roomId] = r;
    r.players[socket.id] = { id: socket.id, name: name||'Player', hand:[], ready:false, divine: arr[0], runes:{fire:0,water:0,grass:0}, isBot:false, divineHP:(findCard(arr[0])||{}).hp||30 };
    r.order.push(socket.id);
    const botId = 'BOT_'+Math.random().toString(36).slice(2,8);
    r.players[botId] = { id:botId, name:'Bot', hand:[], ready:true, divine: r.decks.B[0], runes:{fire:0,water:0,grass:0}, isBot:true, divineHP:(findCard(r.decks.B[0])||{}).hp||30 };
    r.order.push(botId);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    startMatch(roomId);
    cb && cb({ok:true});
  });

  socket.on('playerConfirm', ({roomId, card}, cb)=>{
    const r = rooms[roomId]; if(!r) return cb && cb({error:'room not found'});
    // save confirm
    r.confirms[socket.id] = card;
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    // if both human players confirmed, resolve round
    const humanIds = Object.keys(r.players).filter(id=> !r.players[id].isBot);
    if(humanIds.length===2 && humanIds.every(id=> r.confirms[id])){
      // push plays into currentRoundPlays
      r.currentRoundPlays = [];
      for(const id of humanIds){ r.currentRoundPlays.push({playerId:id, card:r.confirms[id]}); const info = findCard(r.confirms[id]); if(info && info.element) r.players[id].runes[info.element] = (r.players[id].runes[info.element]||0)+1; }
      // clear confirms
      r.confirms = {};
      // advance turnIndex and resolve
      tryResolve(roomId);
      // after resolve, check end condition
      if(r.started===false){
        // expire room after short delay
        setTimeout(()=>{ delete rooms[roomId]; io.to(roomId).emit('roomUpdate', null); }, 2000);
      } else {
        io.to(roomId).emit('roomUpdate', summarize(roomId));
      }
    }
    cb && cb({ok:true});
  });

  socket.on('playCard', ({roomId, cardId}, cb)=>{
    // kept for compatibility, but primary flow uses confirm
    const r = rooms[roomId]; if(!r) return cb && cb({error:'room not found'});
    r.currentRoundPlays.push({playerId: socket.id, card: cardId});
    const info = findCard(cardId);
    if(info && info.element) r.players[socket.id].runes[info.element] = (r.players[socket.id].runes[info.element]||0)+1;
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    tryResolve(roomId);
    cb && cb({ok:true});
  });

  socket.on('disconnecting', ()=>{
    for(const roomId of Object.keys(socket.rooms)){
      const r = rooms[roomId]; if(!r) continue;
      delete r.players[socket.id];
      const idx = r.order.indexOf(socket.id); if(idx!==-1) r.order.splice(idx,1);
      io.to(roomId).emit('roomUpdate', summarize(roomId));
      // if both players left or match finished, delete room
      if(Object.keys(r.players).length===0) delete rooms[roomId];
    }
  });

  function tryResolve(roomId){
    const r = rooms[roomId]; if(!r) return;
    const active = r.order.filter(id=> r.players[id]);
    if(r.currentRoundPlays.length < active.length) return;
    // compute totals and elements
    const totals = {}; const elements = {};
    for(const p of r.currentRoundPlays){ const info = findCard(p.card); if(!info) continue; totals[p.playerId] = (totals[p.playerId]||0) + (info.attack||0); elements[p.playerId] = elements[p.playerId]||new Set(); if(info.element) elements[p.playerId].add(info.element); }
    // determine winner
    let winner = null; let best=-1; let tie=false;
    for(const id of active){ const v = totals[id]||0; if(v>best){ best=v; winner=id; tie=false } else if(v===best) tie=true }
    if(tie || winner===null){ r.table.push({system:'Round tied — no damage'}); r.currentRoundPlays=[]; io.to(roomId).emit('roomUpdate', summarize(roomId)); return; }
    const opponent = active.find(id=> id!==winner);
    if(!opponent){ r.currentRoundPlays=[]; io.to(roomId).emit('roomUpdate', summarize(roomId)); return; }
    const attackValue = totals[winner]||0;
    let runeBonus = 0; for(const el of elements[winner]||[]) runeBonus += (r.players[winner].runes[el]||0);
    const damage = attackValue + runeBonus;
    r.players[opponent].divineHP -= damage;
    r.table.push({system:`${r.players[winner].name} won the round and dealt ${damage} damage to ${r.players[opponent].name}`});
    // abilities trigger after damage: winner first (placeholder behavior: none implemented beyond messages)
    // check end of match
    if(r.players[opponent].divineHP <= 0){ r.table.push({system:`${r.players[winner].name} wins the match!`}); r.started=false; io.to(roomId).emit('roomUpdate', summarize(roomId)); return; }
    r.currentRoundPlays = [];
    io.to(roomId).emit('roomUpdate', summarize(roomId));
  }

  function startMatch(roomId){
    const r = rooms[roomId]; if(!r) return;
    r.started = true; r.table = []; r.currentRoundPlays = []; r.confirms = {};
    // deal hands and set runes from divines
    for(const id of r.order){
      const p = r.players[id];
      p.hand = [];
      p.runes = { fire:0, water:0, grass:0 };
      p.mulliganed = false;
      const deckKey = r.order.indexOf(id)===0 ? 'A':'B';
      for(let i=0;i<4;i++){ if(r.decks[deckKey].length===0) break; p.hand.push(r.decks[deckKey].pop()); }
      const dv = findCard(p.divine);
      if(dv && dv.element) p.runes[dv.element] = (p.runes[dv.element]||0)+1;
      p.divineHP = (dv && dv.hp) ? dv.hp : 30;
    }
    io.to(roomId).emit('roomUpdate', summarize(roomId));
  }

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server listening on', PORT));
