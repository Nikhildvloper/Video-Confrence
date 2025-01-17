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
