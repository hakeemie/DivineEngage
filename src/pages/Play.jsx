// src/pages/Play.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { decodeDeck } from "../utils/base64.js";
import { CARDS as cardsData } from "../data/cards.js";


let socket = null;

export default function Play() {
  const [room, setRoom] = useState(null);
  const [deckCode, setDeckCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [log, setLog] = useState([]);
  const meId = useRef(null);

  useEffect(() => {
    socket = io();
    socket.on("connect", () => {
      meId.current = socket.id;
    });
    socket.on("roomCreated", (d) => setLog((l) => [...l, `Room created ${d.roomId}`]));
    socket.on("roomUpdate", (r) => setRoom(r));
    socket.on("roomLog", (m) => setLog((l) => [...l, m]));
    socket.on("gameOver", (g) => setLog((l) => [...l, `Game Over: ${JSON.stringify(g)}`]));
    return () => {
      if (socket) socket.disconnect();
      socket = null;
    };
  }, []);

  // helpers
  function getCardInfo(id) {
    if (!id) return { name: "", image: "/cards/placeholder.png", attack: 0 };
    return (
      cardsData.followers.find((f) => f.id === id) ||
      cardsData.divines.find((d) => d.id === id) || {
        name: id,
        image: "/cards/placeholder.png",
      }
    );
  }

  // Room actions
  function createRoom() {
    if (!deckCode) return alert("Paste deck code first");
    const arr = decodeDeck(deckCode);
    if (!arr || arr.length !== 16) return alert("Invalid deck code (must be 16 entries: 1 divine + 15 followers)");
    const divine = arr[0];
    const followers = arr.slice(1);
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    socket.emit("createRoom", { roomId, deck: followers, divine });
    setRoom({ id: roomId });
  }
  function joinRoom() {
    if (!deckCode) return alert("Paste deck code first");
    if (!joinCode) return alert("Enter room id");
    const arr = decodeDeck(deckCode);
    if (!arr || arr.length !== 16) return alert("Invalid deck code");
    socket.emit("joinRoom", { roomId: joinCode, deck: arr.slice(1), divine: arr[0] });
  }
  function startBot() {
    if (!deckCode) return alert("Paste deck code first");
    socket.emit("createRoomWithDeck", { roomId: "bot_" + Math.random().toString(36).slice(2, 8), name: "Player", deckCode });
  }

  // select / confirm
  function selectCard(c) {
    setSelectedCard(c);
    setConfirmed(false);
  }
  function confirm() {
    if (!selectedCard) return alert("Select a card");
    if (!room || !room.id) return alert("Not in a room");
    socket.emit("playerConfirm", { roomId: room.id, card: selectedCard }, (res) => {
      if (res && res.error) alert(res.error);
      else {
        setConfirmed(true);
        // clear selection so UI uses pending state from server
        setSelectedCard(null);
      }
    });
  }

  // Pending map: which card each player has pending (hidden from opponent until reveal)
  const pending = {};
  if (room && room.players) {
    room.players.forEach((p) => {
      if (p.pending) pending[p.id] = p.pending;
    });
  }

  // Engage map (revealed when server sets engage)
  const engageMap = {};
  if (room && room.players) {
    room.players.forEach((p) => {
      if (p.engage) engageMap[p.id] = p.engage;
    });
  }

  // find me/opponent objects in room.players
  const me = room && room.players ? room.players.find((p) => p.id === socket?.id) : null;
  const opponent = room && room.players ? room.players.find((p) => p.id !== socket?.id) : null;

  useEffect(() => {
    // show alerts when matchOutcome appears
    if (room && room.matchOutcome) {
      const isWinner = room.matchOutcome.winner === socket?.id;
      if (isWinner) alert("You won! Opponent divine fell below 1 HP.");
      else alert("You lost! Your divine fell below 1 HP.");
    }
  }, [room && room.matchOutcome]);

  // helper ui: show card img (covers pending vs revealed logic)
  function renderOpponentCard() {
    if (!opponent) return <div className="card-img" />;
    // if opponent.engage is present (server revealed) show image; if only pending exists, show hidden placeholder
    if (engageMap[opponent.id]) {
      const ci = getCardInfo(engageMap[opponent.id]);
      return <img src={ci.image} alt={ci.name} className="card-img" />;
    }
    if (pending[opponent.id]) {
      // show hidden placeholder until reveal
      return <div className="card-img" style={{ backgroundColor: "#061122" }} />;
    }
    return <div className="card-img" />;
  }

  function renderMyCard() {
    if (!me) return <div className="card-img" />;
    // if my engage is present (server revealed) show it; otherwise if I have pending show my pending image (we let me see my pending)
    if (engageMap[me.id]) {
      const ci = getCardInfo(engageMap[me.id]);
      return <img src={ci.image} alt={ci.name} className="card-img" />;
    }
    if (pending[me.id]) {
      const ci = getCardInfo(pending[me.id]);
      return <img src={ci.image} alt={ci.name} className="card-img selected" />;
    }
    return <div className="card-img" />;
  }

  return (
    <div>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="button" onClick={createRoom}>Create Room (deck required)</button>
          <input placeholder="Join code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
          <button className="button" onClick={joinRoom}>Join Room</button>
          <div style={{ marginLeft: 12 }}>or</div>
          <button className="button" onClick={startBot}>Play vs Bot</button>
        </div>
        <div><input placeholder="Paste deck code here" value={deckCode} onChange={(e) => setDeckCode(e.target.value)} style={{ width: 320 }} /></div>
      </div>

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12 }}>
        {/* Opponent Divine (left) */}
        <div className="divine-box card">
          <div className="small">Opponent Divine</div>
          {opponent && <img src={getCardInfo(opponent.divine).image} alt="" className="card-img" />}
          <div style={{ marginTop: 8, fontWeight: 700 }}>{opponent ? getCardInfo(opponent.divine).name : "-"}</div>
          <div className="small" style={{ marginTop: 6 }}>HP: {opponent ? opponent.divineHP : "-"}</div>
          <div className="small">Runes: {opponent ? `🔥${opponent.runes.fire || 0} 💧${opponent.runes.water || 0} 🌿${opponent.runes.grass || 0}` : "-"}</div>
        </div>

        {/* Center engage zone: opponent card -> engage area -> your card */}
        <div style={{ flex: 1, marginLeft: 12, marginRight: 12 }} className="card">
          <div className="engage-zone" style={{ justifyContent: "space-between" }}>
            {/* Opponent card area (left of center) */}
            <div style={{ textAlign: "center", width: "24%" }}>
              <div className="small">Opponent Card</div>
              <div style={{ marginTop: 8 }}>{renderOpponentCard()}</div>
              <div className="small" style={{ marginTop: 8 }}>{engageMap[opponent?.id] ? getCardInfo(engageMap[opponent.id]).name : ""}</div>
            </div>

            {/* Engage center */}
            <div style={{ textAlign: "center", width: "30%" }}>
              <div className="small">Engage Zone</div>
              <div className="small">Cards clash here</div>
              <div style={{ height: 36 }} />
            </div>

            {/* Your card area (right of center) */}
            <div style={{ textAlign: "center", width: "24%" }}>
              <div className="small">Your Card</div>
              <div style={{ marginTop: 8 }}>{renderMyCard()}</div>
              <div className="small" style={{ marginTop: 8 }}>{engageMap[me?.id] ? getCardInfo(engageMap[me.id]).name : (pending[me?.id] ? getCardInfo(pending[me.id]).name : "")}</div>
            </div>
          </div>
        </div>

        {/* Your Divine (right) */}
        <div className="divine-box card">
          <div className="small">Your Divine</div>
          {me && <img src={getCardInfo(me.divine).image} alt="" className="card-img" />}
          <div style={{ marginTop: 8, fontWeight: 700 }}>{me ? getCardInfo(me.divine).name : "-"}</div>
          <div className="small" style={{ marginTop: 6 }}>HP: {me ? me.divineHP : "-"}</div>
          <div className="small">Runes: {me ? `🔥${me.runes.fire || 0} 💧${me.runes.water || 0} 🌿${me.runes.grass || 0}` : "-"}</div>
        </div>
      </div>

      {/* Hand (single row) */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Your Hand</h3>
        <div className="hand" style={{ marginTop: 8, display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {me && me.hand && me.hand.map((c) => {
            const ci = getCardInfo(c);
            // selected if it's our pending (server) OR local selection before confirm
            const isSelected = selectedCard === c || (pending && pending[socket?.id] === c);
            return (
              <div key={c} style={{ width: 120, textAlign: "center", cursor: "pointer" }} onClick={() => selectCard(c)}>
                <img src={ci.image} alt="" style={{ width: 120, height: 160, objectFit: "cover", outline: isSelected ? "3px solid white" : "none", borderRadius: 6 }} />
                <div style={{ marginTop: 6, fontWeight: 700 }}>{ci.name}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 8 }}>
          <button className="button" onClick={confirm} disabled={!selectedCard}>{confirmed ? "Confirmed" : "Confirm"}</button>
        </div>
      </div>

      {/* Log */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Log</h3>
        <div style={{ maxHeight: 200, overflow: "auto" }}>{log.map((l, i) => (<div key={i}>{String(l)}</div>))}</div>
      </div>
    </div>
  );
}
