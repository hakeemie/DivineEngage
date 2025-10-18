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

  // --- robust card lookup: flattens followers object and searches divines ---
  function getCardInfo(id) {
    if (!id) return { name: "", image: "/cards/placeholder.png", attack: 0, abilities: [] };

    const lower = id.toString().toLowerCase();

    // build flat followers array safely (handles missing structure)
    const followersObj = cardsData && cardsData.followers ? cardsData.followers : {};
    const followerGroups = Object.values(followersObj).filter(Boolean);
    const allFollowers = followerGroups.flat ? followerGroups.flat() : [].concat(...followerGroups || []);

    const foundFollower = allFollowers.find((f) => (f.id || "").toString().toLowerCase() === lower);
    const foundDivine = (cardsData.divines || []).find((d) => (d.id || "").toString().toLowerCase() === lower);

    const card = foundFollower || foundDivine;
    if (!card) return { name: id, image: "/cards/placeholder.png", attack: 0, abilities: [] };
    return card;
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
    socket.emit("createRoomWithDeck", {
      roomId: "bot_" + Math.random().toString(36).slice(2, 8),
      name: "Player",
      deckCode,
    });
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
  if (room && Array.isArray(room.players)) {
    room.players.forEach((p) => {
      if (p.pending) pending[p.id] = p.pending;
    });
  }

  // Engage map (revealed when server sets engage)
  const engageMap = {};
  if (room && Array.isArray(room.players)) {
    room.players.forEach((p) => {
      if (p.engage) engageMap[p.id] = p.engage;
    });
  }

  // find me/opponent objects in room.players — use meId.current, not socket?.id (safer)
  const me = room && Array.isArray(room.players) ? room.players.find((p) => p.id === meId.current) : null;
  const opponent = room && Array.isArray(room.players) ? room.players.find((p) => p.id !== meId.current) : null;

  useEffect(() => {
    // show alerts when matchOutcome appears
    if (room && room.matchOutcome) {
      const isWinner = room.matchOutcome.winner === meId.current;
      if (isWinner) alert("You won! Opponent divine fell below 1 HP.");
      else alert("You lost! Your divine fell below 1 HP.");
    }
  }, [room && room.matchOutcome]);

  // helper ui: show card img (covers pending vs revealed logic)
  function renderOpponentCard() {
    if (!opponent) return <div className="card-img" />;
    const oppId = opponent.id;
    // if opponent.engage is present (server revealed) show image; if only pending exists, show hidden placeholder
    if (engageMap[oppId]) {
      const ci = getCardInfo(engageMap[oppId]);
      return <img src={ci.image || "/cards/placeholder.png"} alt={ci.name} className="card-img" />;
    }
    if (pending[oppId]) {
      // show hidden placeholder until reveal
      return <div className="card-img" style={{ backgroundColor: "#061122" }} />;
    }
    return <div className="card-img" />;
  }

  function renderMyCard() {
    if (!me) return <div className="card-img" />;
    const myId = me.id;
    // if my engage is present (server revealed) show it; otherwise if I have pending show my pending image (we let me see my pending)
    if (engageMap[myId]) {
      const ci = getCardInfo(engageMap[myId]);
      return <img src={ci.image || "/cards/placeholder.png"} alt={ci.name} className="card-img" />;
    }
    if (pending[myId]) {
      const ci = getCardInfo(pending[myId]);
      return <img src={ci.image || "/cards/placeholder.png"} alt={ci.name} className="card-img selected" />;
    }
    return <div className="card-img" />;
  }
return (
  <div>
    {/* Header row */}
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="button" onClick={createRoom}>
          Create Room (deck required)
        </button>
        <input
          placeholder="Join code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          style={{
            color: "white", // ✅ make text white
            backgroundColor: "#10182B",
            border: "1px solid #4B5B8C",
            padding: "4px 8px",
            borderRadius: 6,
          }}
        />
        <button className="button" onClick={joinRoom}>
          Join Room
        </button>
        <div style={{ marginLeft: 12 }}>or</div>
        <button className="button" onClick={startBot}>
          Play vs Bot
        </button>
      </div>
      <div>
        <input
          placeholder="Paste deck code here"
          value={deckCode}
          onChange={(e) => setDeckCode(e.target.value)}
          style={{
            width: 320,
            color: "white", // ✅ white text
            backgroundColor: "#10182B",
            border: "1px solid #4B5B8C",
            padding: "4px 8px",
            borderRadius: 6,
          }}
        />
      </div>
    </div>

    {/* Main battle zone */}
    <div
      className="card"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginTop: 12,
      }}
    >
      {/* Opponent Divine (left) */}
      <div className="divine-box card">
        <div className="small">Opponent Divine</div>
        {opponent && <img src={getCardInfo(opponent.divine).image} alt="" className="card-img" />}
        <div style={{ marginTop: 8, fontWeight: 700 }}>{opponent ? getCardInfo(opponent.divine).name : "-"}</div>
        <div className="small" style={{ marginTop: 6 }}>
          HP: {opponent ? opponent.divineHP : "-"}
        </div>
        <div className="small">
          Runes:{" "}
          {opponent
            ? `🔥${opponent.runes.fire || 0} 💧${opponent.runes.water || 0} 🌿${opponent.runes.grass || 0}`
            : "-"}
        </div>
      </div>

      {/* Engage zone — horizontally aligned: Opponent card | Engage area | Your card + Divine */}
      <div
        style={{
          flex: 1,
          marginLeft: 12,
          marginRight: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        className="card"
      >
        {/* Opponent card */}
        <div style={{ textAlign: "center", width: "25%" }}>
          <div className="small">Opponent Card</div>
          <div style={{ marginTop: 8 }}>{renderOpponentCard()}</div>
          <div className="small" style={{ marginTop: 8 }}>
            {engageMap[opponent?.id]
              ? getCardInfo(engageMap[opponent.id]).name
              : ""}
          </div>
        </div>

        {/* Engage center */}
        <div style={{ textAlign: "center", width: "30%" }}>
          <div className="small">Engage Zone</div>
          <div className="small">Cards clash here</div>
        </div>

        {/* Your card + Your divine on same line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            justifyContent: "flex-end",
            width: "35%",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div className="small">Your Card</div>
            <div style={{ marginTop: 8 }}>{renderMyCard()}</div>
            <div className="small" style={{ marginTop: 8 }}>
              {engageMap[me?.id]
                ? getCardInfo(engageMap[me.id]).name
                : pending[me?.id]
                ? getCardInfo(pending[me.id]).name
                : ""}
            </div>
          </div>

          <div className="divine-box card" style={{ textAlign: "center", padding: 8 }}>
            <div className="small">Your Divine</div>
            {me && (
              <img
                src={getCardInfo(me.divine).image}
                alt={me.divine}
                className="card-img"
                style={{ width: 100 }}
              />
            )}
            <div style={{ marginTop: 4, fontWeight: 700 }}>
              {me ? getCardInfo(me.divine).name : "-"}
            </div>
            <div className="small" style={{ marginTop: 2 }}>
              HP: {me ? me.divineHP : "-"}
            </div>
            <div className="small">
              Runes:{" "}
              {me
                ? `🔥${me.runes.fire || 0} 💧${me.runes.water || 0} 🌿${me.runes.grass || 0}`
                : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Hand and Log remain unchanged below */}
      ...



      {/* Hand (single row) */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Your Hand</h3>
        <div className="hand" style={{ marginTop: 8, display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {me && Array.isArray(me.hand) && me.hand.map((c) => {
            const ci = getCardInfo(c);
            // selected if it's our pending (server) OR local selection before confirm
            const isSelected = selectedCard === c || (pending && pending[meId.current] === c);
            return (
              <div key={c} style={{ width: 120, textAlign: "center", cursor: "pointer" }} onClick={() => selectCard(c)}>
                <img src={ci.image || "/cards/placeholder.png"} alt={ci.name} style={{ width: 120, height: 160, objectFit: "cover", outline: isSelected ? "3px solid white" : "none", borderRadius: 6 }} />
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
