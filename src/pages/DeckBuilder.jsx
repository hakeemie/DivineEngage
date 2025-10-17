import React, {useState} from 'react'
import cardsData from '../data/cards.js'
import { encodeDeck } from '../utils/base64.js'

export default function DeckBuilder(){
  const cards = cardsData
  const [divine, setDivine] = useState(cards.divines[0].id)
  const [selected, setSelected] = useState({})

  // derive element from image filename if needed (support f#/g#/w#)
  function getElementFromImage(imgPath){
    if(!imgPath) return 'fire'
    const name = imgPath.split('/').pop().toLowerCase()
    if(name.startsWith('f')) return 'fire'
    if(name.startsWith('g')) return 'grass'
    if(name.startsWith('w')) return 'water'
    // fallback to provided element metadata
    return null
  }

  const byElement = { fire:[], water:[], grass:[] }
  cards.followers.forEach(f=> {
    const elFromImg = getElementFromImage(f.image)
    const el = elFromImg || f.element || 'fire'
    byElement[el].push(f)
  })

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
      <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h2>Deck Builder</h2>
          <div className="small">Select Divine:
            <select className="ml-2" value={divine} onChange={e=>setDivine(e.target.value)}>
              {cards.divines.map(d=> <option key={d.id} value={d.id}>{d.name} ({d.element})</option>)}
            </select>
          </div>
        </div>
        <div>
          <button className="button" onClick={generate}>Generate Deck Code</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:12}}>
        {['fire','water','grass'].map(el=> (
          <div key={el} className="card">
            <h3>{el.toUpperCase()}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
              {byElement[el].map(c=> (
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,justifyContent:'space-between',padding:6}}>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <img src={c.image} alt="" style={{width:56,height:80,objectFit:'cover',borderRadius:6}} />
                    <div>
                      <div style={{fontWeight:700}}>{c.name}</div>
                      <div className="small">ATK {c.attack} {c.abilities && c.abilities.length>0 ? '| ' + c.abilities.map(a=>a.type).join(', ') : ''}</div>
                    </div>
                  </div>
                  <div><input type="checkbox" checked={!!selected[c.id]} onChange={()=>toggle(c.id)} /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
