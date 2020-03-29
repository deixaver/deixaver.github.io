const videoContainer = document.getElementById("videos");

function newVideoElement(stream) {
	const video = document.createElement("video");
	videoContainer.appendChild(video);
	video.autoplay = true;
	video.playsInline = true;
	video.muted = true;
	video.controls = true;
	video.srcObject = stream;
	video.addEventListener("dblclick", function (e) {
		if (e.target.className === "fullscreen") {
			e.target.className = "";
		} else {
			e.target.className = "fullscreen";
		}
	});
	video.play().catch(function (_error) { });
	video.controls = false;
	updateGridLayout();
	return video;
}

function deleteVideoElement(video) {
	videoContainer.removeChild(video);
}

function updateGridLayout() {
	const videoCount = videoContainer.childElementCount;
	const columns = Math.max(Math.ceil(Math.sqrt(videoCount)), 1);
	videoContainer.style = "grid-template-columns:" + "1fr ".repeat(columns);
}

function createRtcConnection(targetUserId, isIn, isScreen) {
	//https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
	const pc = new RTCPeerConnection({
		iceServers: [{
			urls: [
				"stun:stun1.l.google.com:19302",
				"stun:stun2.l.google.com:19302",
			],
		}],
		iceCandidatePoolSize: 10,
	});

	pc.onicecandidate = function (e) {
		api.sendIceCandidate(targetUserId, { fromIn: isIn, fromScreen: isScreen, candidate: e.candidate });
	};
	pc.onnegotiationneeded = async function () {
		const offer = await pc.createOffer({
			offerToReceiveAudio: 0,
			offerToReceiveVideo: 1
		});
		await pc.setLocalDescription(offer);
		api.sendDescription(targetUserId, { fromIn: isIn, fromScreen: isScreen, description: pc.localDescription });
	};

	return pc;
}

function newConnection(targetUserId, isScreen) {
	const c = {
		targetUserId: targetUserId,
		isScreen: isScreen,
		isFullscreen: false,
		pcIn: null,
		pcOut: null,
		video: null,
	};
	return c;
}

function addInConnection(connection, onTrack) {
	if (connection.pcIn == null) {
		connection.pcIn = createRtcConnection(connection.targetUserId, true, connection.isScreen);
		connection.pcIn.ontrack = function (e) {
			if (connection.video === null) {
				connection.video = newVideoElement(e.streams[0]);
				onTrack();
			}
		};
	}
}

function addOutConnection(connection) {
	if (connection.pcOut == null) {
		connection.pcOut = createRtcConnection(connection.targetUserId, false, connection.isScreen);
	}
}

function removeInConnection(connection) {
	if (connection.pcIn != null) {
		connection.pcIn.close();
		connection.pcIn = null;
	}

	if (connection.video != null) {
		deleteVideoElement(connection.video);
		connection.video = null;
		updateGridLayout();
	}
}

function removeOutConnection(connection) {
	if (connection.pcOut != null) {
		connection.pcOut.close();
		connection.pcOut = null;
	}
}

function deleteConnection(connection) {
	connection.isFullscreen = false;

	removeInConnection(connection);
	removeOutConnection(connection);
}
