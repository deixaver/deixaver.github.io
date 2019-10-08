const version = "0.5";

const maxHeight = 720;

const state = {
	connections: {},
	stream: null,
}

const api = {
	shareScreen: async function () {
		try {
			state.stream = await navigator.mediaDevices.getDisplayMedia({
				audio: false,
				video: {
					cursor: "always",
					width: maxHeight * 16.0 / 9.0,
					height: maxHeight,
					frameRate: 10.0,
				},
			});
			// state.stream = await navigator.mediaDevices.getUserMedia({
			// 	audio: false,
			// 	video: {
			// 		width: maxHeight * 16.0 / 9.0,
			// 		height: maxHeight,
			// 		frameRate: 10.0,
			// 	},
			// });
			newVideoElement(state.stream);
		} catch { }
	},
	onPeerJoined: function (userId) {
		const c = newConnection(userId);
		state.connections[userId] = c;

		if (state.stream != null) {
			addOutConnection(c);
			state.stream.getTracks().forEach(function (track) {
				const sender = c.pcOut.addTrack(track, state.stream);
				const trackHeight = track.getSettings().height;
				const scaleDown = Math.max(trackHeight / maxHeight, 1.0);
				sender.setParameters({
					encodings: [
						{
							maxFramerate: 10.0,
							scaleResolutionDownBy: scaleDown,
						},
					],
				});
			});
			api.sendShareScreen(userId);
		}
	},
	onPeerLeft: function (userId) {
		const c = state.connections[userId];
		if (c != null) {
			deleteConnection(c);
		}
	},
	onPeerShareScreen: function (userId) {
		const c = state.connections[userId];
		if (c != null) {
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
			api.sendDescription(userId, { fromIn: true, description: pc.localDescription });
		} else if (eventData.description.type === "answer") {
			await pc.setRemoteDescription(eventData.description);
		} else {
			console.error("unsupported sdp type");
		}
	},

	sendShareScreen: function () { },
	sendIceCandidate: function () { },
	sendDescription: function () { },
}
