export async function loadingStage(value,message){
 const bar=document.getElementById('loading-progress'),label=document.getElementById('loading-stage');
 if(bar){bar.value=value;document.getElementById('loading-percent').textContent=String(value).padStart(2,'0');}
 if(label)label.textContent=message;
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}
