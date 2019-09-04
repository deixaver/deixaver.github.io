const version = "0.1";

const state = {
	connections: {},
	stream: null,
}

const videosContainer = document.getElementById("videos");

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
		const connection = state.connections[user_id];
		if (connection != null) {
			deleteConnection(connection);
		}
	},
	onIceCandidate: async function (candidate, user_id) {
		const pc = getConnection(user_id);
		if (pc != null) {
			pc.addIceCandidate(candidate);
		}
	},
	onDescription: async function (desc, user_id) {
		const pc = getConnection(user_id);
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
