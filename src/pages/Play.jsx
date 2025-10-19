// src/pages/Play.jsx
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { decodeDeck } from "../utils/base64.js";
import { getCardArt } from "../utils/cardUtils.js";
import cardsData from "../data/cards.js";

let socket = null;

export default function Play() {
  const [socketConnected, setSocketConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [deckCode, setDeckCode] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [hasJoined, setHasJoined] = useState(false); // NEW

  useEffect(() => {
    if (!socket) {
      socket = io(window.location.origin.replace(/^http/, "ws"));
      socket.on("connect", () => setSocketConnected(true));
      socket.on("disconnect", () => setSocketConnected(false));
      socket.on("roomUpdate", (data) => {
        setRoom(data);
      });
    }
  }, []);

  function createRoom() {
    if (!deckCode) return alert("Enter a deck code first!");
    socket.emit("createRoom", { deck: deckCode }, (res) => {
      if (res?.error) return alert(res.error);
      setRoom(res.room);
      setHasJoined(true); // NEW
    });
  }

  function joinRoom() {
    if (!deckCode || !roomCode) return alert("Enter both deck and room codes!");
    socket.emit("joinRoom", { roomId: roomCode, deck: deckCode }, (res) => {
      if (res?.error) return alert(res.error);
      setRoom(res.room);
      setHasJoined(true); // NEW
    });
  }

  function confirmCard(card) {
    if (!room) return;
    setSelectedCard(card);
    socket.emit("playerConfirm", { roomId: room.id, card }, (res) => {
      if (res?.error) return alert(res.error);
    });
  }

  // conditionally render join/create UI
  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-6">
        <h1 className="text-3xl font-bold mb-4">Match Setup</h1>
        <div className="flex flex-col gap-3 w-80">
          <input
            type="text"
            placeholder="Enter deck code"
            value={deckCode}
            onChange={(e) => setDeckCode(e.target.value)}
            className="p-2 rounded bg-gray-800 text-white border border-gray-700"
          />
          <button
            onClick={createRoom}
            className="p-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
          >
            Create Room
          </button>
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="p-2 rounded bg-gray-800 text-white border border-gray-700"
          />
          <button
            onClick={joinRoom}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // waiting state — only shown AFTER join/create
  if (!room || !socketConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Waiting for room data or connection...
      </div>
    );
  }

  const me = room?.me;
  const opponent = room?.opponent;

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gray-800 text-center text-xl font-bold border-b border-gray-700">
        Room: {room.id} | {me?.name ?? "You"} vs {opponent?.name ?? "Waiting..."}
      </div>

      {/* Engage Zone */}
      <div className="flex-1 flex flex-col justify-center items-center relative">
        <div className="w-full flex justify-center items-center relative border-y border-gray-700 py-8">
          {/* Player’s engage zone */}
          <div className="flex flex-col items-center">
            <div className="text-sm mb-2">{me?.name ?? "You"}</div>
            {room.engage?.[me?.id] ? (
              <img
                src={getCardArt(room.engage[me.id])}
                alt="your card"
                className="w-32 h-48 rounded shadow-lg"
              />
            ) : (
              <div className="w-32 h-48 rounded bg-gray-800 border border-gray-700 flex items-center justify-center">
                Select a card
              </div>
            )}
            {me?.divine && (
              <img
                src={getCardArt(me.divine)}
                alt="your divine"
                className="absolute right-[30%] w-24 h-24 rounded-full border-2 border-yellow-400"
              />
            )}
          </div>

          {/* Divider line */}
          <div className="h-64 border-l border-gray-700 mx-16" />

          {/* Opponent’s engage zone */}
          <div className="flex flex-col items-center">
            <div className="text-sm mb-2">{opponent?.name ?? "Opponent"}</div>
            {room.engage?.[opponent?.id] ? (
              <img
                src={getCardArt(room.engage[opponent.id])}
                alt="opponent card"
                className="w-32 h-48 rounded shadow-lg"
              />
            ) : (
              <div className="w-32 h-48 rounded bg-gray-800 border border-gray-700 flex items-center justify-center">
                Waiting...
              </div>
            )}
            {opponent?.divine && (
              <img
                src={getCardArt(opponent.divine)}
                alt="opponent divine"
                className="absolute left-[30%] w-24 h-24 rounded-full border-2 border-blue-400"
              />
            )}
          </div>
        </div>

        {/* Table Messages */}
        <div className="mt-6 w-3/4 bg-gray-800 rounded p-3 h-32 overflow-y-auto text-sm border border-gray-700">
          {room.table?.map((entry, i) => (
            <div key={i}>{entry.system}</div>
          ))}
        </div>

        {/* Player Hand (now below engage zone) */}
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          {me?.hand?.map((card) => (
            <div
              key={card}
              onClick={() => confirmCard(card)}
              className={`cursor-pointer transition-transform hover:scale-105 ${
                selectedCard === card ? "ring-2 ring-green-400" : ""
              }`}
            >
              <img
                src={getCardArt(card)}
                alt={card}
                className="w-24 h-36 rounded"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
