import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DeckBuilder from './pages/DeckBuilder'
import GamePage from './pages/GamePage'
import TutorialPage from './pages/TutorialPage'

export default function App(){{
  return (
    <div className="container py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Divine Engage</h1>
        <nav className="space-x-4">
          <Link to="/" className="text-indigo-300">Home</Link>
          <Link to="/deckbuilder" className="text-indigo-300">Deck Builder</Link>
          <Link to="/game" className="text-indigo-300">Play</Link>
          <Link to="/tutorial" className="text-indigo-300">Tutorial</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage/>} />
          <Route path="/deckbuilder" element={<DeckBuilder/>} />
          <Route path="/game" element={<GamePage backendUrl="https://divineengage.onrender.com" />} />
          <Route path="/tutorial" element={<TutorialPage/>} />
        </Routes>
      </main>
    </div>
  )
}}
