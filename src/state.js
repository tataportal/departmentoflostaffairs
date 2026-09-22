export const STORAGE_KEY = 'lamparas.sala.v1';
export const TEMPERATURES = {warm:{label:'Warm',color:0xffbc73},neutral:{label:'Neutral',color:0xfff0d7},cool:{label:'Cool',color:0xcbdfff}};
export const LAMPS = [
 {id:'andon',priceUSD:123,name:'Andon Frame',kind:'Table lamp',position:[-1.18,.55,.98],height:.24,power:1.0},
 {id:'toro',priceUSD:250,name:'Tōrō Stack',kind:'Floor lamp',position:[-.98,.13,-1.19],height:1.18,power:2.1},
 {id:'shoji',priceUSD:100,name:'Shoji Wall',kind:'Wall light',position:[-.46,1.16,-1.51],height:.24,power:.65},
 {id:'pebble',priceUSD:106,name:'Karesansui Pebble',kind:'Garden of light',position:[-.08,.405,-.08],height:.093,power:.6},
 {id:'pebble-compact',name:'Pebble Compact',kind:'Accent light',position:[.82,.495,.98],height:.08,power:.5},
 {id:'shibui',priceUSD:100,name:'SHIBUI',kind:'Single lamp',position:[.47,.65,-1.25],height:.133,power:.9},
 {id:'shibui-stack',name:'SHIBUI Stack',kind:'Two shades',position:[1.17,.65,-1.25],height:.265,power:1.2}
];
export function normalizeState(raw){
 const source=raw&&typeof raw==='object'?raw:{};
 return Object.fromEntries(LAMPS.map(({id})=>[id,{on:typeof source[id]?.on==='boolean'?source[id].on:true,temperature:Object.hasOwn(TEMPERATURES,source[id]?.temperature)?source[id].temperature:'warm'}]));
}
export function loadState(storage){try{return normalizeState(JSON.parse(storage.getItem(STORAGE_KEY)));}catch{return normalizeState(null);}}
export function saveState(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(normalizeState(state)));return true;}catch{return false;}}
