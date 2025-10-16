export function encode(s){ return btoa(s).replace(/=/g,'') }
export function decode(code){ try{ let pad = code.length % 4; if(pad) code += '='.repeat(4-pad); return atob(code); } catch(e){ return null } }
