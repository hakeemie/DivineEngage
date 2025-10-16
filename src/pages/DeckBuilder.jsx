import React, {useState} from 'react'
import cardsData from '../data/cards.js'
import { encodeDeck } from '../utils/base64.js'
export default function DeckBuilder(){
  const cards = cardsData
  const [divine, setDivine] = useState(cards.divines[0].id)
  const [selected, setSelected] = useState({})
  const byElement = { fire:[], water:[], grass:[] }
  cards.followers.forEach(f=> byElement[f.element].push(f))
  function toggle(id){ setSelected(s=>{ const ns={...s}; if(ns[id]) delete ns[id]; else ns[id]=true; return ns }) }
  function generate(){ const sel = Object.keys(selected); if(sel.length !== 15){ alert('Select exactly 15 followers (currently '+sel.length+')'); return } const arr = [divine].concat(sel); const code = encodeDeck(arr); prompt('Deck code (copy to reuse):', code) }
  return (<div><div className='card' style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h2>Deck Builder</h2><div>Select Divine: <select value={divine} onChange={e=>setDivine(e.target.value)}>{cards.divines.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}</select></div></div><div><button className='button' onClick={generate}>Generate Deck Code</button></div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:12}}>{['fire','water','grass'].map(el=> (<div key={el} className='card'><h3>{el.toUpperCase()}</h3><div style={{maxHeight:320,overflow:'auto'}}>{byElement[el].map(c=> (<div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:6}}><div style={{display:'flex',alignItems:'center',gap:8}}><img src={c.image} alt='' style={{width:48,height:64,objectFit:'cover'}} /><div><div style={{fontWeight:600}}>{c.name} <small>({c.attack})</small></div><div style={{fontSize:12,color:'#9ca3af'}}>{c.abilities && c.abilities.length>0 ? 'Ability: '+c.abilities.map(a=>a.type).join(', ') : 'No ability'}</div></div></div><div><input type='checkbox' checked={!!selected[c.id]} onChange={()=>toggle(c.id)} /></div></div>))}</div></div>))}</div></div>)
}
