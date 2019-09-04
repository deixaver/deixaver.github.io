const videosContainer = document.getElementById("videos");

function newConnection(hasOut) {
	const cIn = newOneWayConnection(false);
	//const cOut = hasOut ? newOneWayConnection(true) : null;
	const cOut = newOneWayConnection(true);
	
	const connection = { cIn: cIn, cOut: cOut, video: null };

	connection.ontrack = function (e) {
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
	connection.cIn.close();
	if (connection.cOut != null) {
		connection.cOut.close();
	}
	if (connection.video != null) {
		connection.video.remove();
	}
}

function newOneWayConnection(isOut) {
	const c = new RTCPeerConnection({ iceServers: iceServers });

	c.onicecandidate = function (e) {
		api.sendIceCandidate(isOut, e.candidate);
	};
	c.onnegotiationneeded = async function () {
		await c.setLocalDescription(await c.createOffer());
		api.sendDescription(isOut, c.localDescription);
	};

	return c;
}

function getConnection(user_id, isOut) {
	const c = state.connections[user_id];
	if (c == null) {
		return null;
	}
	return isOut ? c.cOut : c.cIn;
}