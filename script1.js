// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnvbxwW94UfEHHJEsVFFruyP20taJPqZo",
  authDomain: "video-confrence-9e131.firebaseapp.com",
  projectId: "video-confrence-9e131",
  storageBucket: "video-confrence-9e131.firebasestorage.app",
  messagingSenderId: "299971534260",
  appId: "1:299971534260:web:2a751958721d1181c3a6e1",
  measurementId: "G-YHZFY3TSMT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// WebRTC Configuration
const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};
const peerConnection = new RTCPeerConnection(servers);

// Select video elements
const selfVideo = document.getElementById('selfVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Firestore Document (Room ID)
const callDoc = db.collection('calls').doc('videoCallRoom');
const offerCandidates = callDoc.collection('offerCandidates');
const answerCandidates = callDoc.collection('answerCandidates');

// Media Streams
let localStream = null;
let remoteStream = new MediaStream();
remoteVideo.srcObject = remoteStream;

// Access local media (self-view)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then((stream) => {
    console.log('Local stream started');
    localStream = stream;
    selfVideo.srcObject = stream;

    // Add local stream tracks to the peer connection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  })
  .catch((error) => {
    console.error('Error accessing media devices:', error);
    alert("Could not access camera or microphone.");
  });

// Handle Remote Stream
peerConnection.ontrack = (event) => {
  event.streams[0].getTracks().forEach((track) => {
    remoteStream.addTrack(track);
  });
  console.log('Remote stream received');
};

// Collect ICE candidates and send them to Firestore
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    offerCandidates.add(event.candidate.toJSON());
    console.log('ICE candidate sent');
  }
};

// Offer/Answer Logic
async function makeCall() {
  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);

  // Save offer to Firestore
  const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
  await callDoc.set({ offer });

  console.log('Offer created and sent to Firestore');

  // Listen for answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
      console.log('Answer received and set');
    }
  });

  // Listen for ICE candidates from the other user
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
        console.log('ICE candidate added from answerCandidates');
      }
    });
  });
}

async function answerCall() {
  callDoc.onSnapshot(async (snapshot) => {
    const data = snapshot.data();
    if (data?.offer) {
      const offerDescription = new RTCSessionDescription(data.offer);
      await peerConnection.setRemoteDescription(offerDescription);

      const answerDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answerDescription);

      // Save answer to Firestore
      const answer = { sdp: answerDescription.sdp, type: answerDescription.type };
      await callDoc.update({ answer });

      console.log('Answer created and sent to Firestore');
    }
  });

  // Listen for ICE candidates from the caller
  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
        console.log('ICE candidate added from offerCandidates');
      }
    });
  });

  // Collect ICE candidates for this user
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      answerCandidates.add(event.candidate.toJSON());
      console.log('Sending ICE candidate from answer');
    }
  };
}

// Determine if the user is the caller or receiver
const isCaller = confirm("Do you want to make the call?");
if (isCaller) {
  makeCall();
} else {
  answerCall();
}

// Draggable Self View Logic
const selfView = document.querySelector('.self-view');
let isDragging = false, startX, startY, initialX, initialY;

selfView.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  initialX = selfView.offsetLeft;
  initialY = selfView.offsetTop;
  selfView.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  
  // Constrain movement within the screen, accounting for the bottom gap
  const containerRect = document.body.getBoundingClientRect();
  const selfRect = selfView.getBoundingClientRect();

  const newX = Math.min(
    containerRect.width - selfRect.width,
    Math.max(0, initialX + dx)
  );
  const newY = Math.min(
    containerRect.height - selfRect.height - 20, /* Adjusted for bottom gap */
    Math.max(0, initialY + dy)
  );

  selfView.style.left = `${newX}px`;
  selfView.style.top = `${newY}px`;
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  selfView.style.cursor = 'grab';
});

// Adjust Popup Position on Resize
window.addEventListener('resize', () => {
  const containerRect = document.body.getBoundingClientRect();
  const selfRect = selfView.getBoundingClientRect();

  if (selfRect.right > containerRect.width) {
    selfView.style.left = `${containerRect.width - selfRect.width}px`;
  }
  if (selfRect.bottom > containerRect.height - 20) { // Adjust for bottom gap
    selfView.style.top = `${containerRect.height - selfRect.height - 20}px`;
  }
});
