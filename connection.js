const videoContainer = document.getElementById("videos");

function newVideoElement(stream) {
	const video = document.createElement("video");
	videoContainer.appendChild(video);
	video.autoplay = true;
	video.srcObject = stream;
	return video;
}

function createRtcConnection(targetUserId, isIn) {
	//https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
	const pc = new RTCPeerConnection({
		iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
	});

	pc.onicecandidate = function (e) {
		api.sendIceCandidate(targetUserId, { fromIn: isIn, candidate: e.candidate });
	};
	pc.onnegotiationneeded = async function () {
		await pc.setLocalDescription(await pc.createOffer());
		api.sendDescription(targetUserId, { fromIn: isIn, description: pc.localDescription });
	};

	return pc;
}

function newConnection(targetUserId) {
	const c = {
		targetUserId: targetUserId,
		pcIn: null,
		pcOut: null,
		screenVideo: null,
	};
	return c;
}

function addOutConnection(connection) {
	connection.pcOut = createRtcConnection(connection.targetUserId, false);
}

function addInConnection(connection) {
	connection.pcIn = createRtcConnection(connection.targetUserId, true);
	connection.pcIn.ontrack = function (e) {
		if (connection.screenVideo === null) {
			console.log("ADD IN CONNECTION", connection.targetUserId, "stream count:", e.streams.length);
			connection.screenVideo = newVideoElement(e.streams[0]);
		}
	};
}

function deleteConnection(connection) {
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
