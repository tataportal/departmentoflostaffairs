export const STORAGE_KEY = 'lamparas.sala.v1';
export const TEMPERATURES = {warm:{label:'Cálida',color:0xffbc73},neutral:{label:'Neutra',color:0xfff0d7},cool:{label:'Fría',color:0xcbdfff}};
export const LAMPS = [
 {id:'andon',name:'Andon Frame',kind:'Lámpara de mesa',position:[-1.3,.55,.8],height:.24,power:1.0},
 {id:'toro',name:'Tōrō Stack',kind:'Lámpara de pie',position:[-1.18,.13,-.96],height:1.18,power:1.5},
 {id:'shoji',name:'Shoji Wall',kind:'Aplique de pared',position:[-.46,1.16,-1.51],height:.24,power:1.25},
 {id:'pebble',name:'Karesansui Pebble',kind:'Jardín de luz',position:[.12,.405,.22],height:.093,power:.6},
 {id:'pebble-compact',name:'Pebble Compacta',kind:'Luz de acento',position:[1.22,.43,.95],height:.08,power:.5},
 {id:'shibui',name:'SHIBUI',kind:'Lámpara individual',position:[.48,.65,-1.26],height:.133,power:.9},
 {id:'shibui-stack',name:'SHIBUI Apilada',kind:'Dos pantallas',position:[1.14,.65,-1.26],height:.265,power:1.2}
];
export function normalizeState(raw){
 const source=raw&&typeof raw==='object'?raw:{};
 return Object.fromEntries(LAMPS.map(({id})=>[id,{on:typeof source[id]?.on==='boolean'?source[id].on:true,temperature:Object.hasOwn(TEMPERATURES,source[id]?.temperature)?source[id].temperature:'warm'}]));
}
export function loadState(storage){try{return normalizeState(JSON.parse(storage.getItem(STORAGE_KEY)));}catch{return normalizeState(null);}}
export function saveState(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(normalizeState(state)));return true;}catch{return false;}}
