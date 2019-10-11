const client = new Photon.LoadBalancing.LoadBalancingClient(Photon.ConnectionProtocol.Wss, "8327ad7d-7bfc-440a-af7c-f8014fd196b5", version);

const eventShareVideo = 1;
const eventStopVideo = 2;
const eventRequestScreenResolution = 3;
const eventIceCandidate = 4;
const eventDescription = 5;

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
		case eventStopVideo:
			api.onPeerStopVideo(actorNr, JSON.parse(data));
			break;
		case eventRequestScreenResolution:
			api.onPeerRequestScreenResolution(actorNr, JSON.parse(data));
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

function online_init() {
	api.sendShareVideoAll = function (eventData) {
		all_rpc(eventShareVideo, eventData);
	};
	api.sendShareVideo = function (targetActorNr, eventData) {
		targeted_rpc(eventShareVideo, eventData, targetActorNr);
	};
	api.sendStopVideoAll = function (eventData) {
		all_rpc(eventStopVideo, eventData);
	};
	api.sendRequestScreenResolution = function (targetActorNr, eventData) {
		targeted_rpc(eventRequestScreenResolution, eventData, targetActorNr);
	};
	api.sendIceCandidate = function (targetActorNr, eventData) {
		targeted_rpc(eventIceCandidate, eventData, targetActorNr);
	};
	api.sendDescription = function (targetActorNr, eventData) {
		targeted_rpc(eventDescription, eventData, targetActorNr);
	};

	client.connectToRegionMaster("SA");
}

function all_rpc(eventId, eventData) {
	client.raiseEvent(
		eventId,
		JSON.stringify(eventData),
		//{ cache: Photon.LoadBalancing.Constants.EventCaching.AddToRoomCacheGlobal }
	);
}

function targeted_rpc(eventId, eventData, targetActorNr) {
	client.raiseEvent(
		eventId,
		JSON.stringify(eventData),
		{ targetActors: [targetActorNr] }
		//{ cache: Photon.LoadBalancing.Constants.EventCaching.AddToRoomCacheGlobal }
	);
}