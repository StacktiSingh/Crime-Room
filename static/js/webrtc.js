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
  startCallBtn.addEventListener("click", startVideoCall);
  endCallBtn.addEventListener("click", endVideoCall);
  const callModal = document.getElementById("incomingCallModal");
  const callerNameText = document.getElementById("callerNameText");

  let partnerSocketId = null;

  // Join room
  socket.emit("join", { username, room });

  socket.on("message", data => {
    const box = document.getElementById("chat-box");
    const el = document.createElement("p");
    el.className = "text-sm py-1";
    el.innerHTML = `<span class="text-pink-400 font-semibold">${data.username || 'System'}</span>: ${data.text || data.msg}`;
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
      startCallBtn.textContent = "📞 Calling...";

      console.log("Starting call to room:", room);
      socket.emit("start-call", { room, from: username });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  }

  // 📞 Receiver gets incoming call popup
  socket.on("incoming-call", ({ from, callerSocket }) => {
    console.log("Incoming call from:", from, "Socket:", callerSocket);
    partnerSocketId = callerSocket;
    callerNameText.innerText = `From: ${from}`;
    callModal.classList.remove("hidden");
  });

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
      startCallBtn.classList.add("hidden");

      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;

      peerConnection = new RTCPeerConnection(config);

      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = ({ streams }) => {
        remoteVideo.srcObject = streams[0];
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
      alert("Could not accept call. Please check camera/microphone permissions.");
    }
  }

  function rejectCall() {
    callModal.classList.add("hidden");
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
    
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    
    startCallBtn.classList.remove("hidden");
    startCallBtn.textContent = "📞 Start Video Call";
    
    socket.emit("end-call", { room });
  }

  socket.on("call-ended", () => {
    endVideoCall();
  });

  // 📞 Caller gets notified that call was accepted
  socket.on("call-accepted", async ({ from, accepterSocket }) => {
    partnerSocketId = accepterSocket;
    // Now create the offer and send it
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = ({ streams }) => {
      remoteVideo.srcObject = streams[0];
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
    alert(`${from} rejected your call`);
    endVideoCall();
  });