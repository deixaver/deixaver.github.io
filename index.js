const version = "0.1";

const state = {
	connections: {},
	stream: null,
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
		const c = newConnection(state.stream != null);
		state.connections[user_id] = c;

		if (state.stream != null) {
			state.stream.getTracks().forEach((track) => c.addTrack(track, state.stream));
		}
	},
	onPeerLeft: function (user_id) {
		const c = state.connections[user_id];
		if (c != null) {
			destroyConnection(c);
		}
	},
	onIceCandidate: async function (candidate, user_id) {
		const c = state.connections[user_id];
		if (c != null) {
			c.pcIn.addIceCandidate(candidate);
		}
	},
	onDescription: async function (desc, user_id) {
		const c = state.connections[user_id];
		if (c == null) {
			return;
		}

		if (desc.type === "offer") {
			await c.pcOut.setRemoteDescription(desc);
			if (state.stream != null) {
				state.stream.getTracks().forEach((track) => c.pcOut.addTrack(track, state.stream));
			}
			await c.pcOut.setLocalDescription(await c.pcOut.createAnswer());
			api.sendDescription(c.pcOut.localDescription);
		} else if (desc.type === "answer") {
			await c.pcIn.setRemoteDescription(desc);
		} else {
			console.error("Unsupported SDP type.");
		}
	},

	sendIceCandidate: function () { },
	sendDescription: function () { },
}
