const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');
const modelEl = document.getElementById('model');
const systemEl = document.getElementById('system');
const clearBtn = document.getElementById('clear');
const exportBtn = document.getElementById('export');

let history = [{role:'system', content: systemEl.value}];

function append(role, text){
  const d = document.createElement('div');
  d.className = 'msg ' + (role === 'user' ? 'user' : 'assistant');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = (role === 'user' ? text : text);
  d.appendChild(bubble);
  messagesEl.appendChild(d);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function send(){
  const msg = inputEl.value.trim();
  if(!msg) return;
  append('user', msg);
  inputEl.value = '';
  history.push({role:'user', content:msg});

  // show loading
  sendBtn.disabled = true; sendBtn.textContent = 'Sending...';

  try{
    const res = await fetch('/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({message: msg, history: history, model: modelEl.value, system: systemEl.value})
    });
    const data = await res.json();
    if(data.error){ append('assistant', 'Error: ' + data.error); }
    else{
      append('assistant', data.assistant || '(no response)');
      history = data.history || history;
    }
  }catch(err){
    append('assistant', 'Network error: ' + err.message);
  }finally{
    sendBtn.disabled = false; sendBtn.textContent = 'Send';
  }
}

clearBtn.addEventListener('click', ()=>{
  history = [{role:'system', content: systemEl.value}];
  messagesEl.innerHTML = '';
  fetch('/clear', {method:'POST'}).catch(()=>{});
});

exportBtn.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(history, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'conversation.json'; a.click();
  URL.revokeObjectURL(url);
});

sendBtn.addEventListener('click', send);
inputEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter') send(); });

// try to populate model list (best-effort)
fetch('/models').then(r=>r.json()).then(j=>{
  if(j.models){
    modelEl.innerHTML = '';
    j.models.forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; modelEl.appendChild(o);});
    // keep selected default
  }
}).catch(()=>{});
