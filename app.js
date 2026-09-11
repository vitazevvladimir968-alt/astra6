const MODEL="openai/gpt-5.6-luna";
const IMAGE_MODEL="gpt-image-2";
const status=document.querySelector("#status");
const chat=document.querySelector("#chat");
const input=document.querySelector("#input");
const send=document.querySelector("#send");
const fileInput=document.querySelector("#fileInput");
const attach=document.querySelector("#attach");
const imageMode=document.querySelector("#imageMode");
const webMode=document.querySelector("#webMode");
const mic=document.querySelector("#mic");
const filePreview=document.querySelector("#filePreview");
const login=document.querySelector("#login");
let messages=[];
let attachedFile=null;

const SYSTEM=`Ты Астра 6 — мощный русскоязычный ИИ-помощник. Отвечай точно, полезно и естественно. Умей объяснять учебные и инженерные задачи пошагово, анализировать данные и файлы, помогать с программированием и писать структурированные документы. Если информации недостаточно — честно скажи об этом. Не выдумывай источники.`;

function scroll(){chat.scrollTop=chat.scrollHeight;}
function add(role,text="",extra={}){
  document.querySelector("#welcome")?.remove();
  const row=document.createElement("div"); row.className="message "+role;
  const av=document.createElement("div"); av.className="avatar"; av.textContent=role==="user"?"Вы":"✦";
  const body=document.createElement("div"); body.className="message-body";
  const bubble=document.createElement("div"); bubble.className="bubble"; bubble.textContent=text;
  body.append(bubble);
  if(extra.image){const img=document.createElement("img");img.className="result-image";img.src=extra.image;body.append(img)}
  row.append(av,body); chat.append(row); scroll(); return bubble;
}

async function ensureAuth(){
  try{
    if(puter.auth && !puter.auth.isSignedIn()){
      status.textContent="Вход в бесплатный AI-сервис…";
      await puter.auth.signIn();
    }
  }catch(e){throw new Error("Не удалось выполнить вход: "+e.message)}
}

function opts(){
  const o={model:MODEL,stream:true};
  if(webMode.checked)o.tools=[{type:"web_search"}];
  return o;
}

async function ask(text){
  text=text.trim(); if(!text)return;
  input.value=""; input.style.height="auto";
  const file=attachedFile; clearFile();
  add("user",text+(file?`\n📎 ${file.name}`:""));
  const bubble=add("assistant","Думаю…");
  send.disabled=true; status.textContent=webMode.checked?"Ищу информацию и думаю…":"Астра 6 • GPT-5.6 Luna";
  try{
    await ensureAuth();
    let response;
    if(file){
      response=await puter.ai.chat(text,file,false,opts());
    }else{
      const history=[{role:"system",content:SYSTEM},...messages,{role:"user",content:text}];
      response=await puter.ai.chat(history,false,opts());
    }
    let answer="";
    if(response && response[Symbol.asyncIterator]){
      for await(const part of response){
        if(part?.text){answer+=part.text;bubble.textContent=answer;scroll();}
        else if(part?.message?.content){answer+=part.message.content;bubble.textContent=answer;scroll();}
      }
    }else{
      answer=response?.message?.content||response?.text||String(response||"");
      bubble.textContent=answer||"Не удалось получить ответ.";
    }
    messages.push({role:"user",content:text},{role:"assistant",content:answer});
    status.textContent="Готова";
  }catch(e){
    bubble.textContent="Ошибка: "+(e?.message||e);
    status.textContent="Ошибка подключения";
  }finally{send.disabled=false;input.focus();}
}

async function generateImage(prompt){
  prompt=prompt.trim();if(!prompt)return;
  input.value="";input.style.height="auto";
  add("user","🎨 Создай изображение: "+prompt);
  const bubble=add("assistant","Создаю изображение…");
  send.disabled=true;status.textContent="Генерация изображения…";
  try{
    await ensureAuth();
    const img=await puter.ai.txt2img(prompt,{model:IMAGE_MODEL,quality:"low"});
    bubble.remove();
    const row=document.createElement("div");row.className="message assistant";
    const av=document.createElement("div");av.className="avatar";av.textContent="✦";
    const body=document.createElement("div");body.className="message-body";
    const title=document.createElement("div");title.className="bubble";title.textContent="Готово ✨";
    body.append(title,img);img.className="result-image";row.append(av,body);chat.append(row);scroll();
    status.textContent="Готова";
  }catch(e){bubble.textContent="Не получилось создать изображение: "+(e?.message||e);status.textContent="Ошибка генерации"}
  finally{send.disabled=false;input.focus();}
}

function clearFile(){attachedFile=null;filePreview.textContent="";filePreview.classList.remove("show");fileInput.value="";}
function chooseFile(){fileInput.click();}
fileInput.addEventListener("change",()=>{
  const f=fileInput.files?.[0];if(!f)return;
  attachedFile=f;filePreview.textContent=`📎 ${f.name} · ${(f.size/1024/1024).toFixed(1)} МБ  ×`;
  filePreview.classList.add("show");
});
filePreview.addEventListener("click",clearFile);

send.onclick=()=>imageMode.checked?generateImage(input.value):ask(input.value);
attach.onclick=chooseFile;
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send.click()}});
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,150)+"px"});

document.querySelectorAll(".cards button").forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt||b.textContent.replace(/^.\s/,"");input.focus();});

if(mic && (window.SpeechRecognition||window.webkitSpeechRecognition)){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const rec=new SR();rec.lang="ru-RU";rec.interimResults=true;
  mic.onclick=()=>{try{rec.start();mic.classList.add("active")}catch{}};
  rec.onresult=e=>{input.value=Array.from(e.results).map(r=>r[0].transcript).join("");input.dispatchEvent(new Event("input"))};
  rec.onend=()=>mic.classList.remove("active");
}else if(mic){mic.disabled=true;mic.title="Голосовой ввод недоступен в этом браузере"}

login.onclick=async()=>{try{await ensureAuth();status.textContent="Вход выполнен"}catch(e){status.textContent=e.message}};
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");
status.textContent="Астра 6 • GPT-5.6 Luna";
