const socket = io();
const myvideo = document.querySelector("#vd1");
const roomid = params.get("room");
let username;
const chatRoom = document.querySelector('.chat-cont');
const sendButton = document.querySelector('.chat-send');
const messageField = document.querySelector('.chat-input');
const videoContainer = document.querySelector('#vcont');
const overlayContainer = document.querySelector('#overlay')
const continueButt = document.querySelector('.continue-name');
const nameField = document.querySelector('#name-field');
const videoButt = document.querySelector('.novideo');
const audioButt = document.querySelector('.audio');
const inviteParticipants = document.querySelector('.invite');
const cutCall = document.querySelector('.cutcall');
const screenShareButt = document.querySelector('.screenshare');
const whiteboardButt = document.querySelector('.board-icon')

const leftcont = document.querySelector('.left-cont')
const rightcont = document.querySelector('.right-cont')
const chatbutton = document.querySelector('.showchat')

let videoAllowed = 1;
let audioAllowed = 1;

let micInfo = {};
let videoInfo = {};

let videoTrackReceived = {};

let mymuteicon = document.querySelector("#mymuteicon");
mymuteicon.style.visibility = 'hidden';

let myvideooff = document.querySelector("#myvideooff");
myvideooff.style.visibility = 'hidden';

const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] }

const mediaConstraints = { video: true, audio: true };

let connections = {};
let cName = {};
let audioTrackSent = {};
let videoTrackSent = {};

let mystream, myscreenshare;


document.querySelector('.roomcode').innerHTML = `${roomid}`

function CopyClassText() {

    var textToCopy = document.querySelector('.roomcode');
    var currentRange;
    if (document.getSelection().rangeCount > 0) {
        currentRange = document.getSelection().getRangeAt(0);
        window.getSelection().removeRange(currentRange);
    }
    else {
        currentRange = false;
    }

    var CopyRange = document.createRange();
    CopyRange.selectNode(textToCopy);
    window.getSelection().addRange(CopyRange);
    document.execCommand("copy");

    window.getSelection().removeRange(CopyRange);

    if (currentRange) {
        window.getSelection().addRange(currentRange);
    }

    document.querySelector(".copycode-button").textContent = "Copied!"
    setTimeout(()=>{
        document.querySelector(".copycode-button").textContent = "Copy Code";
    }, 5000);
}


continueButt.addEventListener('click', () => {
    if (nameField.value == '') return;
    username = nameField.value;
    overlayContainer.style.visibility = 'hidden';
    document.querySelector("#myname").innerHTML = `${username} (You)`;
    socket.emit("join room", roomid, username);

})

nameField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        continueButt.click();
    }
});

socket.on('user count', count => {
    if (count > 1) {
        videoContainer.className = 'video-cont';
    }
    else {
        videoContainer.className = 'video-cont-single';
    }
})

let peerConnection;

function handleGetUserMediaError(e) {
    switch (e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone" +
                "were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

}

function reportError(e) {
    console.log(e);
    return;
}

function startCall() {

    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(localStream => {
            myvideo.srcObject = localStream;
            myvideo.muted = true;

            localStream.getTracks().forEach(track => {
                for (let key in connections) {
                    connections[key].addTrack(track, localStream);
                    if (track.kind === 'audio')
                        audioTrackSent[key] = track;
                    else
                        videoTrackSent[key] = track;
                }
            })

        })
        .catch(handleGetUserMediaError);


}

function handleVideoOffer(offer, sid, cname, micinf, vidinf) {

    cName[sid] = cname;
    console.log('video offered recevied');
    micInfo[sid] = micinf;
    videoInfo[sid] = vidinf;
    connections[sid] = new RTCPeerConnection(configuration);

    connections[sid].onicecandidate = function (event) {
        if (event.candidate) {
            console.log('icecandidate fired');
            socket.emit('new icecandidate', event.candidate, sid);
        }
    };

    connections[sid].ontrack = function (event) {

        if (!document.getElementById(sid)) {
            console.log('track event fired')
            let vidCont = document.createElement('div');
            let newvideo = document.createElement('video');
            let name = document.createElement('div');
            let muteIcon = document.createElement('div');
            let videoOff = document.createElement('div');
            videoOff.classList.add('video-off');
            muteIcon.classList.add('mute-icon');
            name.classList.add('nametag');
            name.innerHTML = `${cName[sid]}`;
            vidCont.id = sid;
            muteIcon.id = `mute${sid}`;
            videoOff.id = `vidoff${sid}`;
            muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
            videoOff.innerHTML = 'Video Off'
            vidCont.classList.add('video-box');
            newvideo.classList.add('video-frame');
            newvideo.autoplay = true;
            newvideo.playsinline = true;
            newvideo.id = `video${sid}`;
            newvideo.srcObject = event.streams[0];

            if (micInfo[sid] == 'on')
                muteIcon.style.visibility = 'hidden';
            else
                muteIcon.style.visibility = 'visible';

            if (videoInfo[sid] == 'on')
                videoOff.style.visibility = 'hidden';
            else
                videoOff.style.visibility = 'visible';

            vidCont.appendChild(newvideo);
            vidCont.appendChild(name);
            vidCont.appendChild(muteIcon);
            vidCont.appendChild(videoOff);

            videoContainer.appendChild(vidCont);

        }


    };

    connections[sid].onremovetrack = function (event) {
        if (document.getElementById(sid)) {
            document.getElementById(sid).remove();
            console.log('removed a track');
        }
    };

    connections[sid].onnegotiationneeded = function () {

        connections[sid].createOffer()
            .then(function (offer) {
                return connections[sid].setLocalDescription(offer);
            })
            .then(function () {

                socket.emit('video-offer', connections[sid].localDescription, sid);

            })
            .catch(reportError);
    };

    let desc = new RTCSessionDescription(offer);

    connections[sid].setRemoteDescription(desc)
        .then(() => { return navigator.mediaDevices.getUserMedia(mediaConstraints) })
        .then((localStream) => {

            localStream.getTracks().forEach(track => {
                connections[sid].addTrack(track, localStream);
                console.log('added local stream to peer')
                if (track.kind === 'audio') {
                    audioTrackSent[sid] = track;
                    if (!audioAllowed)
                        audioTrackSent[sid].enabled = false;
                }
                else {
                    videoTrackSent[sid] = track;
                    if (!videoAllowed)
                        videoTrackSent[sid].enabled = false
                }
            })

        })
        .then(() => {
            return connections[sid].createAnswer();
        })
        .then(answer => {
            return connections[sid].setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('video-answer', connections[sid].localDescription, sid);
        })
        .catch(handleGetUserMediaError);


}

function handleNewIceCandidate(candidate, sid) {
    console.log('new candidate recieved')
    var newcandidate = new RTCIceCandidate(candidate);

    connections[sid].addIceCandidate(newcandidate)
        .catch(reportError);
}

function handleVideoAnswer(answer, sid) {
    console.log('answered the offer')
    const ans = new RTCSessionDescription(answer);
    connections[sid].setRemoteDescription(ans);
}

socket.on('video-offer', handleVideoOffer);

socket.on('new icecandidate', handleNewIceCandidate);

socket.on('video-answer', handleVideoAnswer);

socket.on('join room', async (conc, cnames, micinfo, videoinfo) => {
    socket.emit('getCanvas');
    if (cnames)
        cName = cnames;

    if (micinfo)
        micInfo = micinfo;

    if (videoinfo)
        videoInfo = videoinfo;


    console.log(cName);
    if (conc) {
        await conc.forEach(sid => {
            connections[sid] = new RTCPeerConnection(configuration);

            connections[sid].onicecandidate = function (event) {
                if (event.candidate) {
                    console.log('icecandidate fired');
                    socket.emit('new icecandidate', event.candidate, sid);
                }
            };

            connections[sid].ontrack = function (event) {

                if (!document.getElementById(sid)) {
                    console.log('track event fired')
                    let vidCont = document.createElement('div');
                    let newvideo = document.createElement('video');
                    let name = document.createElement('div');
                    let muteIcon = document.createElement('div');
                    let videoOff = document.createElement('div');
                    videoOff.classList.add('video-off');
                    muteIcon.classList.add('mute-icon');
                    name.classList.add('nametag');
                    name.innerHTML = `${cName[sid]}`;
                    vidCont.id = sid;
                    muteIcon.id = `mute${sid}`;
                    videoOff.id = `vidoff${sid}`;
                    muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
                    videoOff.innerHTML = 'Video Off'
                    vidCont.classList.add('video-box');
                    newvideo.classList.add('video-frame');
                    newvideo.autoplay = true;
                    newvideo.playsinline = true;
                    newvideo.id = `video${sid}`;
                    newvideo.srcObject = event.streams[0];

                    if (micInfo[sid] == 'on')
                        muteIcon.style.visibility = 'hidden';
                    else
                        muteIcon.style.visibility = 'visible';

                    if (videoInfo[sid] == 'on')
                        videoOff.style.visibility = 'hidden';
                    else
                        videoOff.style.visibility = 'visible';

                    vidCont.appendChild(newvideo);
                    vidCont.appendChild(name);
                    vidCont.appendChild(muteIcon);
                    vidCont.appendChild(videoOff);

                    videoContainer.appendChild(vidCont);

                }

            };

            connections[sid].onremovetrack = function (event) {
                if (document.getElementById(sid)) {
                    document.getElementById(sid).remove();
                }
            }

            connections[sid].onnegotiationneeded = function () {

                connections[sid].createOffer()
                    .then(function (offer) {
                        return connections[sid].setLocalDescription(offer);
                    })
                    .then(function () {

                        socket.emit('video-offer', connections[sid].localDescription, sid);

                    })
                    .catch(reportError);
            };

        });

        console.log('added all sockets to connections');
        startCall();

    }
    else {
        console.log('waiting for someone to join');
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localStream => {
                myvideo.srcObject = localStream;
                myvideo.muted = true;
                mystream = localStream;
            })
            .catch(handleGetUserMediaError);
    }
})

socket.on('remove peer', sid => {
    if (document.getElementById(sid)) {
        document.getElementById(sid).remove();
    }

    delete connections[sid];
})

sendButton.addEventListener('click', () => {
    const msg = messageField.value;
    messageField.value = '';
    socket.emit('message', msg, username, roomid);
})

messageField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        sendButton.click();
    }
});

socket.on('message', (msg, sendername, time) => {
    chatRoom.scrollTop = chatRoom.scrollHeight;
    chatRoom.innerHTML += `<div class="message">
    <div class="info">
        <div class="username">${sendername}</div>
        <div class="time">${time}</div>
    </div>
    <div class="content">
        ${msg}
    </div>
</div>`
});

let flag = true;

chatbutton.addEventListener('click', () => {    
    flag = !flag;

    if(flag){
    rightcont.style.display = "none";
    videoContainer.style.maxWidth = "1150px";
    videoContainer.style.margin = "0 auto";
    }
    else{
    rightcont.style.display = "block";
    videoContainer.style.maxWidth = "1150px";
    }
})

videoButt.addEventListener('click', () => {

    if (videoAllowed) {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = false;
        }
        videoButt.innerHTML = `<i class="fas fa-video-slash"></i> <span class="tooltiptext">Turn Video On</span>`;
        videoAllowed = 0;
        videoButt.style.backgroundColor = "red";


        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'video') {
                    track.enabled = false;
                }
            })
        }

        myvideooff.style.visibility = 'visible';

        socket.emit('action', 'videooff');
    }
    else {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = true;
        }
        videoButt.innerHTML = `<i class="fas fa-video"></i> <span class="tooltiptext">Turn Video Off</span>`;
        videoAllowed = 1;
        videoButt.style.backgroundColor = "rgb(37,0,255)";
        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'video')
                    track.enabled = true;
            })
        }


        myvideooff.style.visibility = 'hidden';

        socket.emit('action', 'videoon');
    }
})


audioButt.addEventListener('click', () => {

    if (audioAllowed) {
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = false;
        }
        audioButt.innerHTML = `<i class="fas fa-microphone-slash"></i> <span class="tooltiptext">Unmute</span>`;
        audioAllowed = 0;
        audioButt.style.backgroundColor = "red";
        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'audio')
                    track.enabled = false;
            })
        }

        mymuteicon.style.visibility = 'visible';

        socket.emit('action', 'mute');
    }
    else {
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = true;
        }
        audioButt.innerHTML = `<i class="fas fa-microphone"></i> <span class="tooltiptext">Mute</span>`;
        audioAllowed = 1;
        audioButt.style.backgroundColor = "rgb(37,0,255)";
        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'audio')
                    track.enabled = true;
            })
        }

        mymuteicon.style.visibility = 'hidden';

        socket.emit('action', 'unmute');
    }
})

inviteParticipants.addEventListener('click', () => {
    
})

socket.on('action', (msg, sid) => {
    if (msg == 'mute') {
        console.log(sid + ' muted themself');
        document.querySelector(`#mute${sid}`).style.visibility = 'visible';
        micInfo[sid] = 'off';
    }
    else if (msg == 'unmute') {
        console.log(sid + ' unmuted themself');
        document.querySelector(`#mute${sid}`).style.visibility = 'hidden';
        micInfo[sid] = 'on';
    }
    else if (msg == 'videooff') {
        console.log(sid + 'turned video off');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'visible';
        videoInfo[sid] = 'off';
    }
    else if (msg == 'videoon') {
        console.log(sid + 'turned video on');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'hidden';
        videoInfo[sid] = 'on';
    }
})

// whiteboardButt.addEventListener('click', () => {
//     if (boardVisisble) {
//         whiteboardCont.style.visibility = 'hidden';
//         boardVisisble = false;
//     }
//     else {
//         whiteboardCont.style.visibility = 'visible';
//         boardVisisble = true;
//     }
// })

cutCall.addEventListener('click', () => {
    location.href = '/';
})