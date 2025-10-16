import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import DeckBuilder from './pages/DeckBuilder.jsx'
import Play from './pages/Play.jsx'
import Tutorial from './pages/Tutorial.jsx'

export default function App(){
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Divine Engage</h1>
        <nav className="space-x-4">
          <Link to="/" className="text-indigo-300">Home</Link>
          <Link to="/deckbuilder" className="text-indigo-300">Deck Builder</Link>
          <Link to="/play" className="text-indigo-300">Play</Link>
          <Link to="/tutorial" className="text-indigo-300">Tutorial</Link>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto">
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/deckbuilder" element={<DeckBuilder/>} />
          <Route path="/play" element={<Play/>} />
          <Route path="/tutorial" element={<Tutorial/>} />
        </Routes>
      </main>
    </div>
  )
}
