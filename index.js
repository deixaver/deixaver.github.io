const version = "0.1";

const state = {
	local_user_id: 0,
	connections: {},
	stream: null,
}

//https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
const iceServers = [
	{ urls: "stun:stun.l.google.com:19302" },
	// { urls: "stun:stun1.l.google.com: 19302" },
	// { urls: "stun:stun2.l.google.com: 19302" },
	// { urls: "stun:stun3.l.google.com: 19302" },
	// { urls: "stun:stun4.l.google.com: 19302" },
];

const videosContainer = document.getElementById("videos");

function newOneWayConnection(isOut, videoElement) {
	const c = new RTCPeerConnection({ iceServers: iceServers });

	c.onicecandidate = function (e) {
		api.sendIceCandidate(isOut, e.candidate);
	};
	c.onnegotiationneeded = async function () {
		await c.setLocalDescription(await c.createOffer());
		api.sendDescription(isOut, c.localDescription);
	};
	c.ontrack = function (e) {
		if (videoElement.srcObject !== e.streams[0]) {
			videoElement.srcObject = e.streams[0];
		}
	};

	return c;
}

function getConnection(user_id, isOut) {
	const c = state.connections[user_id];
	return isOut ? c.cOut : c.cIn;
}

const api = {
	start: async function () {
		try {
			state.stream = await navigator.mediaDevices.getDisplayMedia({
				video: { cursor: "always" },
				audio: false
			});
		} catch { }

		console.log("start!");
	},
	onConnected: function (local_user_id) {
		state.local_user_id = local_user_id;
	},
	onPeerJoined: function (user_id) {
		if (user_id === state.local_user_id) {
			return;
		}

		const videoElement = document.createElement("video");
		videoElement.autoplay = true;
		videosContainer.appendChild(videoElement);

		const connection = {
			cIn: newOneWayConnection(false, videoElement),
			cOut: newOneWayConnection(true, videoElement),
			video: videoElement,
		};
		state.connections[user_id] = connection;

		if (state.stream != null) {
			state.stream.getTracks().forEach((track) => connection.cOut.addTrack(track, state.stream));
		}
	},
	onPeerLeft: function (user_id) {
		if (user_id === state.local_user_id) {
			return;
		}

		const connection = state.connections[user_id];
		connection.cIn.close();
		connection.cOut.close();
		connection.video.remove();
	},
	onIceCandidate: async function (isOut, candidate, user_id) {
		getConnection(user_id, isOut).addIceCandidate(candidate);
	},
	onDescription: async function (isOut, desc, user_id) {
		const c = getConnection(user_id, isOut);
		if (desc.type === "offer") {
			await c.setRemoteDescription(desc);
			if (state.stream != null) {
				state.stream.getTracks().forEach((track) => c.addTrack(track, state.stream));
			}
			await c.setLocalDescription(await c.createAnswer());
			api.sendDescription(isOut, c.localDescription);
		} else if (desc.type === "answer") {
			await c.setRemoteDescription(desc);
		} else {
			console.error("Unsupported SDP type.");
		}
	},

	sendIceCandidate: function () { },
	sendDescription: function () { },
}
