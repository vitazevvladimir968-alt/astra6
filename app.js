const MODEL="gpt-5.6-luna";
const IMAGE_MODEL="gpt-image-2";
const status=document.querySelector("#status"),chat=document.querySelector("#chat"),input=document.querySelector("#input"),send=document.querySelector("#send"),fileInput=document.querySelector("#fileInput"),attach=document.querySelector("#attach"),imageMode=document.querySelector("#imageMode"),webMode=document.querySelector("#webMode"),mic=document.querySelector("#mic"),filePreview=document.querySelector("#filePreview");
const nameCard=document.querySelector("#nameCard"),nameSuggestion=document.querySelector("#nameSuggestion"),acceptName=document.querySelector("#acceptName"),changeName=document.querySelector("#changeName"),nameInput=document.querySelector("#nameInput"),saveName=document.querySelector("#saveName");
let messages=[],attachedFile=null,authStarted=false,userName=localStorage.getItem("astra6_user_name")||"";
const suggestions=["Капитан","Шеф","Командир","Друг"];
const suggestedName=suggestions[Math.floor(Math.random()*suggestions.length)];

function scroll(){chat.scrollTop=chat.scrollHeight;}
function add(role,text=""){
  document.querySelector("#welcome")?.remove();
  const row=document.createElement("div");row.className="message "+role;
  const av=document.createElement("div");av.className="avatar";av.textContent=role==="user"?"Вы":"✦";
  const body=document.createElement("div");body.className="message-body";
  const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=text;body.append(bubble);row.append(av,body);chat.append(row);scroll();return bubble;
}

function applyName(name){
  name=(name||"").trim().replace(/\s+/g," ").slice(0,32);
  if(!name)return;
  userName=name;localStorage.setItem("astra6_user_name",name);
  if(nameCard)nameCard.hidden=true;
  status.textContent=`Astra 6 • Джарвис • обращение: ${name}`;
}

if(userName){nameCard.hidden=true}else{
  nameSuggestion.textContent=`Я предлагаю обращаться к вам «${suggestedName}». Если не подходит — выберите свой вариант.`;
  acceptName.textContent=`Да, «${suggestedName}»`;
  acceptName.onclick=()=>applyName(suggestedName);
  changeName.onclick=()=>{nameInput.hidden=false;saveName.hidden=false;nameInput.focus();};
  saveName.onclick=()=>applyName(nameInput.value);
  nameInput.addEventListener("keydown",e=>{if(e.key==="Enter")applyName(nameInput.value)});
}

const SYSTEM=()=>`Ты — Джарвис, главный ИИ-помощник внутри приложения Astra 6. Astra 6 — название системы, а твоё имя в диалоге всегда Джарвис. Общайся на русском, если пользователь не попросил другой язык. Будь быстрым, точным и полезным. Умей решать учебные, математические, физические и инженерные задачи пошагово, писать и исправлять код, анализировать файлы и изображения, помогать с играми и документами. Не выдумывай факты или источники. Если включён поиск, используй актуальные данные. Пользователя всегда называй «${userName||"друг"}», естественно и не в каждом предложении. Не называй приложение своим именем: приложение — Astra 6, ты — Джарвис.`;

async function ensureAuth(){
  if(puter.auth?.isSignedIn?.()||puter.authToken)return;
  if(authStarted)return;
  authStarted=true;status.textContent="Запускаю гостевой режим…";
  try{
    const res=await puter.auth.signIn({attempt_temp_user_creation:true});
    if(res?.success===false)throw new Error(res.msg||res.error||"Гостевой режим недоступен");
    status.textContent=`Astra 6 • Джарвис${userName?` • ${userName}`:""}`;
  }catch(e){authStarted=false;throw new Error("Не удалось запустить гостевой режим. Попробуйте ещё раз: "+(e?.msg||e?.message||e));}
}

function opts(){
  const o={model:MODEL,stream:true,normalize:true,compaction:{trigger_tokens:60000}};
  if(webMode.checked)o.tools=[{type:"web_search"}];
  return o;
}

async function ask(text){
  text=text.trim();if(!text)return;
  if(!userName){applyName(suggestedName);}
  input.value="";input.style.height="auto";const file=attachedFile;clearFile();
  add("user",text+(file?`\n📎 ${file.name}`:""));const bubble=add("assistant","Джарвис подключается…");
  send.disabled=true;status.textContent=webMode.checked?"Джарвис ищет информацию…":"Джарвис думает…";
  try{
    await ensureAuth();
    const history=[{role:"system",content:SYSTEM()},...messages,{role:"user",content:text}];
    let response=file?await puter.ai.chat(text,file,false,opts()):await puter.ai.chat(history,opts());
    let answer="";
    if(response&&response[Symbol.asyncIterator]){
      for await(const part of response){
        if(part?.type==="error")throw new Error(part.message||"Ошибка AI");
        if(part?.type==="text"||part?.text){answer+=part.text||"";bubble.textContent=answer;scroll();}
      }
    }else{answer=response?.message?.content||response?.text||"";bubble.textContent=answer||"Не удалось получить ответ.";}
    messages.push({role:"user",content:text},{role:"assistant",content:answer});
    status.textContent=`Astra 6 • Джарвис • готова${userName?` • ${userName}`:""}`;
  }catch(e){bubble.textContent="Ошибка: "+(e?.message||e);status.textContent="Ошибка подключения";}
  finally{send.disabled=false;input.focus();}
}

async function generateImage(prompt){
  prompt=prompt.trim();if(!prompt)return;if(!userName)applyName(suggestedName);
  input.value="";input.style.height="auto";add("user","🎨 Создай изображение: "+prompt);const bubble=add("assistant","Джарвис создаёт изображение…");
  send.disabled=true;status.textContent="Генерация изображения…";
  try{await ensureAuth();const img=await puter.ai.txt2img(prompt,{model:IMAGE_MODEL,quality:"low"});bubble.remove();const row=document.createElement("div");row.className="message assistant";const av=document.createElement("div");av.className="avatar";av.textContent="✦";const body=document.createElement("div");body.className="message-body";const title=document.createElement("div");title.className="bubble";title.textContent="Готово ✨";img.className="result-image";body.append(title,img);row.append(av,body);chat.append(row);scroll();status.textContent="Astra 6 • Джарвис • готова";}
  catch(e){bubble.textContent="Не получилось создать изображение: "+(e?.message||e);status.textContent="Ошибка генерации"}
  finally{send.disabled=false;input.focus();}
}

function clearFile(){attachedFile=null;filePreview.textContent="";filePreview.classList.remove("show");fileInput.value="";}
attach.onclick=()=>fileInput.click();
fileInput.addEventListener("change",()=>{const f=fileInput.files?.[0];if(!f)return;attachedFile=f;filePreview.textContent=`📎 ${f.name} · ${(f.size/1024/1024).toFixed(1)} МБ  ×`;filePreview.classList.add("show")});
filePreview.addEventListener("click",clearFile);
send.onclick=()=>imageMode.checked?generateImage(input.value):ask(input.value);
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send.click()}});
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,150)+"px"});
document.querySelectorAll(".cards button").forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt||b.textContent.replace(/^.\s/,"");input.focus()});

if(mic&&(window.SpeechRecognition||window.webkitSpeechRecognition)){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition,rec=new SR();rec.lang="ru-RU";rec.interimResults=true;
  mic.onclick=()=>{try{rec.start();mic.classList.add("active")}catch{}};rec.onresult=e=>{input.value=Array.from(e.results).map(r=>r[0].transcript).join("");input.dispatchEvent(new Event("input"))};rec.onend=()=>mic.classList.remove("active");
}else if(mic){mic.disabled=true;mic.title="Голосовой ввод недоступен в этом браузере"}

status.textContent=`Astra 6 • Джарвис • готова${userName?` • ${userName}`:""}`;
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");