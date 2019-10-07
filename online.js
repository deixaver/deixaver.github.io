const client = new Photon.LoadBalancing.LoadBalancingClient(Photon.ConnectionProtocol.Wss, "8327ad7d-7bfc-440a-af7c-f8014fd196b5", version);

const event_ice_candidate = 1;
const event_description = 2;

client.onStateChange = function (state) {
	if (client.isInLobby()) {
		client.joinRoom(window.location.pathname, { createIfNotExists: true }, {});
	}

	if (state == Photon.LoadBalancing.LoadBalancingClient.State.Joined) {
		const localActorNr = client.myActor().actorNr;
		for (let actor of client.actorsArray) {
			if (actor.actorNr != localActorNr) {
				api.onPeerJoined(actor.actorNr);
			}
		}
	}
}

client.onActorJoin = function (actor) {
	const localActorNr = client.myActor().actorNr;
	if (actor.actorNr != localActorNr) {
		api.onPeerJoined(actor.actorNr);
	}
}

client.onActorLeave = function (actor) {
	const localActorNr = client.myActor().actorNr;
	if (actor.actorNr != localActorNr) {
		api.onPeerLeft(actor.actorNr);
	}
}

client.onEvent = function (code, data, actor_nr) {
	switch (code) {
		case event_ice_candidate:
			setTimeout(async function () {
				await api.onIceCandidate(JSON.parse(data), actor_nr);
			}, 0.0);
			break;
		case event_description:
			setTimeout(async function () {
				await api.onDescription(JSON.parse(data), actor_nr);
			}, 0.0);
			break;
		default:
			break;
	}
}

window.onload = async function () {
	await api.shareScreen();

	client.connectToRegionMaster("SA");

	api.sendIceCandidate = function (icec) {
		client.raiseEvent(
			event_ice_candidate,
			JSON.stringify(icec),
			{ cache: Photon.LoadBalancing.Constants.EventCaching.AddToRoomCacheGlobal }
		);
	};

	api.sendDescription = function (desc) {
		client.raiseEvent(
			event_description,
			JSON.stringify(desc),
			{ cache: Photon.LoadBalancing.Constants.EventCaching.AddToRoomCacheGlobal }
		)
	}
}
