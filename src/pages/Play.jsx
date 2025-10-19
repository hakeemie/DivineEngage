import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import cardsData from "../data/cards.js";

const socket = io({ transports: ["websocket"] });

// -----------------------------
// Local Card Helpers (no utils file needed)
// -----------------------------

/** Find a card by ID */
function findCard(cardId) {
  if (!cardId) return null;

  // merge divines and followers for lookup
  const divines = Array.isArray(cardsData.divines) ? cardsData.divines : [];
  const followersGroups = cardsData.followers || {};
  const allFollowers = Object.values(followersGroups).flat();

  const allCards = [...divines, ...allFollowers];
  return allCards.find((c) => c.id === cardId) || null;
}

/** Return card art or fallback image */
function getCardArt(cardId) {
  const card = findCard(cardId);
  if (card && card.art) return card.art;
  return "/assets/cards/default.png"; // fallback placeholder
}

// -----------------------------
// Play Page Component
// -----------------------------

export default function Play() {
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState("Connecting...");
  const [selectedCard, setSelectedCard] = useState(null);
  const [hand, setHand] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // ✅ only show "waiting" after a room actually exists
  const showWaiting = !room && status === "Waiting for room data or connection...";

  useEffect(() => {
    setPlayerId(socket.id);

    socket.on("connect", () => {
      setStatus("Connected to server");
    });

    socket.on("roomUpdate", (data) => {
      setRoom(data);
      setStatus("In room");
    });

    socket.on("errorMsg", (msg) => {
      console.error(msg);
      setStatus(msg);
    });

    socket.on("roomCreated", ({ roomId }) => {
      setStatus(`Room ${roomId} created`);
    });

    return () => {
      socket.off("connect");
      socket.off("roomUpdate");
      socket.off("errorMsg");
      socket.off("roomCreated");
    };
  }, []);

  const handleSelectCard = (cardId) => {
    setSelectedCard((prev) => (prev === cardId ? null : cardId));
  };

  const handleConfirm = () => {
    if (!room || !selectedCard) return;
    setConfirming(true);

    socket.emit(
      "playerConfirm",
      { roomId: room.id, card: selectedCard },
      (res) => {
        setConfirming(false);
        if (res?.error) setStatus(`Error: ${res.error}`);
        else setSelectedCard(null);
      }
    );
  };

  // -----------------------------
  // UI Sections
  // -----------------------------

  if (!room)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white bg-gray-900">
        <p className="text-xl font-semibold">
          {status === "Connecting..." ? status : "Waiting for room data or connection..."}
        </p>
      </div>
    );

  const player = room.players?.find((p) => p.id === playerId);
  const opponent = room.players?.find((p) => p.id !== playerId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-950 text-white flex flex-col items-center">
      <h1 className="text-2xl mt-4 mb-2 font-bold">Battle Arena</h1>
      <p className="text-gray-400 mb-4">{status}</p>

      <div className="flex flex-col items-center space-y-6 w-full max-w-5xl">
        {/* Opponent section */}
        {opponent && (
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-semibold">{opponent.name || "Opponent"}</h2>
            <p className="text-sm text-gray-400 mb-2">
              HP: {opponent.divineHP ?? "?"}
            </p>
            <img
              src={getCardArt(opponent.divine)}
              alt="Opponent Divine"
              className="h-40 rounded-lg border border-gray-600 shadow-lg"
            />
          </div>
        )}

        {/* Battle log */}
        <div className="w-full max-h-48 overflow-y-auto bg-gray-800/70 p-4 rounded-lg shadow-inner text-sm">
          {room.table?.length > 0 ? (
            room.table.map((entry, idx) => (
              <div key={idx} className="text-gray-200">
                {entry.system || JSON.stringify(entry)}
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">No events yet...</div>
          )}
        </div>

        {/* Player section */}
        {player && (
          <div className="flex flex-col items-center space-y-3">
            <h2 className="text-lg font-semibold">{player.name || "You"}</h2>
            <p className="text-sm text-gray-400 mb-2">
              HP: {player.divineHP ?? "?"}
            </p>
            <img
              src={getCardArt(player.divine)}
              alt="Your Divine"
              className="h-40 rounded-lg border border-gray-600 shadow-lg"
            />
          </div>
        )}

        {/* Player hand */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {player?.hand?.length ? (
            player.hand.map((cardId) => (
              <div
                key={cardId}
                onClick={() => handleSelectCard(cardId)}
                className={`cursor-pointer border-2 rounded-lg transition-transform duration-200 ${
                  selectedCard === cardId
                    ? "border-yellow-400 scale-110"
                    : "border-gray-700 hover:scale-105"
                }`}
              >
                <img
                  src={getCardArt(cardId)}
                  alt={cardId}
                  className="h-32 w-24 object-cover rounded-md"
                />
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">No cards in hand</div>
          )}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedCard || confirming}
          className={`mt-4 px-6 py-2 rounded-lg font-semibold transition ${
            !selectedCard || confirming
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-yellow-500 hover:bg-yellow-400 text-black"
          }`}
        >
          {confirming ? "Confirming..." : "Confirm Card"}
        </button>
      </div>
    </div>
  );
}
