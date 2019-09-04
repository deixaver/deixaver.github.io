const client = new Photon.LoadBalancing.LoadBalancingClient(Photon.ConnectionProtocol.Wss, "8327ad7d-7bfc-440a-af7c-f8014fd196b5", version);

const event_ice_candidate = 1;
const event_description = 2;

function getMasterNr() {
	let minActorNr = 99999;
	for (let actor of client.actorsArray) {
		if (actor.actorNr < minActorNr) {
			minActorNr = actor.actorNr;
		}
	}

	return minActorNr;
}

client.onStateChange = function (state) {
	if (client.isInLobby()) {
		client.joinRoom(window.location.pathname, { createIfNotExists: true }, {});
	}

	if (state == Photon.LoadBalancing.LoadBalancingClient.State.Joined) {
		const localActorNr = client.myActor().actorNr;
		const masterNr = getMasterNr();

		if (localActorNr == masterNr) {
			setTimeout(async function () {
				await api.shareScreen();

				for (let actor of client.actorsArray) {
					if (actor.actorNr != localActorNr) {
						api.onPeerJoined(actor.actorNr);
					}
				}
			}, 0.0);
		} else {
			api.onPeerJoined(masterNr);
		}
	}
}

client.onActorJoin = function (actor) {
	const localActorNr = client.myActor().actorNr;
	const isMaster = localActorNr == getMasterNr();
	if (actor.actorNr != localActorNr && isMaster) {
		api.onPeerJoined(actor.actorNr);
	}
}

client.onActorLeave = function (actor) {
	const localActorNr = client.myActor().actorNr;
	const isMaster = localActorNr == getMasterNr();
	if (actor.actorNr != localActorNr && isMaster) {
		api.onPeerLeft(actor.actorNr);
	}
}

client.onEvent = function (code, data, actor_nr) {
	const masterNr = getMasterNr();
	const toMaster = client.myActor().actorNr == masterNr;
	const fromMaster = actor_nr == masterNr;

	switch (code) {
		case event_ice_candidate:
			if (toMaster || fromMaster) {
				setTimeout(async function () {
					await api.onIceCandidate(JSON.parse(data), actor_nr);
				}, 0.0);
			}
			break;
		case event_description:
			if (toMaster || fromMaster) {
				setTimeout(async function () {
					await api.onDescription(JSON.parse(data), actor_nr);
				}, 0.0);
			}
			break;
		default:
			break;
	}
}

window.onload = async function () {
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
