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

function newGameState(mode, deckA, deckB){ return { mode:mode||'pvp', players:{}, order:[], turnIndex:0, table:[], decks:{A:deckA?deckA.slice():[], B:deckB?deckB.slice():[]}, discards:{A:[],B:[]}, started:false, currentRoundPlays:[], confirms: {}, damageThisTurn: {} }; }

function summarize(roomId){ const r = rooms[roomId]; if(!r) return null; const players = Object.entries(r.players).map(([id,p])=>({ id, name:p.name, hand:p.hand, handSize:p.hand.length, divine:p.divine, divineHP:p.divineHP, runes:p.runes, isBot:p.isBot, transcended:p.transcended })); return { id: roomId, mode: r.mode, players, deckCounts: {A: r.decks.A.length, B: r.decks.B.length}, discardCounts: {A: r.discards.A.length, B: r.discards.B.length}, table: r.table, started: r.started, order: r.order, turnIndex: r.turnIndex, currentRoundPlays: r.currentRoundPlays, confirms: r.confirms }; }

io.on('connection', socket=>{
  console.log('conn', socket.id);

  socket.on('createRoomPrivate', ({roomId, deckCode}, cb)=>{
    if(!roomId) return cb && cb({error:'roomId required'});
    if(!deckCode) return cb && cb({error:'deckCode required to create room'});
    if(rooms[roomId]) return cb && cb({error:'room exists'});
    const arr = decodeDeck(deckCode); if(!arr) return cb && cb({error:'invalid deck code'});
    // create room and place player into slot A
    rooms[roomId] = newGameState('pvp', [], []);
    rooms[roomId].created = Date.now();
    // set deck A
    rooms[roomId].decks.A = shuffle(arr.slice());
    rooms[roomId].players[socket.id] = { id: socket.id, name:'Player', hand:[], divine: arr[0], runes:{fire:0,water:0,grass:0}, isBot:false, divineHP:(findCard(arr[0])||{}).hp||30, transcended:false, drawn:0 };
    rooms[roomId].order.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    cb && cb({ok:true});
  });

  socket.on('joinRoom', ({roomId, deckCode}, cb)=>{
    const r = rooms[roomId];
    if(!r) return cb && cb({error:'room not found'});
    if(!deckCode) return cb && cb({error:'deckCode required to join room'});
    if(Object.keys(r.players).length >= 2) return cb && cb({error:'room full'});
    const arr = decodeDeck(deckCode); if(!arr) return cb && cb({error:'invalid deck code'});
    // set deck B and add player
    rooms[roomId].decks.B = shuffle(arr.slice());
    rooms[roomId].players[socket.id] = { id: socket.id, name:'Player', hand:[], divine: arr[0], runes:{fire:0,water:0,grass:0}, isBot:false, divineHP:(findCard(arr[0])||{}).hp||30, transcended:false, drawn:0 };
    rooms[roomId].order.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    cb && cb({ok:true});
    // if both players present, start match
    if(Object.keys(r.players).length===2 && r.decks.A.length>0 && r.decks.B.length>0){
      startMatch(roomId);
    }
  });

  socket.on('createRoomWithDeck', ({roomId,name,deckCode,mode}, cb)=>{
    const arr = decodeDeck(deckCode); if(!arr) return cb && cb({error:'invalid deck code'});
    const deckA = shuffle(arr.slice());
    const botDivs = CARDS.divines.map(d=>d.id).filter(x=>x!==arr[0]); const botDiv = botDivs[Math.floor(Math.random()*botDivs.length)];
    const followers = CARDS.followers.map(f=>f.id); shuffle(followers); const deckB = [botDiv].concat(followers.slice(0,15));
    const r = newGameState('ai', deckA, deckB);
    rooms[roomId] = r;
    r.players[socket.id] = { id: socket.id, name: name||'Player', hand:[], ready:false, divine: arr[0], runes:{fire:0,water:0,grass:0}, isBot:false, divineHP:(findCard(arr[0])||{}).hp||30, transcended:false, drawn:0 };
    r.order.push(socket.id);
    const botId = 'BOT_'+Math.random().toString(36).slice(2,8);
    r.players[botId] = { id:botId, name:'Bot', hand:[], ready:true, divine: r.decks.B[0], runes:{fire:0,water:0,grass:0}, isBot:true, divineHP:(findCard(r.decks.B[0])||{}).hp||30, transcended:false, drawn:0 };
    r.order.push(botId);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    startMatch(roomId);
    cb && cb({ok:true});
  });

  socket.on('playerConfirm', ({roomId, card}, cb)=>{
    const r = rooms[roomId]; if(!r) return cb && cb({error:'room not found'});
    if(!r.players[socket.id]) return cb && cb({error:'not in room'});
    const p = r.players[socket.id];
    if(!p.hand.includes(card)) return cb && cb({error:'card not in hand'});
    r.confirms[socket.id] = card;
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    const humanIds = Object.keys(r.players).filter(id=> !r.players[id].isBot);
    if(humanIds.length===2 && humanIds.every(id=> r.confirms[id])){
      r.currentRoundPlays = [];
      for(const id of humanIds){
        r.currentRoundPlays.push({playerId:id, card:r.confirms[id]});
      }
      r.confirms = {};
      for(const play of r.currentRoundPlays){
        const player = r.players[play.playerId];
        const idx = player.hand.indexOf(play.card);
        if(idx!==-1) player.hand.splice(idx,1);
      }
      const totals = {}; const elements = {};
      for(const pplay of r.currentRoundPlays){ const info = findCard(pplay.card); if(!info) continue; totals[pplay.playerId] = (totals[pplay.playerId]||0) + (info.attack||0); elements[pplay.playerId] = elements[pplay.playerId]||new Set(); if(info.element) elements[pplay.playerId].add(info.element); r.players[pplay.playerId].runes[info.element] = (r.players[pplay.playerId].runes[info.element]||0) + 1; r.damageThisTurn[pplay.playerId] = (r.damageThisTurn[pplay.playerId]||0) + (info.attack||0); }
      let winner=null; let best=-1; let tie=false;
      const active = r.currentRoundPlays.map(x=>x.playerId);
      for(const id of active){ const v = totals[id]||0; if(v>best){ best=v; winner=id; tie=false } else if(v===best) tie=true }
      if(tie || winner===null){
        r.table.push({system:'Round tied — no damage'});
        movePlayedToDiscardsAndDraw(r);
        r.currentRoundPlays = [];
        io.to(roomId).emit('roomUpdate', summarize(roomId));
      } else {
        const opponent = active.find(id=> id!==winner);
        const attackValue = totals[winner]||0;
        let runeBonus = 0; for(const el of elements[winner]||[]) runeBonus += (r.players[winner].runes[el]||0);
        const winnerDiv = findCard(r.players[winner].divine);
        let damage = attackValue + runeBonus;
        if(winnerDiv && winnerDiv.id === 'D1' && r.players[winner].transcended && r.players[winner].transcended_effect && r.players[winner].transcended_effect.type === 'double_damage'){
          damage = damage * 2;
        }
        r.players[opponent].divineHP -= damage;
        r.table.push({system:`${r.players[winner].name} won the round and dealt ${damage} damage to ${r.players[opponent].name}`});
        // winner abilities
        for(const play of r.currentRoundPlays.filter(p=>p.playerId===winner)){
          const info = findCard(play.card);
          if(info && info.abilities){
            for(const ab of info.abilities){
              const cost = ab.runeCost || 0;
              let ok = true;
              if(cost>0){
                const el = info.element;
                if((r.players[winner].runes[el]||0) < cost) ok = false;
                else r.players[winner].runes[el] -= cost;
              }
              if(!ok){
                r.table.push({system:`${r.players[winner].name} attempted ability ${ab.type} but lacked runes`});
                continue;
              }
              applyAbility(r, winner, opponent, ab, true);
            }
          }
        }
        // loser abilities
        for(const play of r.currentRoundPlays.filter(p=>p.playerId===opponent)){
          const info = findCard(play.card);
          if(info && info.abilities){
            for(const ab of info.abilities){
              const cost = ab.runeCost || 0;
              let ok = true;
              if(cost>0){
                const el = info.element;
                if((r.players[opponent].runes[el]||0) < cost) ok = false;
                else r.players[opponent].runes[el] -= cost;
              }
              if(!ok){
                r.table.push({system:`${r.players[opponent].name} attempted ability ${ab.type} but lacked runes`});
                continue;
              }
              applyAbility(r, opponent, winner, ab, false);
            }
          }
        }
        checkTranscend(r, winner);
        checkTranscend(r, opponent);
        movePlayedToDiscardsAndDraw(r);
        r.currentRoundPlays = [];
        if(r.players[opponent].divineHP <= 0){
          r.table.push({system:`${r.players[winner].name} wins the match!`});
          r.started = false;
          io.to(roomId).emit('roomUpdate', summarize(roomId));
          setTimeout(()=>{ delete rooms[roomId]; io.to(roomId).emit('roomUpdate', null); }, 3000);
          return;
        }
        io.to(roomId).emit('roomUpdate', summarize(roomId));
      }
    }
    cb && cb({ok:true});
  });

  socket.on('disconnecting', ()=>{
    for(const roomId of Object.keys(socket.rooms)){
      const r = rooms[roomId]; if(!r) continue;
      delete r.players[socket.id];
      const idx = r.order.indexOf(socket.id); if(idx!==-1) r.order.splice(idx,1);
      io.to(roomId).emit('roomUpdate', summarize(roomId));
      if(Object.keys(r.players).length===0) delete rooms[roomId];
    }
  });

  function applyAbility(r, actorId, targetId, ab, isWinnerAbility){
    const actor = r.players[actorId];
    const target = r.players[targetId];
    if(ab.type === 'draw'){
      const deckKey = r.order.indexOf(actorId)===0 ? 'A':'B';
      drawToPlayer(r, actorId, ab.value || 1);
      r.table.push({system:`${actor.name} drew ${ab.value||1} card(s) from ability`});
    } else if(ab.type === 'damage'){
      const dmg = ab.value || 1;
      target.divineHP -= dmg;
      r.table.push({system:`${actor.name} dealt ${dmg} damage to ${target.name} via ability`});
    } else if(ab.type === 'discard'){
      const amt = ab.value || 1;
      for(let i=0;i<amt;i++){
        if(target.hand.length===0) break;
        const ri = Math.floor(Math.random()*target.hand.length);
        const removed = target.hand.splice(ri,1)[0];
        const key = r.order.indexOf(targetId)===0 ? 'A':'B';
        r.discards[key].push(removed);
        r.table.push({system:`${actor.name} forced ${target.name} to discard ${removed}`});
        // if target's divine transcended double_discard, activate additional effect
        const tdiv = findCard(r.players[targetId].divine);
        if(tdiv && r.players[targetId].transcended && r.players[targetId].transcended_effect && r.players[targetId].transcended_effect.type === 'double_discard'){
          // repeat discard effect once
          if(target.hand.length>0){
            const ri2 = Math.floor(Math.random()*target.hand.length);
            const removed2 = target.hand.splice(ri2,1)[0];
            r.discards[key].push(removed2);
            r.table.push({system:`${actor.name}'s discard triggered twice: ${target.name} discarded ${removed2}`});
          }
        }
      }
    }
  }

  function drawToPlayer(r, playerId, count){
    const idx = r.order.indexOf(playerId);
    const key = idx===0 ? 'A':'B';
    for(let i=0;i<count;i++){
      if(r.decks[key].length===0){
        if(r.discards[key].length>0){
          r.decks[key] = shuffle(r.discards[key].splice(0));
        }
      }
      if(r.decks[key].length===0) break;
      const c = r.decks[key].pop();
      r.players[playerId].hand.push(c);
      r.players[playerId].drawn = (r.players[playerId].drawn||0) + 1;
    }
  }

  function movePlayedToDiscardsAndDraw(r){
    for(const play of r.currentRoundPlays){
      const pid = play.playerId;
      const idx = r.order.indexOf(pid);
      const key = idx===0 ? 'A':'B';
      r.discards[key].push(play.card);
    }
    for(const pid of Object.keys(r.players)){
      drawToPlayer(r, pid, 1);
    }
    r.damageThisTurn = {};
  }

  function checkTranscend(r, playerId){
    const p = r.players[playerId];
    if(!p) return;
    if(p.transcended) return;
    const dv = findCard(p.divine);
    if(!dv) return;
    const cond = dv.transcend;
    if(cond.startsWith('runes>=')){
      const num = parseInt(cond.split('>=')[1],10);
      const total = (p.runes.fire||0)+(p.runes.water||0)+(p.runes.grass||0);
      if(total >= num){
        p.transcended = true;
        p.transcended_effect = dv.transcendEffect;
        r.table.push({system:`${p.name}'s Divine ${dv.name} has transcended!`});
      }
    } else if(cond.startsWith('damageInTurn>=')){
      const num = parseInt(cond.split('>=')[1],10);
      const dmg = r.damageThisTurn[playerId] || 0;
      if(dmg >= num){
        p.transcended = true;
        p.transcended_effect = dv.transcendEffect;
        r.table.push({system:`${p.name}'s Divine ${dv.name} has transcended!`});
      }
    } else if(cond.startsWith('drawn>=')){
      const num = parseInt(cond.split('>=')[1],10);
      if((p.drawn||0) >= num){
        p.transcended = true;
        p.transcended_effect = dv.transcendEffect;
        r.table.push({system:`${p.name}'s Divine ${dv.name} has transcended!`});
        if(dv.transcendEffect && dv.transcendEffect.type === 'set_rune_to_6'){
          const keys = ['fire','water','grass'];
          let best='fire'; let bestv = p.runes.fire||0;
          for(const k of keys){ if((p.runes[k]||0) > bestv){ best = k; bestv = p.runes[k]||0 } }
          p.runes[best] = 6;
          r.table.push({system:`${p.name}'s Divine sets ${best} rune to 6 permanently.`});
        }
      }
    }
  }

  function startMatch(roomId){
    const r = rooms[roomId]; if(!r) return;
    r.started = true; r.table = []; r.currentRoundPlays = []; r.confirms = {}; r.discards = {A:[],B:[]}; r.damageThisTurn = {};
    for(const id of r.order){
      const p = r.players[id];
      p.hand = [];
      p.runes = { fire:0, water:0, grass:0 };
      p.mulliganed = false;
      p.transcended = false;
      p.transcended_effect = null;
      p.drawn = 0;
      const deckKey = r.order.indexOf(id)===0 ? 'A':'B';
      for(let i=0;i<4;i++){ if(r.decks[deckKey].length===0) break; p.hand.push(r.decks[deckKey].pop()); p.drawn++; }
      const dv = findCard(p.divine);
      if(dv && dv.element) p.runes[dv.element] = (p.runes[dv.element]||0)+1;
      p.divineHP = (dv && dv.hp) ? dv.hp : 30;
    }
    io.to(roomId).emit('roomUpdate', summarize(roomId));
  }

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server listening on', PORT));
