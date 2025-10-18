// src/pages/DeckBuilder.jsx
import React, { useState, useEffect } from "react";
import { CARDS as cardsData } from "../data/cards.js";
import { encodeDeck } from "../utils/base64.js";

export default function DeckBuilder() {
  const [selectedDivine, setSelectedDivine] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [deckCode, setDeckCode] = useState("");

// Use followers array directly
const allFollowers = cardsData.followers || [];

// Filter followers by element (based on "element" key)
const fireCards = allFollowers.filter((c) => c.element === "fire");
const waterCards = allFollowers.filter((c) => c.element === "water");
const grassCards = allFollowers.filter((c) => c.element === "grass");

  // Selection logic
  const toggleCard = (cardId) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter((id) => id !== cardId));
    } else if (selectedCards.length < 15) {
      setSelectedCards([...selectedCards, cardId]);
    } else {
      alert("You can only select 15 follower cards!");
    }
  };

  const selectDivine = (id) => {
    setSelectedDivine(id);
  };

  const generateDeckCode = () => {
    if (!selectedDivine) return alert("Select a Divine first!");
    if (selectedCards.length !== 15)
      return alert(`You must select exactly 15 followers. You currently have ${selectedCards.length}.`);
    const combined = [selectedDivine, ...selectedCards];
    const encoded = encodeDeck(combined);
    setDeckCode(encoded);
  };

  useEffect(() => {
    if (deckCode) {
      navigator.clipboard.writeText(deckCode);
    }
  }, [deckCode]);

  const renderCard = (card, isSelected, onClick) => (
    <div
      key={card.id}
      onClick={onClick}
      style={{
        width: 100,
        margin: "4px auto",
        cursor: "pointer",
        border: isSelected ? "3px solid white" : "2px solid transparent",
        borderRadius: 8,
      }}
    >
      <img
        src={card.image}
        alt={card.name}
        style={{
          width: "100%",
          borderRadius: 6,
          height: 140,
          objectFit: "cover",
        }}
      />
      <div style={{ textAlign: "center", marginTop: 4 }}>
        <strong>{card.name}</strong>
        <div style={{ fontSize: 12 }}>{card.stats}</div>
      </div>
    </div>
  );

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Deck Builder</h1>

      {/* DIVINES */}
      <h2 className="text-xl font-semibold mb-2">Select Your Divine (1)</h2>
      <div className="flex flex-wrap gap-4 mb-8">
        {divines.map((divine) => (
          <div key={divine.id}>
            {renderCard(divine, selectedDivine === divine.id, () => selectDivine(divine.id))}
          </div>
        ))}
      </div>

      {/* FOLLOWERS */}
      <h2 className="text-xl font-semibold mb-2">Select Your Followers (15)</h2>
      <div className="grid grid-cols-3 gap-6">
        {/* FIRE */}
        <div className="card p-2 rounded-lg bg-slate-900">
          <h3 className="text-lg font-bold text-center mb-2">FIRE</h3>
          <div className="grid grid-cols-2 gap-2">
            {fireCards.slice(0, 18).map((card) =>
              renderCard(card, selectedCards.includes(card.id), () => toggleCard(card.id))
            )}
          </div>
        </div>

        {/* WATER */}
        <div className="card p-2 rounded-lg bg-slate-900">
          <h3 className="text-lg font-bold text-center mb-2">WATER</h3>
          <div className="grid grid-cols-2 gap-2">
            {waterCards.slice(0, 18).map((card) =>
              renderCard(card, selectedCards.includes(card.id), () => toggleCard(card.id))
            )}
          </div>
        </div>

        {/* GRASS */}
        <div className="card p-2 rounded-lg bg-slate-900">
          <h3 className="text-lg font-bold text-center mb-2">GRASS</h3>
          <div className="grid grid-cols-2 gap-2">
            {grassCards.slice(0, 18).map((card) =>
              renderCard(card, selectedCards.includes(card.id), () => toggleCard(card.id))
            )}
          </div>
        </div>
      </div>

      {/* DECK SUMMARY */}
      <div className="mt-8 card p-4 bg-slate-900 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Your Deck</h3>
        <p>
          <strong>Divine:</strong>{" "}
          {selectedDivine ? selectedDivine : <span className="text-gray-400">None</span>}
        </p>
        <p>
          <strong>Followers:</strong> {selectedCards.length} / 15
        </p>
        <button
          onClick={generateDeckCode}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
        >
          Generate Deck Code
        </button>
        {deckCode && (
          <div className="mt-4">
            <p className="font-mono break-all bg-black/30 p-2 rounded-lg">{deckCode}</p>
            <p className="text-sm text-gray-400">(Copied to clipboard automatically)</p>
          </div>
        )}
      </div>
    </div>
  );
}
