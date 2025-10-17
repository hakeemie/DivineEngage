import React, {useState} from 'react'
import cardsData from '../data/cards.js'
import { encodeDeck } from '../utils/base64.js'

export default function DeckBuilder(){
  const cards = cardsData
  const [divine, setDivine] = useState(cards.divines[0].id)
  const [selected, setSelected] = useState({})

 function getElementFromImage(imgPath){
    if(!imgPath) return 'fire'
    const name = imgPath.split('/').pop().toLowerCase()
    if(name.startsWith('f')) return 'fire'
    if(name.startsWith('g')) return 'grass'
    if(name.startsWith('w')) return 'water'
    // fallback to provided element metadata
    return null
  }

const DeckBuilder = () => {
  const [cards, setCards] = useState([]);
  const [categorizedCards, setCategorizedCards] = useState({
    Fire: [],
    Water: [],
    Grass: [],
  });
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch("/cards/cards.json");
        const data = await response.json();

        // Categorize cards by ID prefix
        const categories = {
          Fire: [],
          Water: [],
          Grass: [],
        };

        data.forEach((card) => {
          const id = card.id?.toLowerCase() || "";

          if (id.startsWith("f")) {
            categories.Fire.push(card);
          } else if (id.startsWith("g")) {
            categories.Grass.push(card);
          } else if (id.startsWith("w")) {
            categories.Water.push(card);
          }
        });

        setCards(data);
        setCategorizedCards(categories);
      } catch (err) {
        console.error("Error loading cards:", err);
      }
    };

    fetchCards();
  }, []);

  const toggleSelect = (cardId) => {
    setSelectedCards((prevSelected) =>
      prevSelected.includes(cardId)
        ? prevSelected.filter((id) => id !== cardId)
        : [...prevSelected, cardId]
    );
  };

  const saveDeck = () => {
    const deck = cards.filter((card) => selectedCards.includes(card.id));
    localStorage.setItem("playerDeck", JSON.stringify(deck));
    alert("Deck saved!");
  };

  return (
    <div className="flex gap-4 p-4">
      {Object.entries(categorizedCards).map(([type, typeCards]) => (
        <div key={type} className="w-1/3 bg-gray-900 rounded-lg p-4">
          <h2 className="text-white font-bold mb-2">{type}</h2>
          <div className="grid grid-cols-2 gap-4">
            {typeCards.map((card) => (
              <div
                key={card.id}
                onClick={() => toggleSelect(card.id)}
                className={`cursor-pointer p-1 rounded-lg border ${
                  selectedCards.includes(card.id)
                    ? "border-yellow-400"
                    : "border-transparent"
                }`}
              >
                <img
                  src={`/cards/${card.image}`}
                  alt={card.name}
                  className="rounded-md"
                />
                <div className="text-white text-sm mt-1">
                  <strong>{card.name}</strong>
                  <br />
                  ATK {card.atk}
                  {card.effect && <>, {card.effect}</>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col justify-center">
        <button
          onClick={saveDeck}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Save Deck
        </button>
      </div>
    </div>
  );
};

export default DeckBuilder;
