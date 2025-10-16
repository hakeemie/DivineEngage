import React, {useEffect, useState, useRef} from 'react'
import { io } from 'socket.io-client'
import { decodeDeck } from '../utils/base64.js'

let socket = null
export default function Play(){
  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState(null)
  const [deckCode, setDeckCode] = useState('')
  const [log, setLog] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const roomRef = useRef(null)

  useEffect(()=>{
    socket = io() // connect to same origin
    socket.on('connect', ()=> setConnected(true))
    socket.on('roomUpdate', r=>{ setRoom(r); roomRef.current = r; if(r && r.table){ const msgs = r.table.filter(t=>t.system).map(t=>t.system); if(msgs.length) setLog(l=>[...l,...msgs].slice(-200)); } })
    socket.on('roomLog', m=> setLog(l=>[...l,m].slice(-200)))
    return ()=>{ socket && socket.disconnect(); socket=null }
  },[])

  function createRoom(){
    const code = Math.random().toString(36).slice(2,7).toUpperCase()
    socket.emit('createRoomPrivate',{roomId:code}, (res)=>{ if(res.error) return alert(res.error); setLog(l=>[...l,'Room created: '+code]); setRoom({id:code}); })
  }
  function joinRoom(){
    if(!joinCode) return alert('Enter room code'); socket.emit('joinRoom',{roomId:joinCode}, (res)=>{ if(res.error) return alert(res.error); setLog(l=>[...l,'Joined room: '+joinCode]); })
  }

  function startBot(){
    if(!deckCode) return alert('Paste a deck code first (from deck builder)')
    const roomId = 'room_'+Math.random().toString(36).slice(2,8)
    socket.emit('createRoomWithDeck', {roomId, name:'Player', deckCode, mode:'ai'}, (res)=>{ if(res.error) alert(res.error); else setLog(l=>[...l, 'Match created: '+roomId]) })
  }

  function enterRoomWithDeck(){
    if(!deckCode) return alert('Paste your deck code')
    socket.emit('enterRoomWithDeck',{roomId: room.id, deckCode, name:'Player'}, (res)=>{ if(res.error) return alert(res.error); })
  }

  function selectCard(cardId){ setSelectedCard(cardId); setConfirmed(false) }
  function pressConfirm(){ if(!room) return; if(!selectedCard) return alert('Select a card first'); socket.emit('playerConfirm',{roomId:room.id, card:selectedCard}, (res)=>{ if(res.error) return alert(res.error); setConfirmed(true); }) }

  function playCard(cardId){ socket.emit('playCard',{roomId:room.id, cardId}) }

  const me = room && room.players ? room.players.find(p=>p.id === (socket && socket.id)) : null
  const opponent = room && room.players ? room.players.find(p=>p.id !== (socket && socket.id)) : null

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="button" onClick={createRoom}>Create Room</button>
          <input className="bg-slate-700 p-2 rounded" placeholder="Join code" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} />
          <button className="button" onClick={joinRoom}>Join Room</button>
          <div className="ml-4">or</div>
          <button className="button" onClick={startBot}>Play vs Bot</button>
        </div>
        <div>
          <input className="bg-slate-700 p-2 rounded mr-2" placeholder="Paste deck code here" value={deckCode} onChange={e=>setDeckCode(e.target.value)} />
          <button className="button" onClick={enterRoomWithDeck} disabled={!room}>Enter Room with Deck</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-9">
          <div className="card mb-4">
            <h3 className="text-lg">Opponent (Top)</h3>
            <div className="flex items-center justify-between">
              <div><strong>{opponent?opponent.name:'-'}</strong><br/>HP: {opponent?opponent.divineHP:'-'}</div>
              <div>Runes: {opponent?JSON.stringify(opponent.runes):'-'}</div>
            </div>
            <div className="mt-2 p-2 bg-slate-900 rounded min-h-[100px]">
              {room && room.table && room.table.map((t,i)=> <div key={i}>{t.system ? t.system : t.playerId + ' played ' + t.card}</div>)}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg">Your Play Area (Bottom)</h3>
            <div className="min-h-[120px] p-2 bg-slate-900 rounded mb-4">
              {me && me.hand && <div className="text-sm">Hand size: {me.hand.length}</div>}
            </div>
            <div className="flex gap-2 overflow-auto">
              {me && me.hand && me.hand.map(c=> (
                <div key={c} className={"p-2 rounded "+ (selectedCard===c ? 'ring-2 ring-indigo-400' : 'bg-slate-900')} onClick={()=>selectCard(c)}>
                  <div>{c}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button className="button" onClick={pressConfirm} disabled={!selectedCard || confirmed}>{confirmed ? 'Confirmed' : 'Confirm'}</button>
              <div className="text-sm text-slate-400">Select a card then Confirm. Both players must confirm to resolve the round.</div>
            </div>
          </div>
        </div>

        <div className="col-span-3">
          <div className="card mb-4">
            <h3 className="text-lg">Game State</h3>
            <div className="mt-2">
              <div className="mb-2"><strong>Your Divine HP:</strong> {me?me.divineHP:'-'}</div>
              <div className="mb-2"><strong>Your Runes:</strong>
                {me ? <span className="ml-2"><span className="rune">🔥 {me.runes?.fire||0}</span> <span className="rune">💧 {me.runes?.water||0}</span> <span className="rune">🌿 {me.runes?.grass||0}</span></span> : '-'}
              </div>
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
    </div>
  )
}
