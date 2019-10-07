const videoContainer = document.getElementById("videos");

function newConnection(hasOutConnection) {
	const createRtcConnection = function () {
		//https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
		const pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
		});

		pc.onicecandidate = function (e) {
			api.sendIceCandidate(e.candidate);
		};
		pc.onnegotiationneeded = async function () {
			await pc.setLocalDescription(await pc.createOffer());
			api.sendDescription(pc.localDescription);
		};

		return pc;
	}

	const connection = {
		pcIn: createRtcConnection(),
		pcOut: hasOutConnection ? createRtcConnection() : null,
		screenVideo: null,
	};

	connection.pcIn.ontrack = function (e) {
		if (connection.screenVideo !== null) {
			connection.screenVideo = document.createElement("video");
			videoContainer.appendChild(connection.screenVideo);
			connection.screenVideo.autoplay = true;
			connection.screenVideo.srcObject = e.streams[0];
		}
	};

	return pc;
}

function destroyConnection(connection) {
	if (connection.screenVideo !== null) {
		videoContainer.removeChild(connection.screenVideo);
	}

	if (connection.pcIn !== null) {
		connection.pcIn.close();
	}

	if (connection.pcOut !== null) {
		connection.pcOut.close();
	}
}
