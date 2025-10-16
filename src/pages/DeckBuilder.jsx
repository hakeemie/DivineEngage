import React, { useEffect, useState } from 'react'
import { encode as b64encode } from '../utils/base64'
export default function DeckBuilder(){
  const [cards, setCards] = useState(null)
  const [divine, setDivine] = useState('')
  const [selected, setSelected] = useState({}) // id -> true
  useEffect(()=>{ fetch('/cards/cards.json').then(r=>r.json()).then(j=>{ setCards(j); if(j.divines[0]) setDivine(j.divines[0].id) }) },[])
  if(!cards) return <div className="card">Loading cards...</div>

  const followers = cards.followers
  const byElement = { fire:[], water:[], grass:[] }
  followers.forEach(f=> byElement[f.element].push(f))

  function toggle(id){
    setSelected(s=>{ const ns={...s}; if(ns[id]) delete ns[id]; else ns[id]=true; return ns })
  }
  function generate(){
    const sel = Object.keys(selected)
    if(sel.length !== 15) return alert('Select exactly 15 followers (currently '+sel.length+')')
    const arr = [divine].concat(sel)
    const code = b64encode(arr.join(','))
    prompt('Deck code — copy this to reuse:', code)
  }
  return (
    <div>
      <div className="card mb-4">
        <h2 className="text-xl">Deck Builder</h2>
        <div className="mt-2">Select Divine: <select value={divine} onChange={e=>setDivine(e.target.value)} className="ml-2 bg-slate-700 p-1 rounded">{cards.divines.map(d=> <option key={d.id} value={d.id}>{d.name} ({d.element})</option>)}</select></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {['fire','water','grass'].map(el=> (
          <div key={el} className="card">
            <h3 className="font-bold mb-2">{el.toUpperCase()}</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {byElement[el].map(c=> (
                <div key={c.id} className="p-2 bg-slate-900 rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{c.name} <span className="text-xs ml-2">({c.attack||0})</span></div>
                    {c.ability ? <div className="text-xs text-indigo-200">Ability: {c.ability.type} {c.ability.amount || ''} {c.ability.cost && Object.keys(c.ability.cost).length ? ('— cost: '+Object.entries(c.ability.cost).map(([k,v])=>k+v).join(',')) : ''}</div> : <div className="text-xs text-slate-400">No ability</div>}
                  </div>
                  <div>
                    <input type="checkbox" checked={!!selected[c.id]} onChange={()=>toggle(c.id)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        <h3 className="font-bold">Deck Preview</h3>
        <div>Divine: {divine}</div>
        <div>Selected followers: {Object.keys(selected).length} / 15</div>
        <div className="mt-2">
          <button className="button" onClick={generate}>Generate Deck Code</button>
        </div>
      </div>
    </div>
  )
}
