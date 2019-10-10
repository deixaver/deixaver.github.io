const version = "0.5";

const screenMaxHeightLow = 120;
const screenMaxHeightHigh = 960;
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
			const screenMaxWidth = screenMaxHeightHigh * 16.0 / 9.0;
			state.screenStream = await navigator.mediaDevices.getDisplayMedia({
				audio: false,
				video: {
					cursor: "always",
					width: { max: screenMaxWidth },
					height: { max: screenMaxHeightHigh },
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

		if (state.screenStream != null) {
			addOutConnection(sc);
			addStreamTracks(sc.pcOut, state.screenStream, screenMaxHeightLow);
			api.sendShareVideo(userId, { fromScreen: true });
		}
		if (state.cameraStream != null) {
			addOutConnection(cc);
			addStreamTracks(cc.pcOut, state.cameraStream, cameraMaxHeight);
			api.sendShareVideo(userId, { fromScreen: true });
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
		if (c == null) {
			return;
		}

		addInConnection(c, function () {
			if (!c.isScreen) {
				return;
			}

			c.video.addEventListener("dblclick", function () {
				c.isFullscreen = !c.isFullscreen;
				api.sendRequestScreenResolution(userId, { highResolution: c.isFullscreen });
			});
		});
	},
	onPeerRequestScreenResolution: function (userId, eventData) {
		if (state.screenStream == null) {
			return;
		}

		const c = state.screenConnections[userId];
		if (c == null) {
			return;
		}

		const maxHeight = eventData.highResolution ?
			screenMaxHeightHigh :
			screenMaxHeightLow;

		const senders = c.pcOut.getSenders();
		for (let sender of senders) {
			setSenderParameters(sender, maxHeight);
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
		if (pc == null) {
			return;
		}

		if (eventData.description.type === "offer") {
			await pc.setRemoteDescription(eventData.description);
			if (eventData.fromScreen) {
				const maxHeight = c.isFullscreen ?
					screenMaxHeightHigh :
					screenMaxHeightLow;
				addStreamTracks(pc, state.screenStream, maxHeight);
			} else {
				addStreamTracks(pc, state.cameraStream, cameraMaxHeight);
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
	sendRequestScreenResolution: function () { },
	sendIceCandidate: function () { },
	sendDescription: function () { },
}

function addStreamTracks(pc, stream, maxHeight) {
	if (stream != null) {
		for (let track of stream.getTracks()) {
			const sender = pc.addTrack(track, stream);
			setSenderParameters(sender, maxHeight);
		}
	}
}

function setSenderParameters(sender, maxHeight) {
	const trackHeight = sender.track.getSettings().height;
	const scaleDown = Math.max(trackHeight / maxHeight, 1.0);
	const parameters = sender.getParameters();
	if (parameters.encodings == null) {
		parameters.encodings = [{}];
	}
	if (parameters.encodings.length > 0) {
		parameters.encodings[0].maxFramerate = 10;
		parameters.encodings[0].scaleResolutionDownBy = scaleDown;
	}
	sender.setParameters(parameters).catch(function (_error) { });
}

document.addEventListener("visibilitychange", function () {
	const isVisible = document.visibilityState === 'visible';
	for (let k in state.screenConnections) {
		const c = state.screenConnections[k];
		if (!c.isFullscreen) {
			continue;
		}

		api.sendRequestScreenResolution(c.targetUserId, { highResolution: isVisible });
	}
});