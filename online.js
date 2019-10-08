const client = new Photon.LoadBalancing.LoadBalancingClient(Photon.ConnectionProtocol.Wss, "8327ad7d-7bfc-440a-af7c-f8014fd196b5", version);

const eventShareVideo = 1;
const eventIceCandidate = 2;
const eventDescription = 3;

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

client.onEvent = function (code, data, actorNr) {
	switch (code) {
		case eventShareVideo:
			api.onPeerShareVideo(actorNr, JSON.parse(data));
			break;
		case eventIceCandidate:
			setTimeout(async function () {
				await api.onIceCandidate(actorNr, JSON.parse(data));
			}, 0.0);
			break;
		case eventDescription:
			setTimeout(async function () {
				await api.onDescription(actorNr, JSON.parse(data));
			}, 0.0);
			break;
		default:
			break;
	}
}

window.onload = async function () {
	await api.shareScreen(true);

	client.connectToRegionMaster("SA");

	api.sendShareVideo = function (targetActorNr, eventData) {
		targeted_rpc(eventShareVideo, eventData, targetActorNr);
	}
	api.sendIceCandidate = function (targetActorNr, eventData) {
		targeted_rpc(eventIceCandidate, eventData, targetActorNr);
	};
	api.sendDescription = function (targetActorNr, eventData) {
		targeted_rpc(eventDescription, eventData, targetActorNr);
	}
}

function targeted_rpc(eventId, eventData, targetActorNr) {
	client.raiseEvent(
		eventId,
		JSON.stringify(eventData),
		{ targetActors: [targetActorNr] }
		//{ cache: Photon.LoadBalancing.Constants.EventCaching.AddToRoomCacheGlobal }
	);
}