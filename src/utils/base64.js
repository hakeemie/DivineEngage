export function encodeDeck(arr){
  return btoa(JSON.stringify(arr)).replace(/=/g,'')
}
export function decodeDeck(code){
  try{
    let pad = code.length % 4
    if(pad) code += '='.repeat(4-pad)
    return JSON.parse(atob(code))
  }catch(e){ return null }
}
