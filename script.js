// Select video elements
const selfVideo = document.getElementById('selfVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Access local media (self-view)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then((stream) => {
    selfVideo.srcObject = stream;

    // Simulate remote video for testing purposes
    remoteVideo.srcObject = stream; // Replace with remote peer stream in production
  })
  .catch((error) => {
    console.error('Error accessing media devices:', error);
  });

// Make the self-view draggable
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
  selfView.style.left = `${initialX + dx}px`;
  selfView.style.top = `${initialY + dy}px`;
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  selfView.style.cursor = 'grab';
});
