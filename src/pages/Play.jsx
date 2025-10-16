import React, {useEffect, useState, useRef} from 'react'
import { io } from 'socket.io-client'

let socket = null
export default function Play(){
  const [room, setRoom] = useState(null)
  const [deckCode, setDeckCode] = useState('')
  const [log, setLog] = useState([])
  const roomRef = useRef(null)

  useEffect(()=>{
    socket = io() // connect to same origin
    socket.on('roomUpdate', r=>{ setRoom(r); roomRef.current = r; if(r && r.table){ const msgs = r.table.filter(t=>t.system).map(t=>t.system); if(msgs.length) setLog(l=>[...l,...msgs].slice(-200)); } })
    socket.on('connect', ()=> console.log('connected', socket.id))
    return ()=>{ socket && socket.disconnect(); socket=null }
  },[])

  function startBot(){
    if(!deckCode) return alert('Paste a deck code first (from deck builder)')
    const roomId = 'room_'+Math.random().toString(36).slice(2,8)
    socket.emit('createRoomWithDeck', {roomId, name:'Player', deckCode, mode:'ai'}, (res)=>{ if(res.error) alert(res.error); else setLog(l=>[...l, 'Match created: '+roomId]) })
  }

  function draw(){ if(!room) return socket.emit('drawFromDeck',{roomId:room.id}) }
  function mulligan(){ if(!room) return socket.emit('mulligan',{roomId:room.id}) }
  function playCard(cardId){ if(!room) return socket.emit('playCard',{roomId:room.id, cardId}) }

  const me = room && room.players ? room.players.find(p=>p.id === (socket && socket.id)) : null
  const opponent = room && room.players ? room.players.find(p=>p.id !== (socket && socket.id)) : null

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-9">
        <div className="card mb-4 flex items-center justify-between">
          <div>
            <input className="bg-slate-700 p-2 rounded mr-2" placeholder="Paste deck code here" value={deckCode} onChange={e=>setDeckCode(e.target.value)} />
            <button className="button" onClick={startBot}>Play vs Bot</button>
          </div>
        </div>

        <div className="card mb-4">
          <h3 className="text-lg">Opponent (Top)</h3>
          <div className="flex items-center justify-between">
            <div><strong>{opponent?opponent.name:'-'}</strong><br/>HP: {opponent?opponent.divineHP:'-'}</div>
            <div>Runes: {opponent?JSON.stringify(opponent.runes):'-'}</div>
          </div>
          <div className="mt-2 p-2 bg-slate-900 rounded min-h-[100px]">
            {room && room.table.map((t,i)=> <div key={i}>{t.system ? t.system : t.playerId + ' played ' + t.card}</div>)}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg">Your Play Area (Bottom)</h3>
          <div className="min-h-[120px] p-2 bg-slate-900 rounded mb-4">
            {me && me.hand && <div className="text-sm">Hand size: {me.hand.length}</div>}
          </div>
          <div className="flex gap-2 overflow-auto">
            {me && me.hand && me.hand.map(c=> (
              <div key={c} className="p-2 bg-slate-900 rounded">
                <div>{c}</div>
                <button className="button mt-2" onClick={()=>playCard(c)}>Play</button>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <button className="button mr-2" onClick={draw}>Draw</button>
            <button className="button" onClick={mulligan}>Mulligan</button>
          </div>
        </div>
      </div>

      <div className="col-span-3">
        <div className="card mb-4">
          <h3 className="text-lg">Game State</h3>
          <div className="mt-2">
            <div className="mb-2"><strong>Your Divine HP:</strong> {me?me.divineHP:'-'}</div>
            <div className="mb-2"><strong>Your Runes:</strong> {me?JSON.stringify(me.runes):'-'}</div>
            <div className="mb-2"><strong>Your Hand Size:</strong> {me?me.hand.length:'-'}</div>
            <div className="mb-2"><strong>Deck Counts:</strong> {room?JSON.stringify(room.deckCounts):'-'}</div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg">Turn History</h3>
          <div className="max-h-96 overflow-auto space-y-2">
            {log.length===0 && <div className="text-slate-400">No actions yet</div>}
            {log.map((l,i)=> <div key={i} className="p-2 rounded">{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}
