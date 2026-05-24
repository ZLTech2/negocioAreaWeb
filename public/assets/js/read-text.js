const readButton = document.getElementById('read-text');
const pauseButton = document.getElementById('pause');
const resumeButton = document.getElementById('resume');

readButton.addEventListener('click',()=>{

const text = document.body.innerText;
const speech = new SpeechSynthesisUtterance(text);
speech.lang = 'pt-BR';
window.speechSynthesis.speak(speech);
});

pauseButton.addEventListener('click',()=>{
if(speechSynthesis.speaking){
    speechSynthesis.pause();
}
})

resumeButton.addEventListener('click',()=>{
if(speechSynthesis.paused){
    speechSynthesis.resume();
}
});