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
app.use(express.static(path.join(__dirname, 'dist')));

let CARDS = { divines: [], followers: [] };
try{ CARDS = JSON.parse(fs.readFileSync(path.join(__dirname,'src','data','cards.js')).toString().replace(/^\s*export default\s*/,'').trim()); }catch(e){ console.warn('cards not loaded',e.message); }

function findCard(id){ return (CARDS.divines.find(d=>d.id===id) || CARDS.followers.find(f=>f.id===id)); }
function encodeDeck(arr){ return Buffer.from(JSON.stringify(arr)).toString('base64').replace(/=/g,''); }
function decodeDeck(code){ try{ let pad = code.length%4; if(pad) code += '='.repeat(4-pad); return JSON.parse(Buffer.from(code,'base64').toString('utf8')); }catch(e){return null;} }

const rooms = {};
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }

function newGameState(mode, deckA, deckB){
  return { mode:mode||'pvp', players:{}, order:[], turnIndex:0, table:[], decks:{A:deckA?deckA.slice():[], B:deckB?deckB.slice():[]}, started:false, currentRoundPlays:[] };
}

function summarize(roomId){
  const r = rooms[roomId]; if(!r) return null;
  const players = Object.entries(r.players).map(([id,p])=>({ id, name:p.name, hand:p.hand, handSize:p.hand.length, divine:p.divine, divineHP:p.divineHP, runes:p.runes, isBot:p.isBot }));
  return { id: roomId, mode: r.mode, players, deckCounts: {A: r.decks.A.length, B: r.decks.B.length}, table: r.table, started: r.started, order: r.order, turnIndex: r.turnIndex, currentRoundPlays: r.currentRoundPlays };
}

function tryResolve(roomId){
  const r = rooms[roomId]; if(!r) return;
  const active = r.order.filter(id=> r.players[id]);
  const playedIds = new Set(r.currentRoundPlays.map(p=>p.playerId));
  if(!active.every(id=> playedIds.has(id))) return;
  const totals = {}; const elements = {};
  for(const p of r.currentRoundPlays){ const info = findCard(p.card); if(!info) continue; totals[p.playerId] = (totals[p.playerId]||0) + (info.attack||0); elements[p.playerId] = elements[p.playerId]||new Set(); if(info.element) elements[p.playerId].add(info.element); }
  let winner=null, best=-1, tie=false;
  for(const id of active){ const v = totals[id]||0; if(v>best){ best=v; winner=id; tie=false } else if(v===best) tie=true }
  if(tie||winner===null){ r.table.push({system:'Round tied — no damage'}); r.currentRoundPlays=[]; io.to(roomId).emit('roomUpdate', summarize(roomId)); return; }
  const opponent = active.find(id=> id!==winner);
  if(!opponent){ r.currentRoundPlays=[]; io.to(roomId).emit('roomUpdate', summarize(roomId)); return; }
  const attackValue = totals[winner]||0;
  let runeBonus = 0; for(const el of elements[winner]||[]) runeBonus += (r.players[winner].runes[el]||0);
  const damage = attackValue + runeBonus;
  r.players[opponent].divineHP -= damage;
  r.table.push({system:`${r.players[winner].name} won the round and dealt ${damage} damage to ${r.players[opponent].name}`});
  r.currentRoundPlays = [];
  if(r.players[opponent].divineHP <= 0){ r.table.push({system:`${r.players[winner].name} wins the match!`}); r.started=false; }
  io.to(roomId).emit('roomUpdate', summarize(roomId));
}

io.on('connection', socket=>{
  console.log('conn', socket.id);
  socket.on('generateDeckCode', ({divineId, followers}, cb)=>{ if(!divineId||!followers||followers.length!==15) return cb({error:'Deck must include 1 divine and 15 followers'}); const code = encodeDeck([divineId].concat(followers)); cb({ok:true, code}); });

  socket.on('createRoomWithDeck', ({roomId,name,deckCode,mode}, cb)=>{
    if(!roomId) return cb({error:'roomId required'}); if(rooms[roomId]) return cb({error:'room exists'});
    const arr = decodeDeck(deckCode); if(!arr) return cb({error:'invalid deck code'});
    const deckA = shuffle(arr.slice()); let deckB=[];
    if(mode==='ai'){ const divs = CARDS.divines.map(d=>d.id).filter(x=>x!==arr[0]); const botDiv = divs[Math.floor(Math.random()*divs.length)]; const followers = CARDS.followers.map(f=>f.id); shuffle(followers); deckB = [botDiv].concat(followers.slice(0,15)); }
    rooms[roomId] = newGameState(mode, deckA, deckB);
    const p = { id: socket.id, name: name||'Player', hand:[], ready:false, divine: arr[0], runes:{}, isBot:false, divineHP: (findCard(arr[0])||{}).hp || 30 };
    rooms[roomId].players[socket.id] = p; rooms[roomId].order.push(socket.id); socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId)); cb({ok:true});
    if(mode==='ai'){
      const botId = 'BOT_'+Math.random().toString(36).slice(2,8);
      rooms[roomId].players[botId] = { id:botId, name:'Bot', hand:[], ready:true, divine: rooms[roomId].decks.B[0], runes:{}, isBot:true, divineHP:(findCard(rooms[roomId].decks.B[0])||{}).hp||30 };
      rooms[roomId].order.push(botId);
      // start match immediately
      startMatch(roomId);
    }
  });

  socket.on('drawFromDeck', ({roomId}, cb)=>{ const r=rooms[roomId]; if(!r) return cb({error:'no room'}); const p = r.players[socket.id]; if(!p) return cb({error:'not in room'}); const ownerIndex = r.order.indexOf(socket.id); const deckKey = ownerIndex===0 ? 'A':'B'; if(r.decks[deckKey].length===0) return cb({error:'deck empty'}); const c = r.decks[deckKey].pop(); p.hand.push(c); io.to(roomId).emit('roomUpdate', summarize(roomId)); cb({ok:true, card:c}); });

  socket.on('playCard', ({roomId, cardId}, cb)=>{ const r=rooms[roomId]; if(!r) return cb({error:'no room'}); const p=r.players[socket.id]; if(!p) return cb({error:'not in room'}); const idx = p.hand.indexOf(cardId); if(idx===-1) return cb({error:'Card not in hand'}); p.hand.splice(idx,1); r.table.push({playerId: socket.id, card: cardId}); r.currentRoundPlays.push({playerId: socket.id, card: cardId}); const info = findCard(cardId); if(info && info.element) p.runes[info.element] = (p.runes[info.element]||0)+1; r.turnIndex = (r.turnIndex + 1) % r.order.length; io.to(roomId).emit('roomUpdate', summarize(roomId)); tryResolve(roomId); const nextId = r.order[r.turnIndex]; if(r.players[nextId] && r.players[nextId].isBot) setTimeout(()=>botPlay(roomId), 600 + Math.random()*800); cb({ok:true}); });

  socket.on('mulligan', ({roomId}, cb)=>{ const r=rooms[roomId]; if(!r) return cb({error:'no room'}); const p=r.players[socket.id]; if(!p) return cb({error:'not in room'}); if(p.mulliganed) return cb({error:'Already mulliganed'}); const ownerIndex = r.order.indexOf(socket.id); const deckKey = ownerIndex===0 ? 'A':'B'; r.decks[deckKey] = r.decks[deckKey].concat(p.hand); p.hand = []; for(let i=0;i<4;i++){ if(r.decks[deckKey].length===0) break; p.hand.push(r.decks[deckKey].pop()); } p.mulliganed = true; io.to(roomId).emit('roomUpdate', summarize(roomId)); cb({ok:true}); });

  socket.on('activateAbility', ({roomId, cardId}, cb)=>{ const r=rooms[roomId]; if(!r) return cb({error:'no room'}); const p=r.players[socket.id]; if(!p) return cb({error:'not in room'}); const played = r.currentRoundPlays.find(x=>x.playerId===socket.id && x.card===cardId); if(!played) return cb({error:'Card not playable'}); const info = findCard(cardId); if(!info||!info.ability) return cb({error:'No ability'}); const ability = info.ability; const cost = ability.cost || {}; for(const k of Object.keys(cost)){ if((p.runes[k]||0) < cost[k]) return cb({error:'Insufficient runes'}); } for(const k of Object.keys(cost)){ p.runes[k] -= cost[k]; } if(ability.type==='draw'){ const ownerIndex = r.order.indexOf(socket.id); const deckKey = ownerIndex===0 ? 'A':'B'; for(let i=0;i<ability.amount;i++){ if(r.decks[deckKey].length===0) break; p.hand.push(r.decks[deckKey].pop()); } r.table.push({system:`${p.name} activated ability: draw ${ability.amount}`}); } else if(ability.type==='damage'){ const opp = r.order.find(id=>id!==socket.id && r.players[id]); if(opp){ r.players[opp].divineHP -= ability.amount; r.table.push({system:`${p.name} activated ability: dealt ${ability.amount} damage to ${r.players[opp].name}`}); if(r.players[opp].divineHP<=0){ r.table.push({system:`${p.name} wins the match!`}); r.started=false; } } } else if(ability.type==='discard'){ const opp = r.order.find(id=>id!==socket.id && r.players[id]); if(opp){ for(let i=0;i<ability.amount;i++){ if(r.players[opp].hand.length===0) break; const ri = Math.floor(Math.random()*r.players[opp].hand.length); r.players[opp].hand.splice(ri,1); } r.table.push({system:`${p.name} activated ability: forced opponent to discard ${ability.amount}`}); } } io.to(roomId).emit('roomUpdate', summarize(roomId)); cb({ok:true}); });

  socket.on('disconnecting', ()=>{ for(const roomId of Object.keys(socket.rooms)){ const r=rooms[roomId]; if(!r) continue; delete r.players[socket.id]; const idx=r.order.indexOf(socket.id); if(idx!==-1) r.order.splice(idx,1); io.to(roomId).emit('roomUpdate', summarize(roomId)); if(Object.keys(r.players).length===0) delete rooms[roomId]; } });

  function startMatch(roomId){ const r=rooms[roomId]; if(!r) return; r.started=true; r.table=[]; r.turnIndex=0; r.currentRoundPlays=[]; for(const id of r.order){ const p=r.players[id]; p.hand=[]; p.runes={ fire:0, water:0, grass:0 }; p.mulliganed=false; const deckKey = r.order.indexOf(id)===0 ? 'A':'B'; for(let i=0;i<4;i++){ if(r.decks[deckKey].length===0) break; p.hand.push(r.decks[deckKey].pop()); } const dv = findCard(p.divine); if(dv && dv.element) p.runes[dv.element] = (p.runes[dv.element]||0)+1; p.divineHP = (dv && dv.hp) ? dv.hp : 30; } io.to(roomId).emit('roomUpdate', summarize(roomId)); }

  // botPlay
  function botPlay(roomId){ const r=rooms[roomId]; if(!r) return; const botId = Object.keys(r.players).find(id=> r.players[id].isBot); if(!botId) return; const bot = r.players[botId]; if(bot.hand.length>0){ const idx = Math.floor(Math.random()*bot.hand.length); const card = bot.hand.splice(idx,1)[0]; r.table.push({playerId: botId, card}); r.currentRoundPlays.push({playerId: botId, card}); const info = findCard(card); if(info && info.element) bot.runes[info.element] = (bot.runes[info.element]||0)+1; r.turnIndex = (r.turnIndex + 1) % r.order.length; io.to(roomId).emit('roomUpdate', summarize(roomId)); tryResolve(roomId); } else { const deckKey = r.order.indexOf(botId)===0 ? 'A':'B'; if(r.decks[deckKey].length>0){ const c = r.decks[deckKey].pop(); bot.hand.push(c); io.to(roomId).emit('roomUpdate', summarize(roomId)); } } }

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server listening on', PORT));
