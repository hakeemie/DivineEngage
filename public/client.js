const socket = io();
let currentRoom = null;
let myId = null;

const el = id => document.getElementById(id);
const nameInput = el("name");
const roomInput = el("room");
const createBtn = el("create");
const joinBtn = el("join");
const playersEl = el("players");
const deckCountEl = el("deckCount");
const readyBtn = el("ready");
const gameBox = el("game");
const lobbyBox = el("lobby");
const stateEl = el("state");
const turnEl = el("turn");
const drawBtn = el("draw");
const handEl = el("hand");
const tableEl = el("table");
const leaveBtn = el("leave");

createBtn.onclick = () => {
  const roomId = roomInput.value.trim();
  const name = nameInput.value || "Player";
  if (!roomId) return alert("Enter room ID");
  socket.emit("createRoom", {roomId, name}, (res)=> {
    if (res.error) return alert(res.error);
    onJoin(res.room);
  });
};

joinBtn.onclick = () => {
  const roomId = roomInput.value.trim();
  const name = nameInput.value || "Player";
  if (!roomId) return alert("Enter room ID");
  socket.emit("joinRoom", {roomId, name}, (res)=> {
    if (res.error) return alert(res.error);
    onJoin(res.room);
  });
};

readyBtn.onclick = () => {
  if (!currentRoom) return;
  socket.emit("toggleReady", {roomId: currentRoom.id});
};

drawBtn.onclick = () => {
  if (!currentRoom) return;
  socket.emit("drawCard", {roomId: currentRoom.id}, (res)=> {
    if (res && res.error) alert(res.error);
  });
};

leaveBtn.onclick = () => {
  if (!currentRoom) return;
  socket.emit("leaveRoom", {roomId: currentRoom.id}, ()=> {
    location.reload();
  });
};

socket.on("connect", () => { myId = socket.id; });

socket.on("roomUpdate", (room) => {
  currentRoom = room;
  renderRoom(room);
});

function onJoin(room) {
  currentRoom = room;
  lobbyBox.style.display = "block";
  renderRoom(room);
}

function renderRoom(room) {
  // show lobby info
  playersEl.innerHTML = "";
  room.players.forEach(p => {
    const d = document.createElement("div");
    d.className = "player";
    d.innerHTML = `<div>${p.name}${p.id===myId? " (You)":""}</div><div>${p.handSize} cards ${p.ready? "✅": ""}</div>`;
    playersEl.appendChild(d);
  });
  deckCountEl.textContent = room.deckCount;
  stateEl.textContent = room.state;
  turnEl.textContent = room.order && room.order.length ? room.order[room.turnIndex] : "-";

  // show game section if playing or there are cards
  if (room.state === "playing" || room.table.length > 0) {
    gameBox.style.display = "block";
    lobbyBox.style.display = "none";
  } else {
    gameBox.style.display = "none";
    lobbyBox.style.display = "block";
  }

  // request to update our visible hand from server snapshot: server doesn't send full hands for privacy in summary;
  // But our server currently doesn't hide hands — so we rely on the room object. Find our player entry.
  const me = room.players.find(p => p.id === myId);
  const hand = [];
  // the server sends hand sizes in summary. To keep it simple, this client listens for direct hand updates
  // but to avoid extra endpoints, we'll show placeholder hand size and let draw/play reflect via click events.
  // If actual card data is present in players, show those.
  const fullPlayer = room.players.find(p => p.id === myId && p.cards);
  // Try to display cards if server provided them (in this starter it does not include card arrays in the summary)
  handEl.innerHTML = "";
  if (room.playersFull) {
    // not used
  } else {
    // show placeholders with count
    const meFull = room.players.find(p => p.id===myId);
    const count = meFull ? meFull.handSize : 0;
    handEl.innerHTML = `<div>${count} cards in hand (use Draw to get cards). Click a card to play once visible.</div>`;
  }

  // table
  tableEl.innerHTML = "";
  room.table.forEach(t => {
    const div = document.createElement("div");
    div.textContent = `${t.card} — ${t.playerId===myId? "You": t.playerId}`;
    tableEl.appendChild(div);
  });

}

// play card when clicking a card in hand (future: when cards are visible)
handEl.addEventListener("click", (ev) => {
  const txt = ev.target.textContent;
  if (!txt) return;
  const card = txt.trim();
  if (!confirm("Play " + card + "?")) return;
  socket.emit("playCard", {roomId: currentRoom.id, card}, (res)=> {
    if (res && res.error) alert(res.error);
  });
});