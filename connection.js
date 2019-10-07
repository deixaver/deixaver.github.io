const videoContainer = document.getElementById("videos");

function createRtcConnection(isIn) {
	//https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
	const pc = new RTCPeerConnection({
		iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
	});

	pc.onicecandidate = function (e) {
		api.sendIceCandidate({ fromIn: isIn, candidate: e.candidate });
	};
	pc.onnegotiationneeded = async function () {
		await pc.setLocalDescription(await pc.createOffer());
		api.sendDescription({ fromIn: isIn, description: pc.localDescription });
	};

	return pc;
}

function newConnection() {
	const c = {
		pcIn: null,
		pcOut: null,
		screenVideo: null,
	};
	return c;
}

function addOutConnection(connection) {
	connection.pcOut = createRtcConnection(false);
}

function addInConnection(connection) {
	connection.pcIn = createRtcConnection(true);
	connection.pcIn.ontrack = function (e) {
		if (connection.screenVideo === null) {
			connection.screenVideo = document.createElement("video");
			videoContainer.appendChild(connection.screenVideo);
			connection.screenVideo.autoplay = true;
			connection.screenVideo.srcObject = e.streams[0];
		}
	};
}

function destroyConnection(connection) {
	if (connection.screenVideo != null) {
		videoContainer.removeChild(connection.screenVideo);
	}

	if (connection.pcIn != null) {
		connection.pcIn.close();
	}

	if (connection.pcOut != null) {
		connection.pcOut.close();
	}
}
