const socket = io();
let currentRoom = null;
let myId = null;
let myDeckCode = null;
let CARDS = null;

const deckbuilder = document.getElementById('deckbuilder');
const playBotBtn = document.getElementById('playBot');
const tutorialDeckCode = document.getElementById('tutorialDeckCode');
const nameInput = document.getElementById('name');
const matchStatus = document.getElementById('matchStatus');
const playersDiv = document.getElementById('players');
const deckCounts = document.getElementById('deckCounts');
const tableDiv = document.getElementById('table');
const handDiv = document.getElementById('hand');
const drawBtn = document.getElementById('draw');
const mulliganBtn = document.getElementById('mulligan');

fetch('/cards/cards.json').then(r=>r.json()).then(j=>{ CARDS=j; renderDeckBuilder(); }).catch(()=>alert('Missing cards.json'));

function renderDeckBuilder(){
  if(!CARDS) return;
  const div = document.createElement('div');
  const selD = document.createElement('select'); selD.id='divineSelect';
  CARDS.divines.forEach(d=>{ const o=document.createElement('option'); o.value=d.id; o.textContent=d.name+' ('+d.element+')'; selD.appendChild(o); });
  div.appendChild(document.createTextNode('Divine: ')); div.appendChild(selD); div.appendChild(document.createElement('br'));
  const followerContainer = document.createElement('div'); followerContainer.id='followers';
  CARDS.followers.forEach(f=>{
    const cb = document.createElement('input'); cb.type='checkbox'; cb.value=f.id; cb.id='cb_'+f.id;
    const lbl = document.createElement('label'); lbl.htmlFor='cb_'+f.id; lbl.textContent = f.name + ' ('+f.element+' atk:'+ (f.attack||'') +')';
    followerContainer.appendChild(cb); followerContainer.appendChild(lbl); followerContainer.appendChild(document.createElement('br'));
  });
  div.appendChild(document.createTextNode('Followers (select 15):')); div.appendChild(followerContainer);
  const genBtn = document.createElement('button'); genBtn.textContent='Generate Deck Code';
  genBtn.onclick = ()=>{
    const divine = selD.value;
    const followers = Array.from(followerContainer.querySelectorAll('input[type=checkbox]:checked')).map(i=>i.value);
    if(followers.length!==15){ alert('Select exactly 15 followers (currently '+followers.length+')'); return; }
    socket.emit('generateDeckCode', {divineId:divine, followers}, (res)=>{
      if(res.error) return alert(res.error);
      myDeckCode = res.code; prompt('Deck Code (copy to reuse):', res.code);
    });
  };
  div.appendChild(genBtn); deckbuilder.appendChild(div);
}

playBotBtn.onclick = ()=>{
  const code = tutorialDeckCode.value.trim() || myDeckCode;
  if(!code) return alert('Provide a deck code or generate one in the deck builder');
  const roomId = 'room_'+Math.random().toString(36).slice(2,8);
  const name = nameInput.value || 'Player';
  socket.emit('createRoomWithDeck', {roomId, name, deckCode: code, mode:'ai'}, (res)=>{
    if(res.error) return alert(res.error);
    currentRoom = roomId; matchStatus.textContent = 'Created room '+roomId+' (vs Bot)';
  });
};

socket.on('connect', ()=>{ myId = socket.id; });

socket.on('roomUpdate', (room)=>{
  if(!room) return;
  currentRoom = room.id;
  renderRoom(room);
});

function renderRoom(room){
  matchStatus.textContent = 'Room '+room.id + ' mode: '+room.mode + (room.started? ' (started)':' (waiting)');
  playersDiv.innerHTML = '';
  room.players.forEach(p=>{
    const div = document.createElement('div'); div.className='player-box';
    const img = document.createElement('img'); const cardMeta = findCardMeta(p.divine); img.src = cardMeta? cardMeta.image : ''; img.className='divine-img';
    div.appendChild(img);
    const info = document.createElement('div');
    info.innerHTML = `<strong>${p.name}${p.id===myId? ' (You)':''}</strong><br>HP: ${p.divineHP || '?'}<br>Hand: ${p.handSize}`;
    const runesDiv = document.createElement('div'); runesDiv.className='runes';
    const rs = p.runes || {fire:0,water:0,grass:0};
    ['fire','water','grass'].forEach(rn=>{ const el = document.createElement('div'); el.className='rune'; el.textContent = rn+':'+(rs[rn]||0); runesDiv.appendChild(el); });
    info.appendChild(runesDiv);
    div.appendChild(info);
    playersDiv.appendChild(div);
  });
  deckCounts.textContent = 'Decks: A='+(room.deckCounts?room.deckCounts.A:0)+' B='+(room.deckCounts?room.deckCounts.B:0);

  // table show images of cards on table
  tableDiv.innerHTML = '';
  room.table.forEach(t=>{
    const d = document.createElement('div');
    if(t.system){ d.textContent = t.system; tableDiv.appendChild(d); return; }
    const meta = findCardMeta(t.card);
    const img = document.createElement('img'); img.src = meta? meta.image : ''; img.title = (meta?meta.name:'') + ' — ' + t.playerId;
    tableDiv.appendChild(img);
  });

  // show hand images for me
  handDiv.innerHTML = '';
  const me = room.players.find(p=>p.id===myId);
  if(me){
    me.hand.forEach(cid=>{
      const meta = findCardMeta(cid);
      const img = document.createElement('img'); img.src = meta? meta.image : ''; img.title = meta? meta.name:cid;
      img.onclick = ()=>{ if(!confirm('Play '+(meta?meta.name:cid)+'?')) return; socket.emit('playCard', {roomId: room.id, cardId: cid}, (res)=>{ if(res && res.error) alert(res.error); }); };
      handDiv.appendChild(img);
    });
  } else {
    handDiv.textContent = 'Not in this room';
  }
}

function findCardMeta(id){ if(!CARDS) return null; return CARDS.divines.find(d=>d.id===id) || CARDS.followers.find(f=>f.id===id) || null; }

drawBtn.onclick = ()=>{ if(!currentRoom) return alert('Not in match'); socket.emit('drawFromDeck', {roomId: currentRoom}, (res)=>{ if(res && res.error) alert(res.error); }); };
mulliganBtn.onclick = ()=>{ if(!currentRoom) return alert('Not in match'); socket.emit('mulligan', {roomId: currentRoom}, (res)=>{ if(res && res.error) alert(res.error); }); };
