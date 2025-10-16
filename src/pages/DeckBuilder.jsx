import React, {useState} from 'react'
import cardsData from '../data/cards.js'
import { encodeDeck } from '../utils/base64.js'

export default function DeckBuilder(){
  const cards = cardsData
  const [divine, setDivine] = useState(cards.divines[0].id)
  const [selected, setSelected] = useState({})

  const byElement = { fire:[], water:[], grass:[] }
  cards.followers.forEach(f=> byElement[f.element].push(f))

  function toggle(id){
    setSelected(s=>{ const ns={...s}; if(ns[id]) delete ns[id]; else ns[id]=true; return ns })
  }
  function generate(){
    const sel = Object.keys(selected)
    if(sel.length !== 15){ alert('Select exactly 15 followers (currently '+sel.length+')'); return }
    const arr = [divine].concat(sel)
    const code = encodeDeck(arr)
    prompt('Deck code (copy to reuse):', code)
  }

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl">Deck Builder</h2>
          <div className="mt-1">Select Divine:
            <select className="ml-2 bg-slate-700 p-1 rounded" value={divine} onChange={e=>setDivine(e.target.value)}>
              {cards.divines.map(d=> <option key={d.id} value={d.id}>{d.name} ({d.element})</option>)}
            </select>
          </div>
        </div>
        <div>
          <button className="button" onClick={generate}>Generate Deck Code</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {['fire','water','grass'].map(el=> (
          <div key={el} className="card">
            <h3 className="font-bold mb-2">{el.toUpperCase()}</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {byElement[el].map(c=> (
                <div key={c.id} className="p-2 bg-slate-900 rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{c.name} <span className="text-xs ml-2">({c.attack})</span></div>
                    {c.abilities && c.abilities.length>0 ? <div className="text-xs text-indigo-200">Ability: {c.abilities.map(a=>a.type).join(', ')}</div> : <div className="text-xs text-slate-400">No ability</div>}
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
    </div>
  )
}
