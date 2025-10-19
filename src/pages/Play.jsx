import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { CARDS } from "../data/cards.js"; // use named import

const socket = io();

export default function Play() {
  const [room, setRoom] = useState(null);
  const [hand, setHand] = useState([]);
  const [engage, setEngage] = useState({});
  const [divine, setDivine] = useState({});
  const [status, setStatus] = useState("idle");
  const [selectedCard, setSelectedCard] = useState(null);
  const [pending, setPending] = useState(false);

  // --- card helper logic built in ---
  const getCardData = (id) => {
    if (!id) return null;
    const lowerId = id.toLowerCase();
    for (const school of Object.values(CARDS)) {
      const found = school.find((f) => f.id.toLowerCase() === lowerId);
      if (found) return found;
    }
    return null;
  };

  useEffect(() => {
    socket.on("roomUpdate", (data) => {
      setRoom(data);
      if (data?.you?.hand) setHand(data.you.hand);
      if (data?.engage) setEngage(data.engage);
      if (data?.you?.divine) setDivine(data.you.divine);
    });

    socket.on("connect", () => console.log("Connected to server"));
    socket.on("disconnect", () => setStatus("disconnected"));

    return () => {
      socket.off("roomUpdate");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  const handleJoin = (roomCode) => {
    if (!roomCode) return;
    socket.emit("joinRoom", { roomCode }, (res) => {
      if (res?.error) alert(res.error);
      else {
        setRoom(res.room);
        setStatus("joined");
      }
    });
  };

  const handlePlay = (card) => {
    if (!card || pending) return;
    setSelectedCard(card);
  };

  const handleConfirm = () => {
    if (!selectedCard) return;
    setPending(true);
    socket.emit("playerConfirm", { roomId: room?.id, card: selectedCard }, (res) => {
      if (res?.error) alert(res.error);
      else {
        setSelectedCard(null);
        setPending(false);
      }
    });
  };

  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <h1 className="text-3xl mb-4">Join a Room</h1>
        <input
          className="bg-white/10 border border-white/20 rounded p-2 text-white placeholder-white/50"
          placeholder="Enter Room Code"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleJoin(e.target.value);
          }}
        />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Waiting for room data or connection...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start h-screen text-white bg-black">
      {/* Engage Zone */}
      <div className="w-full flex justify-center items-center mt-10 relative border-b border-white/10 pb-6">
        <div className="flex items-center space-x-10">
          {/* Your Engage Card */}
          {engage[room?.you?.id] ? (
            <div className="text-center">
              <p className="text-sm mb-2 text-white/70">Your Engage</p>
              <img
                src={getCardData(engage[room.you.id])?.image}
                alt={engage[room.you.id]}
                className="w-32 h-48 object-cover border border-white/20 rounded"
              />
            </div>
          ) : (
            <div className="w-32 h-48 border border-dashed border-white/20 rounded flex items-center justify-center text-white/40">
              No Engage
            </div>
          )}

          {/* Divine Icon beside your card */}
          {divine && (
            <div className="flex flex-col items-center justify-center">
              <p className="text-sm mb-2 text-white/70">Your Divine</p>
              <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center bg-white/10">
                <span className="text-lg">✦</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hand */}
      <div className="w-full flex justify-center mt-6 space-x-3">
        {hand.length > 0 ? (
          hand.map((c) => (
            <img
              key={c}
              src={getCardData(c)?.image}
              alt={c}
              onClick={() => handlePlay(c)}
              className={`w-24 h-36 object-cover rounded border transition-all cursor-pointer ${
                selectedCard === c
                  ? "border-white scale-105"
                  : "border-transparent hover:border-white/40"
              }`}
            />
          ))
        ) : (
          <p className="text-white/40">No cards in hand</p>
        )}
      </div>

      {/* Confirm Button */}
      {selectedCard && (
        <button
          onClick={handleConfirm}
          disabled={pending}
          className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/40 rounded text-white"
        >
          {pending ? "Confirming..." : "Confirm"}
        </button>
      )}
    </div>
  );
}

