import React from 'react'
export default function Tutorial(){
  return (
    <div className="card">
      <h2 className="text-2xl mb-2">Tutorial</h2>
      <ol className="list-decimal ml-6">
        <li>Build a deck in Deck Builder and copy the deck code.</li>
        <li>Go to Play and paste the deck code, then Play vs Bot.</li>
        <li>Draw and play cards. Abilities without cost trigger on play. Costed abilities require activation.</li>
      </ol>
    </div>
  )
}
