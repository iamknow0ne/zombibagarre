import './rebuild/style.css';
import {loadingStage} from './rebuild/Loading.js';
try{
 await loadingStage(8,'Opening the quarantine');
 await import('./main.js');
 if(!document.getElementById('error').hidden)throw new Error('Renderer initialization failed');
 await loadingStage(100,'The streets are ready');
 document.getElementById('loading').hidden=true;
 document.getElementById('menu').inert=false;
 document.getElementById('start').focus();
 window.bagarreDesktop?.ready();
}catch(error){
 console.error(error);document.getElementById('loading-stage').textContent='Unable to enter the city. Check your connection and WebGL support, then retry.';
 document.getElementById('loading-retry').hidden=false;
}
document.getElementById('loading-retry').onclick=()=>location.reload();

document.getElementById('error-retry').onclick=()=>location.reload();
