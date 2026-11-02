/* The browser owns only platform integration: file picking, optional codec
 * conversion, localStorage, and hosting Rive. Player UI, playlist, skin parsing,
 * playback, DSP and visualizer live in player.as / audio_engine.as / skin.as.
 * No audio is played through HTMLMediaElement or a JS Web Audio graph.
 */
'use strict';
const canvas = document.getElementById('player');
const notice = document.getElementById('notice');
const inputs = Object.fromEntries(['files','folder','skin'].map(id=>[id,document.getElementById(id)]));
let vm, instance, importSerial=0, queue=Promise.resolve(), importing=false;
const isMusic = name => /\.(mp3|wav|wave|flac|ogg|m4a|aac|aiff?|opus|webm)$/i.test(name);
function message(text){notice.textContent=text;}
const assetURL = path => new URL(path, document.baseURI).href;
function getNumber(name){return vm.number(name);}
function command(value){if(vm)getNumber('command').value=value;}
function openPicker(kind){inputs[kind].value='';inputs[kind].click();}
for(const [id,kind] of [['filesButton','files'],['folderButton','folder'],['skinButton','skin']]){
 document.getElementById(id).onclick=()=>openPicker(kind);
}
document.getElementById('resetButton').onclick=()=>{
 if(vm)vm.string('restoreLayout').value='0,0,1,0,116,1,0,232,1,0';
 localStorage.removeItem('rive-winamp-layout');
};
for(const [kind,input] of Object.entries(inputs))input.addEventListener('change',()=>enqueue([...input.files],kind));
function asBase64(buffer){
 // FileReader encodes bytes without a huge JS string spread or a network upload.
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onerror=()=>reject(reader.error);
  reader.onload=()=>resolve(reader.result.slice(reader.result.indexOf(',')+1));
  reader.readAsDataURL(new Blob([buffer]));
 });
}
async function toWav(file){
 const raw=await file.arrayBuffer();
 if(/\.wav(e)?$/i.test(file.name))return raw; // Native WAV decode stays in AnimaScript.
 // The installed Rive API cannot decode arbitrary runtime compressed audio.
 // Use browser codecs only for this ingress conversion, then send PCM to Rive.
 const decoder=new OfflineAudioContext(2,1,48000);
 const audio=await decoder.decodeAudioData(raw);
 const channels=Math.min(2,audio.numberOfChannels),count=audio.length;
 if(count*channels*4>90000000)throw new Error('Decoded track is too large (90 MB limit).');
 const result=new ArrayBuffer(44+count*channels*4),v=new DataView(result);
 const tag=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
 tag(0,'RIFF');v.setUint32(4,result.byteLength-8,true);tag(8,'WAVE');tag(12,'fmt ');
 v.setUint32(16,16,true);v.setUint16(20,3,true);v.setUint16(22,channels,true);
 v.setUint32(24,audio.sampleRate,true);v.setUint32(28,audio.sampleRate*channels*4,true);
 v.setUint16(32,channels*4,true);v.setUint16(34,32,true);tag(36,'data');v.setUint32(40,count*channels*4,true);
 const channelData=Array.from({length:channels},(_,c)=>audio.getChannelData(c));
 for(let i=0;i<count;i++)for(let c=0;c<channels;c++)v.setFloat32(44+(i*channels+c)*4,channelData[c][i],true);
 return result;
}
function waitForAck(serial){
 return new Promise((resolve,reject)=>{
  const begin=performance.now();
  const timer=setInterval(()=>{
   if(getNumber('importAck').value===serial){clearInterval(timer);resolve(vm.string('status').value);}
   else if(performance.now()-begin>90000){clearInterval(timer);reject(new Error('Rive import timed out. Reload the player before retrying.'));}
  },50);
 });
}
async function importFile(file,kind){
 if(!vm)throw new Error('The player is not ready yet.');
 if(file.size>90000000)throw new Error('File exceeds the 90 MB import limit.');
 if(kind==='skin'&&file.size>32000000)throw new Error('Skin exceeds 32 MB.');
 message(`Loading ${file.name}…`);importing=true;
 try{
  const data=kind==='skin'?await file.arrayBuffer():await toWav(file);
  const payload=await asBase64(data);
  vm.string('fileName').value=file.name.replace(/\.[^.]+$/,'');
  vm.string('fileKind').value=kind;
  vm.string('payload').value=payload;
  const serial=++importSerial;getNumber('importSerial').value=serial;
  const status=await waitForAck(serial);
  if(/failed|limit|unsupported|exceeds/i.test(status))throw new Error(status);
  if(kind==='skin'){
   try {const db=await skinDB();const tx=db.transaction('skins','readwrite');tx.objectStore('skins').put({name:file.name,bytes:data},'last');}catch{}
  }
  message('');
 }finally{importing=false;canvas.focus();}
}
function enqueue(files,kind){
 const valid=files.filter(f=>kind==='folder'?isMusic(f.name):/\.(wsz|zip)$/i.test(f.name)||isMusic(f.name));
 if(!valid.length){message('Choose an audio file or a classic .wsz skin.');return;}
 for(const file of valid){
  const type=/\.(wsz|zip)$/i.test(file.name)?'skin':'audio';
  queue=queue.then(()=>importFile(file,type)).catch(error=>{message(`${file.name}: ${error.message}`);console.error(error);});
 }
 return queue;
}
function skinDB(){return new Promise((resolve,reject)=>{
 const req=indexedDB.open('rive-winamp',1);req.onupgradeneeded=()=>req.result.createObjectStore('skins');
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
async function restoreSkin(){
 try{
  const db=await skinDB();const req=db.transaction('skins').objectStore('skins').get('last');
  req.onsuccess=()=>{if(req.result){const {name,bytes}=req.result;enqueue([new File([bytes],name)],'skin');}};
 }catch{}
}
async function boot(){
 if(!isSecureContext){message('Open this player over HTTPS. Audio threads require a secure connection.');return;}
 if(!crossOriginIsolated){message('Audio is unavailable: this server must send Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.');return;}
 rive.RuntimeLoader.setWasmUrl(assetURL('./vendor/rive.wasm'));
 rive.RuntimeLoader.setWasmFallbackUrl(assetURL('./vendor/rive_fallback.wasm'));
 rive.RuntimeLoader.setWasmThreadsUrl(assetURL('./vendor/rive_threads.wasm'));
 rive.RuntimeLoader.setReplayWorker(false);
 instance=new rive.Rive({
  src:assetURL('./player.riv'),canvas,autoplay:true,stateMachine:'Player',autoBind:true,
  enableGPUCanvas:true,useReplayWorker:false,
  layout:new rive.Layout({fit:rive.Fit.Layout}),
  onLoad(){
   vm=instance.viewModelInstance;
   if(!vm){message('Rive did not bind the Player view model.');return;}
   vm.boolean('webHost').value=true;
   instance.resizeDrawingSurfaceToCanvas();
   const classicPreview=new URLSearchParams(location.search).has('classic');
   const stored=classicPreview?null:localStorage.getItem('rive-winamp-layout');if(stored)vm.string('restoreLayout').value=stored;
   vm.string('layoutState').on(()=>{const s=vm.string('layoutState').value;if(s)localStorage.setItem('rive-winamp-layout',s);});
   vm.string('request').on(()=>{
    const request=vm.string('request').value;if(!request)return;vm.string('request').value='';
    if(inputs[request])openPicker(request);
   });
   message('');canvas.focus();
   // Skin setup completes across several Rive frames before accepting imports.
   let tries=0;const ready=setInterval(()=>{
    const status=vm.string('status').value;
    if(status.startsWith('Ready -')||++tries>200){clearInterval(ready);if(!classicPreview)restoreSkin();}
   },50);
   window.winamp={instance,vm,command,enqueue,get state(){return {playing:vm.boolean('playing').value,position:getNumber('position').value,trackCount:getNumber('trackCount').value,status:vm.string('status').value};}};
  },
  onLoadError(error){message('Unable to load the Rive build: '+JSON.stringify(error));console.error(error);}
 });
 new ResizeObserver(()=>instance?.resizeDrawingSurfaceToCanvas()).observe(canvas);
}
let dragDepth=0;
window.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;document.getElementById('drop').style.display='flex';});
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('dragleave',e=>{e.preventDefault();if(--dragDepth<=0){dragDepth=0;document.getElementById('drop').style.display='none';}});
async function entryFiles(entry){
 if(entry.isFile)return [await new Promise((resolve,reject)=>entry.file(resolve,reject))];
 if(!entry.isDirectory)return [];
 const reader=entry.createReader();let all=[],batch;
 do {batch=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));for(const child of batch)all.push(...await entryFiles(child));}while(batch.length);
 return all;
}
window.addEventListener('drop',async e=>{
 e.preventDefault();dragDepth=0;document.getElementById('drop').style.display='none';
 const entries=[...e.dataTransfer.items].map(i=>i.webkitGetAsEntry?.()).filter(Boolean);
 try{const files=entries.length?(await Promise.all(entries.map(entryFiles))).flat():[...e.dataTransfer.files];enqueue(files,'audio');}catch(error){message(error.message);}
});
// Forward raw browser keys; all shortcut behavior stays in AnimaScript.
canvas.addEventListener('keydown',e=>{
 if(vm&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
  vm.string('keyEvent').value=e.key;
  if(e.key===' '||e.key.startsWith('Arrow'))e.preventDefault();
 }
});
Promise.resolve(window.riveIsolationReady).then(()=>boot()).catch(error=>{message(error.message);console.error(error);});
