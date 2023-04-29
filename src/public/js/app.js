const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const call = document.getElementById("call");
//
const chatForm = document.querySelector("#chatForm");
chatForm.addEventListener("submit", handleChatFormSubmit);
//
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;


async function getCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device)=> device.kind ==="videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach((camera)=>{
            const option = document.createElement("option");
            option.value =camera.deviceId;
            option.innerText= camera.label;
            if(currentCamera.label == camera.label){
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        });
    }   catch (e) {
        console.log(e);
    }
  }
  

async function getMedia(deviceId) {
    const initialConstraints = {
        audio: true,
        video: { facingMode: "user"}
    };
    const cameraConstraints ={
        audio: true,
        video: { deviceId: { exact: deviceId}}
    };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
     deviceId ? cameraConstraints: initialConstraints
    );
    myFace.srcObject = myStream;
    if(!deviceId){
    await getCamera();
    }
  } catch (e) {
    console.log(e);
  }
}


function handleMuteClick() {//음소거 함수
    myStream.getAudioTracks()
    .forEach((track)=>(track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "음소거o";
    muted = true;
  } else {
    muteBtn.innerText = "음소거x";
    muted = false;
  }
}

function handleCameraClick() {//카메라 ox함수
    myStream.getVideoTracks()
    .forEach((track)=>(track.enabled = !track.enabled));
  if (!cameraOff) {
    cameraBtn.innerText = "카메라 꺼짐";
    cameraOff = true;
  } else {
    cameraBtn.innerText = "카메라 켜짐~";
    cameraOff = false;
  }
}

async function handleCameraChange(){//상대방카메라 함수
    await getMedia(cameraSelect.value);
    if(myPeerConnection){
      const videoTrack = myStream.getVideoTracks()[0];
      const videosender = myPeerConnection
      .getSenders()
      .find((sender)=> sender.track.kind==="video");
      videosender.replaceTrack(videoTrack);
    }
}


// Welcome Form(join a room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

call.hidden =true;

async function initCall(){
  welcome.hidden =true;
  call.hidden =false;
  await getMedia();
  makeConnection();
}


async function handleWelcomeSubmit(event){ // 방들어가기
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value,);
  roomName=input.value;
  input.value="";
}
welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// message code
function appendMessage(message) {
  const ul = document.querySelector("#message");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");

  myDataChannel.addEventListener("message", (event) => {
    const ul = document.getElementById("message");
    const li = document.createElement("li");
    li.innerText = event.data;
    ul.appendChild(li);
  });

  console.log("made data channel");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("오퍼 보낸다");
  socket.emit("offer", offer, roomName);
  chatForm.addEventListener("submit", handleChatFormSubmit);
});

function handleChatFormSubmit(event) {
  event.preventDefault();
  const input = chatForm.querySelector("input[type='text']");
  const message = input.value;
  input.value = "";
  appendMessage(`You: ${message}`);
  myDataChannel.send(message);
}

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => {
      const ul = document.getElementById("message");
      const li = document.createElement("li");
      li.innerText = event.data;
      ul.appendChild(li);
    });
  });

  console.log("오퍼 도착");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("대답 보냄");
});

socket.on("answer", (answer) => {
  console.log("대답이 도착~");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("후보 도착~");
  myPeerConnection.addIceCandidate(ice);
});





//RTC code
function makeConnection(){
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls:[
          "stun:stun.l.goole.com:19302",
          "stun:stun1.l.goole.com:19302",
          "stun:stun2.l.goole.com:19302",
          "stun:stun3.l.goole.com:19302",
          "stun:stun4.l.goole.com:19302",
        ]
      }
    ]
  });
  myPeerConnection.addEventListener("icecandidate",handleIce);
  myPeerConnection.addEventListener("addstream",handleAddStream);
  myStream.getTracks()
  .forEach(track => myPeerConnection.addTrack(track,myStream));
}

function handleIce(data){
  console.log("보냈다 후보를")
  socket.emit("ice",data.candidate,roomName);
}

function handleAddStream(data){
  const peerFace =document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}






muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);
cameraSelect.addEventListener("input", handleCameraChange);