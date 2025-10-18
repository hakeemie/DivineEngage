import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use('/cards', express.static(path.join(__dirname, 'public', 'cards')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use(express.static(path.join(__dirname, 'dist')));

let CARDS = { divines: [], followers: [] };
try{ const txt = fs.readFileSync(path.join(__dirname,'src','data','cards.js'),'utf8'); CARDS = JSON.parse(txt.replace(/^\s*export default\s*/,'')); }catch(e){ console.warn('cards load failed', e.message); }

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }

function findCard(id) {
  if (!id) return null;
  const lowerId = id.toString().toLowerCase();

  // Defensive: ensure followers exists, even if missing
  const followers = CARDS.followers || {};
  const allFollowerGroups = Object.values(followers).flat();

  // Combine divines + all followers into one searchable list
  const allCards = [
    ...(CARDS.divines || []),
    ...allFollowerGroups
  ];

  // Perform case-insensitive lookup
  return allCards.find(c => c.id.toLowerCase() === lowerId) || null;
}


function decodeDeck(code){ try{ let pad = code.length % 4; if(pad) code += '='.repeat(4-pad); return JSON.parse(Buffer.from(code,'base64').toString('utf8')); }catch(e){ return null; } }

const rooms = {};

function newRoom(){ return { players:{}, order:[], decks:{}, discards:{}, started:false, table:[], confirms:{}, engage:{}, pending:{}, damageThisTurn:{}, matchOutcome:null }; }

io.on('connection', socket=>{
  console.log('conn', socket.id);

  socket.on('createRoom', ({roomId, deck, divine})=>{
    if(!roomId || !deck || !divine) return socket.emit('errorMsg','missing parameters');
    if(rooms[roomId]) return socket.emit('errorMsg','room exists');
    const r = newRoom();
    r.decks[socket.id] = shuffle(deck.slice());
    r.discards[socket.id] = [];
    r.players[socket.id] = { id: socket.id, name:'Player', hand:[], engage:null, divine, divineHP:(findCard(divine)||{}).hp||30, runes:{fire:0,water:0,grass:0}, transcended:false, drawn:0, isBot:false };
    r.order.push(socket.id);
    rooms[roomId] = r;
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    socket.emit('roomCreated', { roomId });
  });

  socket.on('joinRoom', ({roomId, deck, divine})=>{
    const r = rooms[roomId]; if(!r) return socket.emit('errorMsg','room not found');
    if(Object.keys(r.players).length >= 2) return socket.emit('errorMsg','room full');
    r.decks[socket.id] = shuffle(deck.slice());
    r.discards[socket.id] = [];
    r.players[socket.id] = { id: socket.id, name:'Player', hand:[], engage:null, divine, divineHP:(findCard(divine)||{}).hp||30, runes:{fire:0,water:0,grass:0}, transcended:false, drawn:0, isBot:false };
    r.order.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    if(Object.keys(r.players).length === 2) startMatch(roomId);
  });

  socket.on('createRoomWithDeck', ({roomId, name, deckCode})=>{
    const arr = decodeDeck(deckCode); if(!arr) return socket.emit('errorMsg','invalid deck code');
    const divine = arr[0]; const followers = arr.slice(1);
    const r = newRoom();
    r.decks[socket.id] = shuffle(followers.slice());
    const pool = CARDS.followers.map(f=>f.id).filter(x=> !r.decks[socket.id].includes(x));
    shuffle(pool);
    const botId = 'BOT_'+Math.random().toString(36).slice(2,8);
    r.decks[botId] = pool.slice(0,15);
    r.discards[socket.id] = []; r.discards[botId] = [];
    r.players[socket.id] = { id: socket.id, name:name||'Player', hand:[], engage:null, divine, divineHP:(findCard(divine)||{}).hp||30, runes:{fire:0,water:0,grass:0}, transcended:false, drawn:0, isBot:false };
    r.players[botId] = { id: botId, name:'Bot', hand:[], engage:null, divine: CARDS.divines[1].id, divineHP:(findCard(CARDS.divines[1].id)||{}).hp||30, runes:{fire:0,water:0,grass:0}, transcended:false, drawn:0, isBot:true };
    r.order.push(socket.id); r.order.push(botId);
    rooms[roomId] = r;
    socket.join(roomId);
    startMatch(roomId);
    io.to(roomId).emit('roomUpdate', summarize(roomId));
  });

socket.on("playerConfirm", ({ roomId, card }, cb) => {
  const r = rooms[roomId];
  if (!r) return cb && cb({ error: "room not found" });
  const player = r.players[socket.id];
  if (!player) return cb && cb({ error: "not in room" });

  // validate card
  if (!player.hand.includes(card))
    return cb && cb({ error: `card "${card}" not in hand` });

  // remove from hand & set pending
  player.hand = player.hand.filter((c) => c !== card);
  r.pending[socket.id] = card;

  io.to(roomId).emit("roomUpdate", summarize(roomId));

  // check if all human players have confirmed
  const playerIds = Object.keys(r.players).filter((id) => !r.players[id].isBot);
  const allPending =
    playerIds.length === Object.keys(r.pending).length &&
    playerIds.every((id) => r.pending[id]);

  if (allPending) {
    console.log(`🃏 All players confirmed in ${roomId}, engaging...`);
    r.engage = { ...r.pending };
    r.pending = {};
    io.to(roomId).emit("roomUpdate", summarize(roomId));

    setTimeout(() => {
      try {
        resolveEngage(roomId);
      } catch (err) {
        console.error("❌ Error in resolveEngage:", err);
        if (rooms[roomId]) {
          rooms[roomId].table.push({
            system: `❌ An error occurred resolving the round: ${err.message}`,
          });
          io.to(roomId).emit("roomUpdate", summarize(roomId));
        }
      }
    }, 5000);
  }

  cb && cb({ ok: true });
});

  socket.on('disconnecting', ()=>{
    for(const roomId of Object.keys(socket.rooms)){
      const r = rooms[roomId]; if(!r) continue;
      if(r.players[socket.id]){ delete r.players[socket.id]; const idx = r.order.indexOf(socket.id); if(idx!==-1) r.order.splice(idx,1); io.to(roomId).emit('roomUpdate', summarize(roomId)); }
      if(Object.keys(r.players).length === 0) delete rooms[roomId];
    }
  });

  function summarize(roomId){ const r = rooms[roomId]; if(!r) return null; const players = Object.entries(r.players).map(([id,p])=>({ id, name:p.name, hand:p.hand, engage: r.engage[id]||null, pending: r.pending[id]||null, divine: p.divine, divineHP: p.divineHP, runes: p.runes, transcended: p.transcended })); return { id: roomId, players, deckCounts: Object.fromEntries(Object.keys(r.decks).map(k=>[k, r.decks[k].length])), discardCounts: Object.fromEntries(Object.keys(r.discards).map(k=>[k, r.discards[k].length])), table: r.table, matchOutcome: r.matchOutcome }; }

  function startMatch(roomId){
    const r = rooms[roomId]; if(!r) return;
    r.started = true; r.table = []; r.engage = {}; r.pending = {}; r.confirms = {}; r.damageThisTurn = {}; r.matchOutcome = null;
    for(const pid of Object.keys(r.players)){
      const p = r.players[pid]; p.hand = []; p.engage = null; p.runes = {fire:0,water:0,grass:0}; p.transcended = false; p.drawn = 0;
      for(let i=0;i<4;i++){ const c = drawCard(r, pid); if(c){ p.hand.push(c); p.drawn++; } }
      const dv = findCard(p.divine); if(dv && dv.element) p.runes[dv.element] = (p.runes[dv.element]||0)+1; p.divineHP = (dv && dv.hp) ? dv.hp : 30;
    }
    io.to(roomId).emit('roomUpdate', summarize(roomId));
  }

  function drawCard(r, pid){
    if(!r.decks[pid]) return null;
    if(r.decks[pid].length === 0){
      if(r.discards[pid] && r.discards[pid].length > 0){ r.decks[pid] = shuffle(r.discards[pid].splice(0)); } else return null;
    }
    return r.decks[pid].pop();
  }

function resolveEngage(roomId) {
  const r = rooms[roomId];
  if (!r) return;

  const engages = Object.entries(r.engage).map(([id, card]) => ({ id, card }));
  if (engages.length < 2) return;

  const totals = {};
  const elements = {};

  for (const e of engages) {
    const info = findCard(e.card);
    if (!info) {
      console.warn(`Missing card data for ${e.card}`);
      r.table.push({ system: `⚠️ Could not resolve card "${e.card}" — missing from data.` });
      continue;
    }

    const atk = info.attack || 0;
    const elem = info.element || "neutral";

    totals[e.id] = (totals[e.id] || 0) + atk;

    if (!elements[e.id]) elements[e.id] = new Set();
    elements[e.id].add(elem);

    const player = r.players.find((p) => p.id === e.id);
    if (player) {
      player.runes[elem] = (player.runes[elem] || 0) + 1;
      r.damageThisTurn[e.id] = (r.damageThisTurn[e.id] || 0) + atk;
    }
  }

  // Determine winner
  let winner = null;
  let best = -1;
  let tie = false;
  for (const id of Object.keys(totals)) {
    const v = totals[id] || 0;
    if (v > best) {
      best = v;
      winner = id;
      tie = false;
    } else if (v === best) tie = true;
  }

  if (tie || winner === null) {
    r.table.push({ system: "Round tied — no damage" });
    finalizeEngageAndDraw(r);
    io.emit("roomUpdate", summarize(roomId));
    return;
  }

  const opponent = Object.keys(r.players).find((id) => id !== winner);
  let attackValue = totals[winner] || 0;
  let runeBonus = 0;

  const winnerPlayer = r.players.find((p) => p.id === winner);
  for (const el of elements[winner] || []) {
    if (winnerPlayer) runeBonus += (winnerPlayer.runes[el] || 0);
  }

  let damage = attackValue + runeBonus;

  const winnerDiv = winnerPlayer ? findCard(winnerPlayer.divine) : null;
  if (
    winnerDiv &&
    winnerDiv.id === "D_FIRE" &&
    winnerPlayer.transcended &&
    winnerPlayer.transcended_effect &&
    winnerPlayer.transcended_effect.type === "double_damage"
  ) {
    damage *= 2;
  }

  const opponentPlayer = r.players.find((p) => p.id === opponent);
  if (opponentPlayer) opponentPlayer.divineHP -= damage;

  r.table.push({
    system: `${winnerPlayer?.name || "Unknown"} won the clash and dealt ${damage} damage to ${
      opponentPlayer?.name || "opponent"
    }`,
  });

  // --- Abilities phase ---
  for (const e of engages.filter((x) => x.id === winner)) {
    const info = findCard(e.card);
    if (!info) continue;
    if (info.abilities) {
      for (const ab of info.abilities) applyAbility(r, winner, opponent, ab);
    }
  }

  for (const e of engages.filter((x) => x.id === opponent)) {
    const info = findCard(e.card);
    if (!info) continue;
    if (info.abilities) {
      for (const ab of info.abilities) applyAbility(r, opponent, winner, ab);
    }
  }

  // --- Transcendence checks ---
  checkTranscend(r, winner);
  checkTranscend(r, opponent);

  // --- Finalize & draw ---
  finalizeEngageAndDraw(r);

  // --- Victory check ---
  if (opponentPlayer?.divineHP <= 0 || winnerPlayer?.divineHP <= 0) {
    const winId =
      opponentPlayer?.divineHP <= 0
        ? winner
        : winnerPlayer?.divineHP <= 0
        ? opponent
        : winner;
    const loseId = winId === winner ? opponent : winner;
    r.matchOutcome = { winner: winId, loser: loseId };
    r.table.push({ system: `Match ended. Winner: ${r.players.find(p => p.id === winId)?.name || 'Unknown'}` });
    io.to(roomId).emit("roomUpdate", summarize(roomId));
    setTimeout(() => {
      delete rooms[roomId];
    }, 5000);
    return;
  }

  io.to(roomId).emit("roomUpdate", summarize(roomId));
}


// -----------------------------
// Helper Functions
// -----------------------------

function finalizeEngageAndDraw(r) {
  // handle discards
  for (const [id, p] of Object.entries(r.players)) {
    if (r.engage[id]) {
      if (!r.discards[id]) r.discards[id] = [];
      r.discards[id].push(r.engage[id]);
      delete r.engage[id];
    }
  }

  // handle draws (supports both array or object)
  const players = Array.isArray(r.players) ? r.players : Object.values(r.players);
  for (const player of players) {
    const c = drawCard(r, player.id);
    if (c) {
      player.hand.push(c);
      player.drawn = (player.drawn || 0) + 1;
    }
  }

  // reset turn damage
  r.damageThisTurn = {};
}




function applyAbility(r, actorId, targetId, ab) {
  const actor = r.players.find(p => p.id === actorId);
  const target = r.players.find(p => p.id === targetId);
  if (!actor || !target) return;

  if (ab.type === "draw") {
    for (let i = 0; i < (ab.value || 1); i++) {
      const c = drawCard(r, actorId);
      if (c) {
        actor.hand.push(c);
        actor.drawn = (actor.drawn || 0) + 1;
      }
    }
    r.table.push({ system: `${actor.name} drew ${ab.value || 1} card(s) via ability` });
  } else if (ab.type === "damage") {
    const dmg = ab.value || 1;
    target.divineHP -= dmg;
    r.table.push({ system: `${actor.name} dealt ${dmg} damage to ${target.name} via ability` });
  } else if (ab.type === "discard") {
    for (let i = 0; i < (ab.value || 1); i++) {
      if (target.hand.length === 0) break;
      const ri = Math.floor(Math.random() * target.hand.length);
      const removed = target.hand.splice(ri, 1)[0];
      if (!r.discards[target.id]) r.discards[target.id] = [];
      r.discards[target.id].push(removed);
      r.table.push({ system: `${actor.name} forced ${target.name} to discard ${removed}` });

      const tdiv = findCard(target.divine);
      if (
        tdiv &&
        target.transcended &&
        target.transcended_effect &&
        target.transcended_effect.type === "double_discard"
      ) {
        if (target.hand.length > 0) {
          const ri2 = Math.floor(Math.random() * target.hand.length);
          const removed2 = target.hand.splice(ri2, 1)[0];
          r.discards[target.id].push(removed2);
          r.table.push({ system: `Discard triggered twice: ${target.name} discarded ${removed2}` });
        }
      }
    }
  }
}


function checkTranscend(r, playerId) {
  const p = r.players.find(pl => pl.id === playerId);
  if (!p || p.transcended) return;

  const dv = findCard(p.divine);
  if (!dv) return;

  const cond = dv.transcend || "";

  if (cond.startsWith("runes>=")) {
    const num = parseInt(cond.split(">=")[1], 10);
    const total = (p.runes.fire || 0) + (p.runes.water || 0) + (p.runes.grass || 0);
    if (total >= num) {
      p.transcended = true;
      p.transcended_effect = dv.transcendEffect;
      r.table.push({ system: `${p.name}'s Divine ${dv.name} has transcended!` });
    }
  } else if (cond.startsWith("damageInTurn>=")) {
    const num = parseInt(cond.split(">=")[1], 10);
    const dmg = (r.damageThisTurn && r.damageThisTurn[playerId]) || 0;
    if (dmg >= num) {
      p.transcended = true;
      p.transcended_effect = dv.transcendEffect;
      r.table.push({ system: `${p.name}'s Divine ${dv.name} has transcended!` });
    }
  } else if (cond.startsWith("drawn>=")) {
    const num = parseInt(cond.split(">=")[1], 10);
    if ((p.drawn || 0) >= num) {
      p.transcended = true;
      p.transcended_effect = dv.transcendEffect;
      r.table.push({ system: `${p.name}'s Divine ${dv.name} has transcended!` });

      if (dv.transcendEffect && dv.transcendEffect.type === "set_rune_to_6") {
        const keys = ["fire", "water", "grass"];
        let best = "fire";
        let bestv = p.runes.fire || 0;
        for (const k of keys) {
          if ((p.runes[k] || 0) > bestv) {
            best = k;
            bestv = p.runes[k] || 0;
          }
        }
        p.runes[best] = 6;
        r.table.push({ system: `${p.name}'s Divine sets ${best} rune to 6 permanently.` });
      }
    }
  }
}


}); // end io.on

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server listening on', PORT));

