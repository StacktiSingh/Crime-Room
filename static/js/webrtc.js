const socket = io();
const username = document.getElementById("username").value;
const room = document.getElementById("roomCode").value;


  let peerConnection;
  let localStream;
  let remoteStream;
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const startCallBtn = document.getElementById("startCallBtn");
  const endCallBtn = document.getElementById("endCallBtn");
  const muteBtn = document.getElementById("muteBtn");
  const videoBtn = document.getElementById("videoBtn");
  const screenShareBtn = document.getElementById("screenShareBtn");
  const helpBtn = document.getElementById("helpBtn");
  const mediaControls = document.getElementById("mediaControls");
  const callStatus = document.getElementById("callStatus");
  const callStatusText = document.getElementById("callStatusText");
  const callTimer = document.getElementById("callTimer");
  const connectionQuality = document.getElementById("connectionQuality");
  
  startCallBtn.addEventListener("click", startVideoCall);
  endCallBtn.addEventListener("click", endVideoCall);
  muteBtn.addEventListener("click", toggleMute);
  videoBtn.addEventListener("click", toggleVideo);
  screenShareBtn.addEventListener("click", toggleScreenShare);
  helpBtn.addEventListener("click", showKeyboardShortcuts);
  
  const callModal = document.getElementById("incomingCallModal");
  const callerNameText = document.getElementById("callerNameText");

  let isAudioMuted = false;
  let isVideoOff = false;
  let isScreenSharing = false;
  let callStartTime = null;
  let callTimerInterval = null;

  let partnerSocketId = null;

  // Join room
  socket.emit("join", { username, room });

  // === KEYBOARD SHORTCUTS ===
  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when not typing in input fields
    if (e.target.tagName === 'INPUT') return;
    
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'm':
          e.preventDefault();
          if (!mediaControls.classList.contains('hidden')) {
            toggleMute();
          }
          break;
        case 'e':
          e.preventDefault();
          if (!endCallBtn.classList.contains('hidden')) {
            endVideoCall();
          }
          break;
        case 'd':
          e.preventDefault();
          if (!mediaControls.classList.contains('hidden')) {
            toggleVideo();
          }
          break;
      }
    }
  });

  function showKeyboardShortcuts() {
    showNotification("Shortcuts: Ctrl+M (Mute), Ctrl+D (Video), Ctrl+E (End Call)", 'info');
  }

  socket.on("message", data => {
    const box = document.getElementById("chat-box");
    const el = document.createElement("div");
    el.className = "chat-message fade-in";
    
    const isSystem = !data.username || data.username === 'System';
    const messageClass = isSystem ? 'text-secondary' : 'text-primary';
    const usernameClass = isSystem ? 'text-warning-color' : 'text-primary-color';
    
    el.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="w-8 h-8 rounded-full bg-gradient-secondary flex items-center justify-center text-sm font-bold">
          ${isSystem ? '🤖' : (data.username || 'U')[0].toUpperCase()}
        </div>
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-1">
            <span class="${usernameClass} font-semibold">${data.username || 'System'}</span>
            <span class="text-xs text-muted">${new Date().toLocaleTimeString()}</span>
          </div>
          <p class="${messageClass}">${data.text || data.msg}</p>
        </div>
      </div>
    `;
    
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  });

  function sendMessage() {
    const input = document.getElementById("msg-input");
    const text = input.value;
    if (text.trim()) {
      socket.emit("message", { text, username, room });
      input.value = '';
    }
  }

  function exitToLobby() {
    socket.emit("leave", { username, room });
    setTimeout(() => window.location.href = "/home", 300);
  }

  // --- VIDEO CALL LOGIC ---

  async function startVideoCall() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;

      startCallBtn.classList.add("hidden");
      endCallBtn.classList.remove("hidden");
      mediaControls.classList.remove("hidden");
      
      callStatus.classList.remove("hidden");
      callStatusText.textContent = "Calling...";

      console.log("Starting call to room:", room);
      socket.emit("start-call", { room, from: username });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      showNotification("Could not access camera/microphone. Please check permissions.", 'error');
      resetCallUI();
    }
  }

  // 📞 Receiver gets incoming call popup
  socket.on("incoming-call", ({ from, callerSocket }) => {
    console.log("Incoming call from:", from, "Socket:", callerSocket);
    partnerSocketId = callerSocket;
    callerNameText.innerText = `From: ${from}`;
    callModal.classList.remove("hidden");
    
    // Play ringtone sound (using Web Audio API)
    playRingtone();
  });

  // === SOUND EFFECTS ===
  function playRingtone() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Repeat ringtone every 2 seconds until answered/rejected
    window.ringtoneInterval = setInterval(() => {
      if (!callModal.classList.contains('hidden')) {
        const newOscillator = audioContext.createOscillator();
        const newGainNode = audioContext.createGain();
        
        newOscillator.connect(newGainNode);
        newGainNode.connect(audioContext.destination);
        
        newOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        newGainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        newOscillator.start();
        newOscillator.stop(audioContext.currentTime + 0.5);
      } else {
        clearInterval(window.ringtoneInterval);
      }
    }, 2000);
  }

  function stopRingtone() {
    if (window.ringtoneInterval) {
      clearInterval(window.ringtoneInterval);
    }
  }

  // 📞 Receiver gets the actual WebRTC offer
  socket.on("incoming-offer", async ({ from, offer, socketId }) => {
    window._incomingOffer = offer;
    
    // Set the remote description and create answer
    if (peerConnection && window._incomingOffer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(window._incomingOffer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("send-answer", { to: partnerSocketId, answer });
    }
  });

  async function acceptCall() {
    try {
      callModal.classList.add("hidden");
      stopRingtone();
      startCallBtn.classList.add("hidden");
      endCallBtn.classList.remove("hidden");
      mediaControls.classList.remove("hidden");
      
      callStatus.classList.remove("hidden");
      callStatusText.textContent = "Connecting...";

      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;

      peerConnection = new RTCPeerConnection(config);

      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = ({ streams }) => {
        remoteVideo.srcObject = streams[0];
        document.getElementById('remoteVideoStatus').classList.remove('hidden');
        callStatusText.textContent = "Connected";
        callStatus.className = "bg-green-600 text-white px-4 py-2 rounded-lg text-center mb-4";
        startCallTimer();
        monitorConnectionQuality();
        showNotification("Call connected!", 'success');
      };

      peerConnection.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", { to: partnerSocketId, candidate: e.candidate });
        }
      };

      // Tell the caller we accepted and they should send their offer
      socket.emit("call-accepted", { to: partnerSocketId, from: username });

    } catch (error) {
      console.error("Error accepting call:", error);
      showNotification("Could not accept call. Please check camera/microphone permissions.", 'error');
      resetCallUI();
    }
  }

  function rejectCall() {
    callModal.classList.add("hidden");
    stopRingtone();
    socket.emit("call-rejected", { to: partnerSocketId });
  }

  socket.on("receive-answer", async ({ answer }) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("ice-candidate", async ({ candidate }) => {
    if (candidate && peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

  // End call functionality
  function endVideoCall() {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    
    resetCallUI();
    stopCallTimer();
    
    socket.emit("end-call", { room });
    showNotification("Call ended", 'info');
  }

  function resetCallUI() {
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    
    startCallBtn.classList.remove("hidden");
    endCallBtn.classList.add("hidden");
    mediaControls.classList.add("hidden");
    callStatus.classList.add("hidden");
    connectionQuality.classList.add("hidden");
    document.getElementById('remoteVideoStatus').classList.add("hidden");
    
    startCallBtn.textContent = "📞 Start Video Call";
    startCallBtn.className = "btn-success px-8 py-4 text-lg font-semibold";
    callStatus.className = "glass px-6 py-4 rounded-2xl text-center mb-6 slide-up";
    
    // Reset button states
    isAudioMuted = false;
    isVideoOff = false;
    isScreenSharing = false;
    muteBtn.textContent = "🎤 Mute";
    muteBtn.className = "btn-muted px-6 py-3 font-semibold";
    videoBtn.textContent = "📹 Video Off";
    videoBtn.className = "btn-muted px-6 py-3 font-semibold";
    screenShareBtn.textContent = "🖥️ Share Screen";
    screenShareBtn.className = "btn-secondary px-6 py-3 font-semibold";
  }

  socket.on("call-ended", () => {
    resetCallUI();
    stopCallTimer();
    showNotification("Call ended by partner", 'info');
  });

  // 📞 Caller gets notified that call was accepted
  socket.on("call-accepted", async ({ from, accepterSocket }) => {
    partnerSocketId = accepterSocket;
    callStatusText.textContent = "Connecting...";
    document.getElementById('remoteUserName').textContent = from;
    
    // Now create the offer and send it
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = ({ streams }) => {
      remoteVideo.srcObject = streams[0];
      document.getElementById('remoteVideoStatus').classList.remove('hidden');
      callStatusText.textContent = "Connected";
      callStatus.className = "status-connected glass px-6 py-4 rounded-2xl text-center mb-6 slide-up";
      startCallTimer();
      monitorConnectionQuality();
      showNotification("Call connected!", 'success');
    };

    peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { to: partnerSocketId, candidate: e.candidate });
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("send-offer", { to: partnerSocketId, offer });
  });

  socket.on("call-rejected", ({ from }) => {
    showNotification(`${from} rejected your call`, 'error');
    endVideoCall();
  });

  // === MEDIA CONTROLS ===
  function toggleMute() {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        isAudioMuted = !audioTrack.enabled;
        muteBtn.textContent = isAudioMuted ? "🔇 Unmute" : "🎤 Mute";
        muteBtn.className = isAudioMuted ? 
          "btn-muted active px-6 py-3 font-semibold" :
          "btn-muted px-6 py-3 font-semibold";
      }
    }
  }

  function toggleVideo() {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        isVideoOff = !videoTrack.enabled;
        videoBtn.textContent = isVideoOff ? "📹 Video On" : "📹 Video Off";
        videoBtn.className = isVideoOff ? 
          "btn-muted active px-6 py-3 font-semibold" :
          "btn-muted px-6 py-3 font-semibold";
      }
    }
  }

  async function toggleScreenShare() {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        
        // Replace video track in peer connection
        if (peerConnection) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        localVideo.srcObject = screenStream;
        isScreenSharing = true;
        screenShareBtn.textContent = "🖥️ Stop Sharing";
        screenShareBtn.className = "btn-danger px-6 py-3 font-semibold";
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
        
      } catch (error) {
        console.error("Error sharing screen:", error);
        showNotification("Could not share screen", 'error');
      }
    } else {
      stopScreenShare();
    }
  }

  async function stopScreenShare() {
    if (localStream && peerConnection) {
      const videoTrack = localStream.getVideoTracks()[0];
      const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }
    
    localVideo.srcObject = localStream;
    isScreenSharing = false;
    screenShareBtn.textContent = "🖥️ Share Screen";
    screenShareBtn.className = "btn-secondary px-6 py-3 font-semibold";
  }

  // === CALL TIMER ===
  function startCallTimer() {
    callStartTime = Date.now();
    callTimerInterval = setInterval(() => {
      const elapsed = Date.now() - callStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      callTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function stopCallTimer() {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }
    callTimer.textContent = "";
  }

  // === NOTIFICATIONS ===
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type} fixed top-24 right-6 z-50 px-6 py-4 text-white transition-all duration-500 transform translate-x-full`;
    
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="text-xl">${icon}</span>
        <span class="font-semibold">${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Slide out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  }

  // === CONNECTION QUALITY MONITORING ===
  function monitorConnectionQuality() {
    if (!peerConnection) return;
    
    setInterval(async () => {
      const stats = await peerConnection.getStats();
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const packetsLost = report.packetsLost || 0;
          const packetsReceived = report.packetsReceived || 0;
          const lossRate = packetsLost / (packetsLost + packetsReceived);
          
          const qualityIndicator = document.getElementById('qualityIndicator');
          const qualityText = document.getElementById('qualityText');
          
          qualityIndicator.className = 'w-2 h-2 rounded-full';
          if (lossRate < 0.02) {
            qualityIndicator.classList.add('quality-excellent', 'bg-green-400');
            qualityText.textContent = 'Excellent';
          } else if (lossRate < 0.05) {
            qualityIndicator.classList.add('quality-good', 'bg-yellow-400');
            qualityText.textContent = 'Good';
          } else {
            qualityIndicator.classList.add('quality-poor', 'bg-red-400');
            qualityText.textContent = 'Poor';
          }
          
          connectionQuality.classList.remove('hidden');
        }
      });
    }, 2000);
  }