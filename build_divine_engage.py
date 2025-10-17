#!/usr/bin/env python3
# build_divine_engage.py
# Generates a deploy-ready Divine Engage project folder and a zip with placeholder PNGs

import os, json, textwrap, zipfile, shutil, random
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception as e:
    print("This script requires Pillow. Install with: pip install pillow")
    raise

BASE = Path("divine-engage-complete")
if BASE.exists():
    shutil.rmtree(BASE)
BASE.mkdir(parents=True)

# Make directories
(BASE / "public" / "cards").mkdir(parents=True)
(BASE / "public" / "assets" / "runes").mkdir(parents=True)
(BASE / "src" / "pages").mkdir(parents=True)
(BASE / "src" / "data").mkdir(parents=True)
(BASE / "src" / "utils").mkdir(parents=True)

def write(path, content, mode="w"):
    p = BASE / path
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, mode, encoding="utf-8" if "b" not in mode else None) as f:
        f.write(content)

# package.json
pkg = {
  "name": "divine-engage",
  "version": "1.0.0",
  "private": True,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5174",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.7.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.1",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.10",
    "vite": "^5.4.0"
  }
}
write("package.json", json.dumps(pkg, indent=2))

# vite config
write("vite.config.js", textwrap.dedent("""\
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' }
})
"""))

# index.html
write("index.html", textwrap.dedent("""\
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Divine Engage</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
"""))

# styles.css (deep dark blue)
write("src/styles.css", textwrap.dedent("""\
@tailwind base;
@tailwind components;
@tailwind utilities;

:root{
  --bg1: #081127;
  --bg2: #0b1830;
  --card: #0f1724;
  --accent: #4f46e5;
  --muted: #94a3b8;
  --text: #e6eef8;
}

body{ background: linear-gradient(180deg,var(--bg1),var(--bg2)); color:var(--text); font-family:Inter,ui-sans-serif,system-ui; margin:0; }
.container{ max-width:1100px; margin:0 auto; padding:24px; }
.header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
.card{ background:var(--card); padding:12px; border-radius:10px; box-shadow:0 6px 18px rgba(2,6,23,0.6); }
.button{ background:var(--accent); color:white; padding:8px 12px; border-radius:8px; cursor:pointer; border:none; }
.card-img{ width:140px; height:200px; border-radius:8px; background:#061122; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; }
.hand{ display:flex; gap:10px; overflow:auto; padding:8px; }
.engage-zone{ display:flex; gap:18px; align-items:center; justify-content:center; min-height:160px; }
.divine-box{ width:160px; text-align:center; }
.small{ font-size:12px; color:var(--muted); }
"""))

# main + App
write("src/main.jsx", textwrap.dedent("""\
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
"""))

write("src/App.jsx", textwrap.dedent("""\
import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import DeckBuilder from './pages/DeckBuilder.jsx'
import Play from './pages/Play.jsx'
import Tutorial from './pages/Tutorial.jsx'

export default function App(){
  return (
    <div className="container">
      <header className="header">
        <h1 style={{fontSize:28}}>Divine Engage</h1>
        <nav style={{display:'flex',gap:12}}>
          <Link to="/">Home</Link>
          <Link to="/deckbuilder">Deck Builder</Link>
          <Link to="/play">Play</Link>
          <Link to="/tutorial">Tutorial</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/deckbuilder" element={<DeckBuilder/>} />
          <Route path="/play" element={<Play/>} />
          <Route path="/tutorial" element={<Tutorial/>} />
        </Routes>
      </main>
    </div>
  )
}
"""))

# cards data (3 divines + 54 followers)
random.seed(42)
elements = ['fire','water','grass']
followers = []
for i in range(54):
    el = elements[i % 3]
    ability = []
    if i % 11 == 0:
        ability.append({"type":"draw","value":1})
    if i % 13 == 0:
        ability.append({"type":"damage","value":1})
    if i % 17 == 0:
        ability.append({"type":"discard","value":1})
    followers.append({
        "id": f"F{i+1}",
        "name": f"{el.title()} Follower {i+1}",
        "element": el,
        "attack": random.randint(1,6),
        "image": f"/cards/follower_{i+1}.png",
        "abilities": ability
    })

cards_obj = {
  "divines": [
    {"id":"D_FIRE","name":"Inferna","element":"fire","hp":30,"image":"/cards/divine_fire.png","transcend":"runes>=10","transcendEffect":{"type":"double_damage"}},
    {"id":"D_WATER","name":"Aqualis","element":"water","hp":30,"image":"/cards/divine_water.png","transcend":"damageInTurn>=6","transcendEffect":{"type":"double_discard"}},
    {"id":"D_GRASS","name":"Verdara","element":"grass","hp":30,"image":"/cards/divine_grass.png","transcend":"drawn>=14","transcendEffect":{"type":"set_rune_to_6"}}
  ],
  "followers": followers
}
write("src/data/cards.js", "export default " + json.dumps(cards_obj, indent=2))

# base64 utils
write("src/utils/base64.js", textwrap.dedent("""\
export function encodeDeck(arr){ return btoa(JSON.stringify(arr)).replace(/=/g,'') }
export function decodeDeck(code){ try{ let pad = code.length % 4; if(pad) code += '='.repeat(4-pad); return JSON.parse(atob(code)) }catch(e){ return null } }
"""))

# simple pages (DeckBuilder, Play, Home, Tutorial)
write("src/pages/Home.jsx", "import React from 'react'; export default ()=> (<div className='card'><h2>Welcome to Divine Engage</h2><p className='small'>Build decks, play vs bot, or create private multiplayer rooms.</p></div>);\n")

write("src/pages/Tutorial.jsx", "import React from 'react'; export default ()=> (<div className='card'><h2>Tutorial</h2><p className='small'>Build a deck then play.</p></div>);\n")

# DeckBuilder (minimal but shows images and creates deck code)
write("src/pages/DeckBuilder.jsx", textwrap.dedent("""\
import React, {useState} from 'react'
import cardsData from '../data/cards.js'
import { encodeDeck } from '../utils/base64.js'

export default function DeckBuilder(){
  const cards = cardsData
  const [divine, setDivine] = useState(cards.divines[0].id)
  const [selected, setSelected] = useState({})

  const byElement = { fire:[], water:[], grass:[] }
  cards.followers.forEach(f=> byElement[f.element].push(f))

  function toggle(id){
    setSelected(s=>{ const ns={...s}; if(ns[id]) delete ns[id]; else ns[id]=true; return ns })
  }
  function generate(){
    const sel = Object.keys(selected)
    if(sel.length !== 15){ alert('Select exactly 15 followers (currently '+sel.length+')'); return }
    const arr = [divine].concat(sel)
    const code = encodeDeck(arr)
    prompt('Deck code (copy to reuse):', code)
  }

  return (
    <div>
      <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h2>Deck Builder</h2>
          <div className="small">Select Divine:
            <select className="ml-2" value={divine} onChange={e=>setDivine(e.target.value)}>
              {cards.divines.map(d=> <option key={d.id} value={d.id}>{d.name} ({d.element})</option>)}
            </select>
          </div>
        </div>
        <div>
          <button className="button" onClick={generate}>Generate Deck Code</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:12}}>
        {['fire','water','grass'].map(el=> (
          <div key={el} className="card">
            <h3>{el.toUpperCase()}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
              {byElement[el].map(c=> (
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,justifyContent:'space-between',padding:6}}>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <img src={c.image} alt="" style={{width:56,height:80,objectFit:'cover',borderRadius:6}} />
                    <div>
                      <div style={{fontWeight:700}}>{c.name}</div>
                      <div className="small">ATK {c.attack} {c.abilities && c.abilities.length>0 ? '| ' + c.abilities.map(a=>a.type).join(', ') : ''}</div>
                    </div>
                  </div>
                  <div><input type="checkbox" checked={!!selected[c.id]} onChange={()=>toggle(c.id)} /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
"""))

# Play page (minimal integration with server events; client expects server to emit roomUpdate)
write("src/pages/Play.jsx", textwrap.dedent("""\
import React, {useEffect, useState, useRef} from 'react'
import { io } from 'socket.io-client'
import { decodeDeck } from '../utils/base64.js'
import cardsData from '../data/cards.js'

let socket = null
export default function Play(){
  const [room, setRoom] = useState(null)
  const [deckCode, setDeckCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [log, setLog] = useState([])
  const meId = useRef(null)

  useEffect(()=>{
    socket = io()
    socket.on('connect', ()=> meId.current = socket.id)
    socket.on('roomUpdate', r=> setRoom(r))
    socket.on('roomCreated', d=> setLog(l=>[...l,'Room created '+d.roomId]))
    socket.on('gameStart', d=> setLog(l=>[...l,d.message]))
    socket.on('gameOver', g=> setLog(l=>[...l,'Game Over: '+JSON.stringify(g)]))
    socket.on('roomLog', m=> setLog(l=>[...l,m]))
    return ()=> { socket && socket.disconnect(); socket = null }
  },[])

  function createRoom(){
    if(!deckCode) return alert('Paste deck code first')
    const arr = decodeDeck(deckCode)
    if(!arr || arr.length!==16) return alert('Invalid deck code (must be 16 entries: 1 divine + 15 followers)')
    const divine = arr[0]; const followers = arr.slice(1)
    const roomId = Math.random().toString(36).slice(2,7).toUpperCase()
    socket.emit('createRoom', { roomId, deck: followers, divine })
    setRoom({ id: roomId })
  }
  function joinRoom(){ if(!deckCode) return alert('Paste deck code first'); if(!joinCode) return alert('Enter room id'); const arr = decodeDeck(deckCode); if(!arr || arr.length!==16) return alert('Invalid deck code'); socket.emit('joinRoom', { roomId: joinCode, deck: arr.slice(1), divine: arr[0] }) }
  function startBot(){ if(!deckCode) return alert('Paste deck code first'); socket.emit('createRoomWithDeck', { roomId: 'bot_'+Math.random().toString(36).slice(2,8), name:'Player', deckCode }) }
  function selectCard(c){ setSelectedCard(c); setConfirmed(false) }
  function confirm(){ if(!selectedCard) return alert('Select a card'); socket.emit('playerConfirm', { roomId: room.id, card: selectedCard }, (res)=>{ if(res && res.error) alert(res.error); else setConfirmed(true) }) }

  const me = room && room.players ? room.players.find(p=>p.id===socket?.id) : null
  const opponent = room && room.players ? room.players.find(p=>p.id!==socket?.id) : null
  function getCardInfo(id){ return cardsData.followers.find(f=>f.id===id) || cardsData.divines.find(d=>d.id===id) || {name:id, image:'/cards/placeholder.png'} }

  return (<div>
    <div className='card' style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{display:'flex',gap:8}}>
        <button className='button' onClick={createRoom}>Create Room (deck required)</button>
        <input placeholder='Join code' value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} />
        <button className='button' onClick={joinRoom}>Join Room</button>
        <div style={{marginLeft:12}}>or</div>
        <button className='button' onClick={startBot}>Play vs Bot</button>
      </div>
      <div><input placeholder='Paste deck code here' value={deckCode} onChange={e=>setDeckCode(e.target.value)} style={{width:320}} /></div>
    </div>

    <div className='card' style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginTop:12}}>
      <div className='divine-box card'>
        <div className='small'>Your Divine</div>
        {me && <img src={getCardInfo(me.divine).image} alt='' className='card-img'/>}
        <div style={{marginTop:8,fontWeight:700}}>{me? getCardInfo(me.divine).name : '-'}</div>
        <div className='small' style={{marginTop:6}}>HP: {me?me.divineHP:'-'}</div>
        <div className='small'>Runes: {me? `🔥${me.runes.fire||0} 💧${me.runes.water||0} 🌿${me.runes.grass||0}` : '-'}</div>
      </div>
      <div style={{flex:1,marginLeft:12,marginRight:12}} className='card'>
        <div className='engage-zone'>
          <div style={{textAlign:'center'}}>
            <div className='small'>Opponent Card</div>
            {opponent && opponent.engage ? <img src={getCardInfo(opponent.engage).image} className='card-img'/> : <div className='card-img'/>}
            <div className='small' style={{marginTop:8}}>{opponent && opponent.engage ? getCardInfo(opponent.engage).name : ''}</div>
          </div>
          <div style={{textAlign:'center'}}><div className='small'>Engage Zone</div><div className='small'>Cards clash here</div></div>
          <div style={{textAlign:'center'}}>
            <div className='small'>Your Card</div>
            {me && me.engage ? <img src={getCardInfo(me.engage).image} className='card-img'/> : <div className='card-img'/>}
            <div className='small' style={{marginTop:8}}>{me && me.engage ? getCardInfo(me.engage).name : ''}</div>
          </div>
        </div>
      </div>
      <div className='divine-box card'>
        <div className='small'>Opponent Divine</div>
        {opponent && <img src={getCardInfo(opponent.divine).image} alt='' className='card-img'/>}
        <div style={{marginTop:8,fontWeight:700}}>{opponent? getCardInfo(opponent.divine).name : '-'}</div>
        <div className='small' style={{marginTop:6}}>HP: {opponent?opponent.divineHP:'-'}</div>
        <div className='small'>Runes: {opponent? `🔥${opponent.runes.fire||0} 💧${opponent.runes.water||0} 🌿${opponent.runes.grass||0}` : '-'}</div>
      </div>
    </div>

    <div className='card' style={{marginTop:12}}>
      <h3>Your Hand</h3>
      <div className='hand' style={{marginTop:8}}>
        {me && me.hand && me.hand.map(c=> { const ci = getCardInfo(c); return (<div key={c} style={{width:120,textAlign:'center'}} onClick={()=>selectCard(c)}><img src={ci.image} style={{width:120,height:160}} /><div style={{marginTop:6,fontWeight:700}}>{ci.name}</div></div>) })}
      </div>
      <div style={{marginTop:8}}><button className='button' onClick={confirm} disabled={!selectedCard || confirmed}>{confirmed?'Confirmed':'Confirm'}</button></div>
    </div>

    <div className='card' style={{marginTop:12}}>
      <h3>Log</h3>
      <div style={{maxHeight:200,overflow:'auto'}}>{log.map((l,i)=>(<div key={i}>{String(l)}</div>))}</div>
    </div>
  </div>)
}
"""))

# server.js (clean ES module server implementing described rules)
write("server.js", textwrap.dedent("""\
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
try{ const txt = fs.readFileSync(path.join(__dirname,'src','data','cards.js'),'utf8'); CARDS = JSON.parse(txt.replace(/^\\s*export default\\s*/,'')); }catch(e){ console.warn('cards load failed', e.message); }

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }
function findCard(id){ return CARDS.divines.find(d=>d.id===id) || CARDS.followers.find(f=>f.id===id) || null; }
function decodeDeck(code){ try{ let pad = code.length % 4; if(pad) code += '='.repeat(4-pad); return JSON.parse(Buffer.from(code,'base64').toString('utf8')); }catch(e){ return null; } }

const rooms = {};

function newRoom(){ return { players:{}, order:[], decks:{}, discards:{}, started:false, table:[], confirms:{}, engage:{}, damageThisTurn:{} }; }

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

  socket.on('playerConfirm', ({roomId, card}, cb)=>{
    const r = rooms[roomId]; if(!r) return cb && cb({error:'room not found'});
    if(!r.players[socket.id]) return cb && cb({error:'not in room'});
    const p = r.players[socket.id];
    if(!p.hand.includes(card)) return cb && cb({error:'card not in hand'});
    p.hand = p.hand.filter(c=> c !== card);
    r.engage[socket.id] = card;
    r.confirms[socket.id] = card;
    io.to(roomId).emit('roomUpdate', summarize(roomId));
    const humanIds = Object.keys(r.players).filter(id=> !r.players[id].isBot);
    if(humanIds.length === 2 && humanIds.every(id=> r.confirms[id])){ resolveEngage(roomId); r.confirms = {}; }
    const allEngaged = Object.keys(r.engage).length === Object.keys(r.players).length;
    if(allEngaged){ resolveEngage(roomId); r.confirms = {}; }
    cb && cb({ok:true});
  });

  socket.on('disconnecting', ()=>{
    for(const roomId of Object.keys(socket.rooms)){
      const r = rooms[roomId]; if(!r) continue;
      if(r.players[socket.id]){ delete r.players[socket.id]; const idx = r.order.indexOf(socket.id); if(idx!==-1) r.order.splice(idx,1); io.to(roomId).emit('roomUpdate', summarize(roomId)); }
      if(Object.keys(r.players).length === 0) delete rooms[roomId];
    }
  });

  function summarize(roomId){ const r = rooms[roomId]; if(!r) return null; const players = Object.entries(r.players).map(([id,p])=>({ id, name:p.name, hand:p.hand, engage: r.engage[id]||null, divine: p.divine, divineHP: p.divineHP, runes: p.runes, transcended: p.transcended })); return { id: roomId, players, deckCounts: Object.fromEntries(Object.keys(r.decks).map(k=>[k, r.decks[k].length])), discardCounts: Object.fromEntries(Object.keys(r.discards).map(k=>[k, r.discards[k].length])), table: r.table }; }

  function startMatch(roomId){
    const r = rooms[roomId]; if(!r) return;
    r.started = true; r.table = []; r.engage = {}; r.confirms = {}; r.damageThisTurn = {};
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

  function resolveEngage(roomId){
    const r = rooms[roomId]; if(!r) return;
    const engages = Object.entries(r.engage).map(([id,card])=>({ id, card }));
    if(engages.length < 2) return;
    const totals = {}; const elements = {};
    for(const e of engages){
      const info = findCard(e.card); totals[e.id] = (totals[e.id]||0)+(info.attack||0); elements[e.id] = elements[e.id]||new Set(); if(info.element) elements[e.id].add(info.element); r.players[e.id].runes[info.element] = (r.players[e.id].runes[info.element]||0)+1; r.damageThisTurn[e.id] = (r.damageThisTurn[e.id]||0)+(info.attack||0);
    }
    let winner=null; let best=-1; let tie=false; for(const id of Object.keys(totals)){ const v=totals[id]||0; if(v>best){ best=v; winner=id; tie=false } else if(v===best) tie=true }
    if(tie || winner===null){ r.table.push({system:'Round tied — no damage'}); finalizeEngageAndDraw(r); io.emit('roomUpdate', summarize(roomId)); return; }
    const opponent = Object.keys(r.players).find(id=> id !== winner);
    let attackValue = totals[winner]||0; let runeBonus=0; for(const el of elements[winner]||[]) runeBonus += (r.players[winner].runes[el]||0);
    let damage = attackValue + runeBonus;
    const winnerDiv = findCard(r.players[winner].divine); if(winnerDiv && winnerDiv.id === 'D_FIRE' && r.players[winner].transcended && r.players[winner].transcended_effect && r.players[winner].transcended_effect.type === 'double_damage'){ damage = damage * 2; }
    r.players[opponent].divineHP -= damage;
    r.table.push({system:`${r.players[winner].name} won the clash and dealt ${damage} damage to ${r.players[opponent].name}`});
    for(const e of engages.filter(x=>x.id===winner)){ const info=findCard(e.card); if(info.abilities) for(const ab of info.abilities){ applyAbility(r,winner,opponent,ab); } }
    for(const e of engages.filter(x=>x.id===opponent)){ const info=findCard(e.card); if(info.abilities) for(const ab of info.abilities){ applyAbility(r,opponent,winner,ab); } }
    checkTranscend(r,winner); checkTranscend(r,opponent); finalizeEngageAndDraw(r);
    if(r.players[opponent].divineHP <= 0){ r.table.push({system:`${r.players[winner].name} wins the match!`}); io.to(roomId).emit('roomUpdate', summarize(roomId)); setTimeout(()=>{ delete rooms[roomId]; }, 3000); return; }
    io.to(roomId).emit('roomUpdate', summarize(roomId));
  }

  function finalizeEngageAndDraw(r){
    for(const [id,p] of Object.entries(r.players)){
      if(r.engage[id]){ if(!r.discards[id]) r.discards[id]=[]; r.discards[id].push(r.engage[id]); delete r.engage[id]; }
    }
    for(const id of Object.keys(r.players)){ const c = drawCard(r, id); if(c){ r.players[id].hand.push(c); r.players[id].drawn = (r.players[id].drawn||0)+1 } }
    r.damageThisTurn = {};
  }

  function applyAbility(r, actorId, targetId, ab){
    const actor = r.players[actorId]; const target = r.players[targetId];
    if(ab.type === 'draw'){ for(let i=0;i<(ab.value||1);i++){ const c = drawCard(r, actorId); if(c){ actor.hand.push(c); actor.drawn = (actor.drawn||0)+1 } } r.table.push({system:`${actor.name} drew ${ab.value||1} card(s) via ability`}); }
    else if(ab.type === 'damage'){ const dmg = ab.value||1; target.divineHP -= dmg; r.table.push({system:`${actor.name} dealt ${dmg} damage to ${target.name} via ability`}); }
    else if(ab.type === 'discard'){ for(let i=0;i<(ab.value||1);i++){ if(target.hand.length===0) break; const ri=Math.floor(Math.random()*target.hand.length); const removed = target.hand.splice(ri,1)[0]; if(!r.discards[target.id]) r.discards[target.id]=[]; r.discards[target.id].push(removed); r.table.push({system:`${actor.name} forced ${target.name} to discard ${removed}`}); const tdiv=findCard(target.divine); if(tdiv && target.transcended && target.transcended_effect && target.transcended_effect.type==='double_discard'){ if(target.hand.length>0){ const ri2=Math.floor(Math.random()*target.hand.length); const removed2 = target.hand.splice(ri2,1)[0]; r.discards[target.id].push(removed2); r.table.push({system:`Discard triggered twice: ${target.name} discarded ${removed2}`}); } } } }
  }

  function checkTranscend(r, playerId){
    const p = r.players[playerId]; if(!p) return; if(p.transcended) return; const dv = findCard(p.divine); if(!dv) return; const cond = dv.transcend || '';
    if(cond.startsWith('runes>=')){ const num=parseInt(cond.split('>=')[1],10); const total=(p.runes.fire||0)+(p.runes.water||0)+(p.runes.grass||0); if(total>=num){ p.transcended=true; p.transcended_effect=dv.transcendEffect; r.table.push({system:`${p.name}'s Divine ${dv.name} has transcended!`}); } }
    else if(cond.startsWith('damageInTurn>=')){ const num=parseInt(cond.split('>=')[1],10); const dmg = r.damageThisTurn && r.damageThisTurn[playerId] || 0; if(dmg>=num){ p.transcended=true; p.transcended_effect=dv.transcendEffect; r.table.push({system:`${p.name}'s Divine ${dv.name} has transcended!`}); } }
    else if(cond.startsWith('drawn>=')){ const num=parseInt(cond.split('>=')[1],10); if((p.drawn||0) >= num){ p.transcended=true; p.transcended_effect=dv.transcendEffect; r.table.push({system:`${p.name}'s Divine ${dv.name} has transcended!`}); if(dv.transcendEffect && dv.transcendEffect.type==='set_rune_to_6'){ const keys=['fire','water','grass']; let best='fire'; let bestv=p.runes.fire||0; for(const k of keys){ if((p.runes[k]||0) > bestv){ best=k; bestv=p.runes[k]||0 } } p.runes[best]=6; r.table.push({system:`${p.name}'s Divine sets ${best} rune to 6 permanently.`}); } } }
  }

}); // end io.on

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server listening on', PORT));
"""))

# Create simple PNG placeholders using Pillow
from PIL import Image, ImageDraw, ImageFont
font = ImageFont.load_default()
el_colors = {'fire':(200,60,60), 'water':(60,120,200), 'grass':(80,170,100)}
# divines
divines = [('divine_fire.png','Inferna','fire'), ('divine_water.png','Aqualis','water'), ('divine_grass.png','Verdara','grass')]
for fname, name, el in divines:
    img = Image.new('RGB', (420, 600), color=el_colors[el])
    d = ImageDraw.Draw(img)
    w,h = d.textsize(name, font=font)
    d.text(((420-w)/2, 260), name, font=font, fill=(255,255,255))
    img.save(BASE / "public" / "cards" / fname)

# followers
for i in range(1,55):
    el = elements[(i-1) % 3]
    name = f"{el.title()} {i}"
    img = Image.new('RGB', (300, 420), color=el_colors[el])
    d = ImageDraw.Draw(img)
    txt = f"{el.title()}\\n#{i}"
    d.multiline_text((20,160), txt, font=font, fill=(255,255,255))
    img.save(BASE / "public" / "cards" / f"follower_{i}.png")

# simple runes
for rname, col in [('fire.png',(200,60,60)), ('water.png',(60,120,200)), ('grass.png',(80,170,100))]:
    img = Image.new('RGB', (64,64), color=col)
    d = ImageDraw.Draw(img)
    d.text((18,18), rname[0].upper(), font=font, fill=(255,255,255))
    img.save(BASE / "public" / "assets" / "runes" / rname)

# README
write("README.md", textwrap.dedent("""\
# Divine Engage - Combined Build (Multiplayer + Single-player)

This package contains a React + Vite frontend and an Express + Socket.IO server.
Placeholders for 3 divines and 54 followers are stored in `/public/cards/` as PNGs.

How to run locally:
1. npm install
2. npm run build
3. npm start

Deploy notes for Render:
- Build command: npm install --include=dev && npm run build
- Start command: node server.js
"""))

# Zip it
zip_name = "divine-engage-complete.zip"
with zipfile.ZipFile(zip_name, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(BASE):
        for fn in files:
            full = os.path.join(root, fn)
            arc = os.path.relpath(full, BASE)
            z.write(full, arc)

print("Done. Created", zip_name)
