const version = "0.6";

const screenMaxHeightLow = 120;
const screenMaxHeightHigh = 960;
const cameraMaxHeight = 120;

const state = {
	screenConnections: {},
	cameraConnections: {},
	screenStream: null,
	cameraStream: null,
	screenVideo: null,
	cameraVideo: null,
	waitingOnShareAccept: false,
}

const api = {
	onPeerJoined: function (userId) {
		let sc = state.screenConnections[userId];
		if (sc == null) {
			sc = newConnection(userId, true);
			state.screenConnections[userId] = sc;
		}
		let cc = state.cameraConnections[userId];
		if (cc == null) {
			cc = newConnection(userId, false);
			state.cameraConnections[userId] = cc;
		}

		if (state.screenVideo != null) {
			addOutConnection(sc);
			addStreamTracks(sc.pcOut, state.screenStream, screenMaxHeightLow);
			api.sendShareVideo(userId, { fromScreen: true });
		}
		if (state.cameraVideo != null) {
			addOutConnection(cc);
			addStreamTracks(cc.pcOut, state.cameraStream, cameraMaxHeight);
			api.sendShareVideo(userId, { fromScreen: false });
		}
	},
	onPeerLeft: function (userId) {
		const sc = state.screenConnections[userId];
		if (sc != null) {
			deleteConnection(sc);
			state.screenConnections[userId] = null;
			delete state.screenConnections[userId];
		}
		const cc = state.cameraConnections[userId];
		if (cc != null) {
			deleteConnection(cc);
			state.cameraConnections[userId] = null;
			delete state.cameraConnections[userId];
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
	onPeerStopVideo: function (userId, eventData) {
		const c = eventData.fromScreen ?
			state.screenConnections[userId] :
			state.cameraConnections[userId];
		if (c != null) {
			removeInConnection(c);
		}
	},
	onPeerRequestScreenResolution: function (userId, eventData) {
		if (state.screenVideo == null) {
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
			if (pc != null) {
				try {
					pc.addIceCandidate(eventData.candidate);
				} catch {
				}
			}
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
			try {
				await pc.setLocalDescription(await pc.createAnswer());
				api.sendDescription(userId, { fromIn: true, fromScreen: c.isScreen, description: pc.localDescription });
			} catch {
			}
		} else if (eventData.description.type === "answer") {
			await pc.setRemoteDescription(eventData.description);
		} else {
			console.error("unsupported sdp type");
		}
	},

	sendShareVideoAll: function () { },
	sendShareVideo: function () { },
	sendStopVideoAll: function () { },
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

function api_init() {
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

	document.addEventListener('keydown', async function (event) {
		if (state.waitingOnShareAccept) {
			return;
		}
		state.waitingOnShareAccept = true;

		// S
		if (event.keyCode == 83) {
			if (state.screenVideo != null) {
				stopScreenShare();
			} else {
				await shareScreen();
			}
		}
		// C
		else if (event.keyCode == 67) {
			if (state.cameraVideo != null) {
				stopCameraShare();
			} else {
				await shareCamera();
			}
		}

		state.waitingOnShareAccept = false;
	});
}

async function shareScreen() {
	if (state.screenStream == null) {
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
		} catch {
			return;
		}
	}

	state.screenVideo = newVideoElement(state.screenStream);

	for (let k in state.screenConnections) {
		const c = state.screenConnections[k];
		addOutConnection(c);
		addStreamTracks(c.pcOut, state.screenStream, screenMaxHeightLow);
	}

	api.sendShareVideoAll({ fromScreen: true });
}

function stopScreenShare() {
	deleteVideoElement(state.screenVideo);
	state.screenVideo = null;

	for (let k in state.screenConnections) {
		const c = state.screenConnections[k];
		removeOutConnection(c);
	}

	api.sendStopVideoAll({ fromScreen: true });
}

async function shareCamera() {
	if (state.cameraStream == null) {
		try {
			const cameraMaxWidth = cameraMaxHeight * 16.0 / 9.0;
			state.cameraStream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					width: cameraMaxWidth,
					height: cameraMaxHeight,
					frameRate: 10.0,
				},
			});
		} catch {
			return;
		}
	}

	state.cameraVideo = newVideoElement(state.cameraStream);
	state.cameraVideo.style = "transform: scale(-1, 1)";

	for (let k in state.cameraConnections) {
		const c = state.cameraConnections[k];
		addOutConnection(c);
		addStreamTracks(c.pcOut, state.cameraStream, cameraMaxHeight);
	}

	api.sendShareVideoAll({ fromScreen: false });
}

function stopCameraShare() {
	deleteVideoElement(state.cameraVideo);
	state.cameraVideo = null;

	for (let k in state.cameraConnections) {
		const c = state.cameraConnections[k];
		removeOutConnection(c);
	}

	api.sendStopVideoAll({ fromScreen: false });
}