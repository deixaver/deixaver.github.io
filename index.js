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
	onPeerJoined: function (userId) {
		const c = newConnection();
		state.connections[userId] = c;

		if (state.stream != null) {
			addOutConnection(c);
			state.stream.getTracks().forEach((track) => c.pcOut.addTrack(track, state.stream));

			api.sendShareScreen();
		}
	},
	onPeerLeft: function (userId) {
		const c = state.connections[userId];
		if (c != null) {
			destroyConnection(c);
		}
	},
	onPeerShareScreen: function (userId) {
		console.log("SHARE SCEREN");
		const c = state.connections[userId];
		if (c != null) {
			console.log("ADD CONNECTIN");
			addInConnection(c);
		}
	},
	onIceCandidate: async function (eventData, userId) {
		const c = state.connections[userId];
		if (c != null) {
			const pc = eventData.fromIn ? c.pcOut : c.pcIn;
			pc.addIceCandidate(eventData.candidate);
		}
	},
	onDescription: async function (eventData, userId) {
		const c = state.connections[userId];
		if (c == null) {
			return;
		}
		const pc = eventData.fromIn ? c.pcOut : c.pcIn;

		if (eventData.description.type === "offer") {
			await pc.setRemoteDescription(eventData.description);
			if (state.stream != null) {
				state.stream.getTracks().forEach((track) => pc.addTrack(track, state.stream));
			}
			await pc.setLocalDescription(await pc.createAnswer());
			api.sendDescription({ fromIn: true, description: pc.localDescription });
		} else if (eventData.description.type === "answer") {
			await pc.setRemoteDescription(eventData.description);
		} else {
			console.error("Unsupported SDP type.");
		}
	},

	sendShareScreen: function () { },
	sendIceCandidate: function () { },
	sendDescription: function () { },
}
