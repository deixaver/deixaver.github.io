const client = new Photon.LoadBalancing.LoadBalancingClient(Photon.ConnectionProtocol.Wss, "8327ad7d-7bfc-440a-af7c-f8014fd196b5", version);

const event_ice_candidate = 1;
const event_description = 2;

client.onStateChange = function (state) {
	if (client.isInLobby()) {
		client.joinRoom(window.location.pathname, { createIfNotExists: true }, {});
	}

	if (state == Photon.LoadBalancing.LoadBalancingClient.State.Joined) {
		api.onConnected(client.myActor().actorNr);
		for (let actor of client.actorsArray) {
			api.onPeerJoined(actor.actorNr);
		}
	}
}

client.onActorJoin = function (actor) {
	api.onPeerJoined(actor.actorNr);
}

client.onActorLeave = function (actor) {
	api.onPeerLeft(actor.actorNr);
}

client.onEvent = function (code, data, actor_nr) {
	switch (code) {
		case event_ice_candidate:
			setTimeout(async function () {
				await api.onIceCandidate(
					data.isOut,
					JSON.parse(data.candidate),
					actor_nr
				);
			}, 0.0);
			break;
		case event_description:
			setTimeout(async function () {
				await api.onDescription(
					data.isOut,
					JSON.parse(data.description),
					actor_nr
				);
			}, 0.0);
			break;
		default:
			break;
	}
}

window.onload = async function () {
	await api.start();

	client.connectToRegionMaster("SA");

	api.sendIceCandidate = function (isOut, icec) {
		client.raiseEvent(
			event_ice_candidate,
			{ isOut: isOut, candidate: JSON.stringify(icec) },
			{ cache: Photon.LoadBalancing.Constants.EventCaching.AddToRoomCacheGlobal }
		);
	};

	api.sendDescription = function (isOut, desc) {
		client.raiseEvent(
			event_description,
			{ isOut: isOut, description: JSON.stringify(desc) },
			{ cache: Photon.LoadBalancing.Constants.EventCaching.AddToRoomCacheGlobal }
		)
	}
}
