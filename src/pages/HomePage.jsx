import React from 'react'
export default function HomePage(){
  return (
    <div className="card">
      <h2 className="text-2xl mb-2">Welcome to Divine Engage</h2>
      <p className="mb-4">Create decks, learn the tutorial, and play against the bot.</p>
      <p>Quick links:</p>
      <ul className="list-disc ml-6">
        <li>Deck Builder — create and export deck codes</li>
        <li>Play — join or create matches</li>
        <li>Tutorial — play a guided match vs bot</li>
      </ul>
    </div>
  )
}
