const version = "0.1";

const state = {
	connections: {},
	stream: null,
}

const videoElement = connection.video = document.getElementsByTagName("video")[0];

function newConnection() {
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
	pc.ontrack = function (e) {
		if (videoElement.srcObject !== e.streams[0]) {
			videoElement.srcObject = e.streams[0];
		}
	};

	return pc;
}

const api = {
	shareScreen: async function () {
		try {
			state.stream = await navigator.mediaDevices.getDisplayMedia({
				video: { cursor: "always" },
				audio: false
			});
		} catch { }
	},
	onPeerJoined: function (user_id) {
		const connection = newConnection(state.stream != null);
		state.connections[user_id] = connection;

		if (state.stream != null) {
			state.stream.getTracks().forEach((track) => connection.pc.addTrack(track, state.stream));
		}
	},
	onPeerLeft: function (user_id) {
		const pc = state.connections[user_id];
		if (pc != null) {
			pc.close();
		}
	},
	onIceCandidate: async function (candidate, user_id) {
		const pc = state.connections[user_id];
		if (pc != null) {
			pc.addIceCandidate(candidate);
		}
	},
	onDescription: async function (desc, user_id) {
		const pc = state.connections[user_id];
		if (pc == null) {
			return;
		}

		if (desc.type === "offer") {
			await pc.setRemoteDescription(desc);
			if (state.stream != null) {
				state.stream.getTracks().forEach((track) => pc.addTrack(track, state.stream));
			}
			await pc.setLocalDescription(await pc.createAnswer());
			api.sendDescription(pc.localDescription);
		} else if (desc.type === "answer") {
			await pc.setRemoteDescription(desc);
		} else {
			console.error("Unsupported SDP type.");
		}
	},

	sendIceCandidate: function () { },
	sendDescription: function () { },
}
