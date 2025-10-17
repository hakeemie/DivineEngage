import React, {useEffect, useState, useRef} from 'react'
import { io } from 'socket.io-client'
import { decodeDeck } from '../utils/base64.js'
import cardsData from '../data/cards.js'

let socket = null
export default function Play(){
  const [room, setRoom] = useState(null)
  const [deckCode, setDeckCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [log, setLog] = useState([])
  const meId = useRef(null)

  useEffect(()=>{
    socket = io()
    socket.on('connect', ()=> meId.current = socket.id)
    socket.on('roomUpdate', r=> setRoom(r))
    socket.on('roomCreated', d=> setLog(l=>[...l,'Room created '+d.roomId]))
    socket.on('gameStart', d=> setLog(l=>[...l,d.message]))
    socket.on('roomUpdate', r=> setRoom(r))
    socket.on('gameOver', g=> setLog(l=>[...l,'Game Over: '+JSON.stringify(g)]))
    socket.on('roomLog', m=> setLog(l=>[...l,m]))
    return ()=> { socket && socket.disconnect(); socket = null }
  },[])

  function createRoom(){
    if(!deckCode) return alert('Paste deck code first')
    const arr = decodeDeck(deckCode)
    if(!arr || arr.length!==16) return alert('Invalid deck code (must be 16 entries: 1 divine + 15 followers)')
    const divine = arr[0]; const followers = arr.slice(1)
    const roomId = Math.random().toString(36).slice(2,7).toUpperCase()
    socket.emit('createRoom', { roomId, deck: followers, divine })
    setRoom({ id: roomId })
  }
  function joinRoom(){ if(!deckCode) return alert('Paste deck code first'); if(!joinCode) return alert('Enter room id'); const arr = decodeDeck(deckCode); if(!arr || arr.length!==16) return alert('Invalid deck code'); socket.emit('joinRoom', { roomId: joinCode, deck: arr.slice(1), divine: arr[0] }) }
  function startBot(){ if(!deckCode) return alert('Paste deck code first'); socket.emit('createRoomWithDeck', { roomId: 'bot_'+Math.random().toString(36).slice(2,8), name:'Player', deckCode }) }
  function selectCard(c){ setSelectedCard(c); setConfirmed(false) }
  function confirm(){ if(!selectedCard) return alert('Select a card'); socket.emit('playerConfirm', { roomId: room.id, card: selectedCard }, (res)=>{ if(res && res.error) alert(res.error); else setConfirmed(true) }) }

  const me = room && room.players ? room.players.find(p=>p.id===socket?.id) : null
  const opponent = room && room.players ? room.players.find(p=>p.id!==socket?.id) : null
  function getCardInfo(id){ return cardsData.followers.find(f=>f.id===id) || cardsData.divines.find(d=>d.id===id) || {name:id, image:'/cards/placeholder.png'} }

  // Determine pending selections separately
  const pendingMap = {}
  if(room && room.players){
    room.players.forEach(p=>{ if(p.pending) pendingMap[p.id]=p.pending })
  }

  // handle matchOutcome overlay and alerts
  useEffect(()=>{
    if(room && room.matchOutcome){
      const isWinner = room.matchOutcome.winner === socket?.id
      if(isWinner) alert('You won! Opponent divine fell below 1 HP.'); else alert('You lost! Your divine fell below 1 HP.');
    }
  }, [room && room.matchOutcome])

  return (<div>
    <div className='card' style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{display:'flex',gap:8}}>
        <button className='button' onClick={createRoom}>Create Room (deck required)</button>
        <input placeholder='Join code' value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} />
        <button className='button' onClick={joinRoom}>Join Room</button>
        <div style={{marginLeft:12}}>or</div>
        <button className='button' onClick={startBot}>Play vs Bot</button>
      </div>
      <div><input placeholder='Paste deck code here' value={deckCode} onChange={e=>setDeckCode(e.target.value)} style={{width:320}} /></div>
    </div>

    <div className='card' style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginTop:12}}>
      {/* Opponent Divine */}
      <div className='divine-box card'>
        <div className='small'>Opponent Divine</div>
        {opponent && <img src={getCardInfo(opponent.divine).image} alt='' className='card-img'/>}
        <div style={{marginTop:8,fontWeight:700}}>{opponent? getCardInfo(opponent.divine).name : '-'}</div>
        <div className='small' style={{marginTop:6}}>HP: {opponent?opponent.divineHP:'-'}</div>
        <div className='small'>Runes: {opponent? `🔥${opponent.runes.fire||0} 💧${opponent.runes.water||0} 🌿${opponent.runes.grass||0}` : '-'}</div>
      </div>

      {/* Opponent's card then Your card in center */}
      <div style={{flex:1,marginLeft:12,marginRight:12}} className='card'>
        <div className='engage-zone'>
          {/* Opponent card: show pending? reveal only if engage present */}
          <div style={{textAlign:'center'}}>
            <div className='small'>Opponent Card</div>
            {opponent && opponent.engage ? <img src={getCardInfo(opponent.engage).image} className='card-img'/> : (pendingMap[opponent?.id] ? <div className='card-img'/> : <div className='card-img'/>)}
            <div className='small' style={{marginTop:8}}>{opponent && (opponent.engage ? getCardInfo(opponent.engage).name : '')}</div>
          </div>

          <div style={{textAlign:'center'}}><div className='small'>Engage Zone</div><div className='small'>Cards clash here</div></div>

          {/* Your card */}
          <div style={{textAlign:'center'}}>
            <div className='small'>Your Card</div>
            {/* show your pending if any, else show engage if revealed */}
            {me && (me.engage ? <img src={getCardInfo(me.engage).image} className='card-img'/> : (pendingMap[me?.id] ? <img src={getCardInfo(pendingMap[me.id]).image} className='card-img selected'/> : <div className='card-img'/>))}
            <div className='small' style={{marginTop:8}}>{me && (me.engage ? getCardInfo(me.engage).name : (pendingMap[me?.id] ? getCardInfo(pendingMap[me.id]).name : ''))}</div>
          </div>
        </div>
      </div>

      {/* Your Divine */}
      <div className='divine-box card'>
        <div className='small'>Your Divine</div>
        {me && <img src={getCardInfo(me.divine).image} alt='' className='card-img'/>}
        <div style={{marginTop:8,fontWeight:700}}>{me? getCardInfo(me.divine).name : '-'}</div>
        <div className='small' style={{marginTop:6}}>HP: {me?me.divineHP:'-'}</div>
        <div className='small'>Runes: {me? `🔥${me.runes.fire||0} 💧${me.runes.water||0} 🌿${me.runes.grass||0}` : '-'}</div>
      </div>
    </div>

    <div className='card' style={{marginTop:12}}>
      <h3>Your Hand</h3>
      <div className='hand' style={{marginTop:8}}>
        {me && me.hand && me.hand.map(c=> { const ci = getCardInfo(c); const isSelected = selectedCard===c || (room && room.pending && room.pending[socket?.id]===c); return (<div key={c} style={{width:120,textAlign:'center'}} onClick={()=>selectCard(c)}><img src={ci.image} style={{width:120,height:160, outline: isSelected ? '3px solid white' : 'none'}} /><div style={{marginTop:6,fontWeight:700}}>{ci.name}</div></div>) })}
      </div>
      <div style={{marginTop:8}}><button className='button' onClick={confirm} disabled={!selectedCard || confirmed}>{confirmed?'Confirmed':'Confirm'}</button></div>
    </div>

    <div className='card' style={{marginTop:12}}>
      <h3>Log</h3>
      <div style={{maxHeight:200,overflow:'auto'}}>{log.map((l,i)=>(<div key={i}>{String(l)}</div>))}</div>
    </div>
  </div>)
}
