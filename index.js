const version = "0.5";

const screenMaxHeight = 720;
const cameraMaxHeight = 120;

const state = {
	screenConnections: {},
	cameraConnections: {},
	screenStream: null,
	cameraStream: null,
}

const api = {
	shareScreen: async function (shareCamera) {
		try {
			const screenMaxWidth = screenMaxHeight * 16.0 / 9.0;
			state.screenStream = await navigator.mediaDevices.getDisplayMedia({
				audio: false,
				video: {
					cursor: "always",
					width: { max: screenMaxWidth },
					height: { max: screenMaxHeight },
					frameRate: 10.0,
				},
			});
			newVideoElement(state.screenStream);
		} catch { }

		try {
			if (shareCamera) {
				const cameraMaxWidth = cameraMaxHeight * 16.0 / 9.0;
				state.cameraStream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: {
						width: cameraMaxWidth,
						height: cameraMaxHeight,
						frameRate: 10.0,
					},
				});
				const cameraVideo = newVideoElement(state.cameraStream);
				cameraVideo.style = "transform: scale(-1, 1)";
			}
		} catch { }
	},
	onPeerJoined: function (userId) {
		const sc = newConnection(userId, true);
		state.screenConnections[userId] = sc;
		const cc = newConnection(userId, false);
		state.cameraConnections[userId] = cc;

		const sendVideo = function (c, stream, maxHeight) {
			addOutConnection(c);
			stream.getTracks().forEach(function (track) {
				const sender = c.pcOut.addTrack(track, stream);
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
			api.sendShareVideo(userId, { fromScreen: c.isScreen });
		};

		if (state.screenStream != null) {
			sendVideo(sc, state.screenStream, screenMaxHeight);
		}
		if (state.cameraStream != null) {
			sendVideo(cc, state.cameraStream, cameraMaxHeight);
		}
	},
	onPeerLeft: function (userId) {
		const sc = state.screenConnections[userId];
		if (sc != null) {
			deleteConnection(sc);
		}
		const cc = state.cameraConnections[userId];
		if (cc != null) {
			deleteConnection(cc);
		}
	},
	onPeerShareVideo: function (userId, eventData) {
		const c = eventData.fromScreen ?
			state.screenConnections[userId] :
			state.cameraConnections[userId];
		if (c != null) {
			addInConnection(c);
		}
	},
	onIceCandidate: async function (userId, eventData) {
		const c = eventData.fromScreen ?
			state.screenConnections[userId] :
			state.cameraConnections[userId];
		if (c != null) {
			const pc = eventData.fromIn ? c.pcOut : c.pcIn;
			pc.addIceCandidate(eventData.candidate);
		}
	},
	onDescription: async function (userId, eventData) {
		const c = eventData.fromScreen ?
			state.screenConnections[userId] :
			state.cameraConnections[userId];
		if (c == null) {
			return;
		}
		const pc = eventData.fromIn ? c.pcOut : c.pcIn;

		if (eventData.description.type === "offer") {
			await pc.setRemoteDescription(eventData.description);
			if (state.screenStream != null) {
				state.screenStream.getTracks().forEach((track) => pc.addTrack(track, state.screenStream));
			}
			await pc.setLocalDescription(await pc.createAnswer());
			api.sendDescription(userId, { fromIn: true, fromScreen: c.isScreen, description: pc.localDescription });
		} else if (eventData.description.type === "answer") {
			await pc.setRemoteDescription(eventData.description);
		} else {
			console.error("unsupported sdp type");
		}
	},

	sendShareVideo: function () { },
	sendIceCandidate: function () { },
	sendDescription: function () { },
}
