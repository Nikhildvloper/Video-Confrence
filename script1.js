// Firebase Configuration (using your provided details)
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
    { urls: "stun:stun.l.google.com:19302" } // STUN server for NAT traversal
  ]
};
const peerConnection = new RTCPeerConnection(servers);

// HTML Elements
const selfVideo = document.getElementById('selfVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Firestore Document (Room ID)
const callDoc = db.collection('calls').doc('videoCallRoom');
const offerCandidates = callDoc.collection('offerCandidates');
const answerCandidates = callDoc.collection('answerCandidates');

// Media Streams
let localStream = null;
let remoteStream = null;

// Access Camera and Microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    // Set up local video
    localStream = stream;
    selfVideo.srcObject = stream;

    // Add local stream tracks to the peer connection
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  })
  .catch(error => console.error('Error accessing media devices:', error));

// Set up Remote Stream
remoteStream = new MediaStream();
remoteVideo.srcObject = remoteStream;
peerConnection.ontrack = event => {
  event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
};

// Collect ICE candidates and send them to Firestore
peerConnection.onicecandidate = event => {
  if (event.candidate) {
    offerCandidates.add(event.candidate.toJSON());
  }
};

// Offer/Answer Logic
async function makeCall() {
  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);

  // Save offer to Firestore
  const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
  await callDoc.set({ offer });

  // Listen for answer
  callDoc.onSnapshot(snapshot => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
    }
  });

  // Listen for ICE candidates from the other user
  answerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });
}

async function answerCall() {
  callDoc.onSnapshot(async snapshot => {
    const data = snapshot.data();
    if (data?.offer) {
      const offerDescription = new RTCSessionDescription(data.offer);
      await peerConnection.setRemoteDescription(offerDescription);

      const answerDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answerDescription);

      // Save answer to Firestore
      const answer = { sdp: answerDescription.sdp, type: answerDescription.type };
      await callDoc.update({ answer });
    }
  });

  // Listen for ICE candidates from the caller
  offerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });

  // Collect ICE candidates for this user
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      answerCandidates.add(event.candidate.toJSON());
    }
  };
}

// Choose action based on user role
const isCaller = confirm("Do you want to make the call?");
if (isCaller) {
  makeCall();
} else {
  answerCall();
  }
