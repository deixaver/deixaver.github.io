//https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
const iceServers = [
	{ urls: "stun:stun.l.google.com:19302" },
	// { urls: "stun:stun1.l.google.com: 19302" },
	// { urls: "stun:stun2.l.google.com: 19302" },
	// { urls: "stun:stun3.l.google.com: 19302" },
	// { urls: "stun:stun4.l.google.com: 19302" },
];

function newConnection() {
	const pc = new RTCPeerConnection({ iceServers: iceServers });
	const connection = { pc: pc, video: null };

	pc.onicecandidate = function (e) {
		api.sendIceCandidate(e.candidate);
	};
	pc.onnegotiationneeded = async function () {
		await pc.setLocalDescription(await pc.createOffer());
		api.sendDescription(pc.localDescription);
	};
	pc.ontrack = function (e) {
		if (connection.video == null) {
			connection.video = document.createElement("video");
			connection.video.autoplay = true;
			videosContainer.appendChild(connection.video);
		}

		if (connection.video.srcObject !== e.streams[0]) {
			connection.video.srcObject = e.streams[0];
		}
	};

	return connection;
}

function deleteConnection(connection) {
	connection.pc.close();
	if (connection.video != null) {
		connection.video.remove();
	}
}

function getConnection(user_id) {
	const c = state.connections[user_id];
	return c != null ? c.pc : null;
}