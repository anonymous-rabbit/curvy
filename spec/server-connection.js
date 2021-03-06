describe('ServerConnection', function() {
	function getUniqueUserName() {
		return 'user' + Math.floor(Math.random() * 10000);
	}
	
	beforeEach(function() {
		ServerConnection.WEBSOCKET_URL = 'http://localhost:8888';	
	});
	
	it('should be diconnected after creation', function() {
		var connection = new ServerConnection('user');
		expect(connection.state).toEqual('disconnected');
		expect(connection.isConnected).toEqual(false);
		
		connection.close();
	});
	
	it('should be connecting after login()', function() {
		var connection = new ServerConnection();
		connection.login('user');
		expect(connection.state).toEqual('connecting');
		expect(connection.isConnected).toEqual(false);
		
		connection.close();
	});
	
	it('should connect', function() {
		var connection = new ServerConnection();
		connection.login(getUniqueUserName());
		
		waitsFor(function() {
			return connection.isConnected;
		}, 'isConnected to be true');
		
		runs(function() {
			expect(connection.state).toEqual('connected');
			
			connection.close();
		});
	});
	
	it('should not connect if user name is not available', function() {
		var userName = getUniqueUserName();
		
		var connection1 = new ServerConnection();
		connection1.login(userName);
		var connection2 = new ServerConnection();
		
		waitsFor(function() {
			return connection1.isConnected;
		}, 'first connection to be established');
		
		runs(function() {
			connection2.login(userName);
		});
		
		waitsFor(function() {
			return connection2.state != 'connecting';
		}, 'state not to equal connecting');
		runs(function() {
			expect(connection2.state).toEqual('name_not_available');

			connection1.close();
			connection2.close();
		});
	});
	
	it('should free user name on disconnect', function() {
		var userName = getUniqueUserName();
		
		var connection = new ServerConnection();
		connection.login(userName);
		
		waitsFor(function() {
			return connection.isConnected;
		}, 'first connection to be established');
		
		runs(function() {
			connection.login(userName);
		});
		
		waitsFor(function() {
			return connection.state != 'connecting';
		}, 'state not to equal connecting');
		runs(function() {
			expect(connection.isConnected).toBe(true);

			connection.close();
		});
	});
	
	it('should receive player list', function() {
		var connection = new ServerConnection();
		connection.login(getUniqueUserName());
		
		var playersListReceived = false;
		$(connection).on('players', function(e, contacts) {
			playersListReceived = true;
		});
		
		waitsFor(function() {
			return playersListReceived;
		}, 'players event to be fired');
		
		runs(function() {
			var players = connection.players;
			expect(players.length).not.toBeLessThan(1);
			for (var i = 0; i < players.length; i++) {
				expect(typeof(players[i].name)).toBe('string');
				expect(typeof(players[i].state)).toBe('string');
			}

			connection.close();
		});
	});
	
	it('should respond to ping', function() {
		var userName = getUniqueUserName();

		var connection = new ServerConnection();
		connection.login(getUniqueUserName());
		
		waitsFor(function() {
			return connection.isConnected;
		}, 'connection to be established');
		
		var pingReceived = false;
		var pingTime = null;
		$(connection).on('ping', function(e, data) {
			pingReceived = true;
			pingTime = data;
		});
		
		runs(function() {
			connection.doPing();
		});
		
		waitsFor(function() {
			return pingReceived;
		}, 'pingback to be received');
		
		runs(function() {
			expect(typeof(pingTime)).toBe('number');
			expect(typeof(connection.pingTime)).toBe('number');

			connection.close();
		});
	});
	
	it('should allow to call a player', function() {
		var connection1 = new ServerConnection();
		connection1.login(getUniqueUserName());
		var connection2 = new ServerConnection();
		connection2.login(getUniqueUserName());

		var user2Called = false;
		$(connection2).on('call', function(e, data) {
			if (data.sender == connection1.userName)
				user2Called = true;
		});
		
		waitsFor(function() {
			return connection1.isConnected && connection2.isConnected;
		}, 'both connections to be established');
		
		runs(function() {
			connection1.call(connection2.userName);
		});
		
		waitsFor(function() {
			return user2Called;
		}, 'user2 to be called');

		var user2ReceivedPlayerListUpdate = false;
		$(connection2).on('players', function(e, data) {
			var players = connection2.players;
			for (var i = 0; i < players.length; i++) {
				if (players[i].name == connection1.userName && players[i].state == 'calling') {
					user2ReceivedPlayerListUpdate = true;
					return;
				}
			}
		});
		
		waitsFor(function() {
			return user2ReceivedPlayerListUpdate;
		}, 'player1 to be seen as "calling" for player2');
		
		runs(function() {
			connection1.close();
			connection2.close();
		});
	});
	
	it('should allow to reject a call', function() {
		var connection1 = new ServerConnection();
		connection1.login(getUniqueUserName());
		var connection2 = new ServerConnection();
		connection2.login(getUniqueUserName());
		
		waitsFor(function() {
			return connection1.isConnected && connection2.isConnected;
		}, 'both connections to be established');

		var user2Called = false;
		$(connection2).on('call', function(e, call) {
			if (call.sender == connection1.userName) {
				user2Called = true;
				call.reject();
			}
		});

		var callRejected = false;
		$(connection1).on('reject', function(e, data) {
			if (data.sender == connection2.userName) {
				callRejected = true;
			}
		});
		
		runs(function() {
			connection1.call(connection2.userName);
		});
		
		waitsFor(function() {
			return user2Called;
		}, 'user2 to be called');
		
		waitsFor(function() {
			return callRejected;
		}, 'call to be rejected');
		
		runs(function() {
			connection1.close();
			connection2.close();
		});
	});
	
	it('should allow to accept a call', function() {
		var connection1 = new ServerConnection();
		connection1.login(getUniqueUserName());
		var connection2 = new ServerConnection();
		connection2.login(getUniqueUserName());
		
		waitsFor(function() {
			return connection1.isConnected && connection2.isConnected;
		}, 'both connections to be established');

		var user2Called = false;
		$(connection2).on('call', function(e, call) {
			if (call.sender == connection1.userName) {
				user2Called = true;
				call.accept();
			}
		});

		var callAccepted = false;
		$(connection1).on('accept', function(e, data) {
			if (data.sender == connection2.userName) {
				callAccepted = true;
			}
		});

		var user1ReceivedPlayerListUpdate = false;
		$(connection1).on('players', function(e, data) {
			var players = connection1.players;
			for (var i = 0; i < players.length; i++) {
				if (players[i].name == connection2.userName && players[i].state == 'busy') {
					user1ReceivedPlayerListUpdate = true;
					return;
				}
			}
		});
		
		runs(function() {
			connection1.call(connection2.userName);
		});
		
		waitsFor(function() {
			return user2Called;
		}, 'user2 to be called');
		
		waitsFor(function() {
			return callAccepted;
		}, 'call to be accepted');
		
		waitsFor(function() {
			return user1ReceivedPlayerListUpdate;
		}, 'user state to be set to "busy"');
		
		runs(function() {
			connection1.close();
			connection2.close();
		});
	});
	
	it('should allow to hang up', function() {
		var connection1 = new ServerConnection();
		connection1.login(getUniqueUserName());
		var connection2 = new ServerConnection();
		connection2.login(getUniqueUserName());
		
		waitsFor(function() {
			return connection1.isConnected && connection2.isConnected;
		}, 'both connections to be established');

		var user2ReceivedCall = false;
		$(connection2).on('call', function(e, call) {
			if (call.sender == connection1.userName) {
				user2ReceivedCall = true;
				call.accept();
			}
		});

		var callAccepted = false;
		$(connection1).on('accept', function(e, data) {
			if (data.sender == connection2.userName) {
				callAccepted = true;
				connection1.hangup();
			}
		});

		var user2ReceivedHangUp = false;
		$(connection2).on('hangup', function(e, data) {
			user2ReceivedHangUp = true;
		});

		var playerListUpdatePart1 = false;
		var playerListUpdatePart2 = false;
		$(connection1).on('players', function(e, data) {
			var players = connection1.players;
			for (var i = 0; i < players.length; i++) {
				if (players[i].name == connection2.userName && players[i].state == 'idle') {
					playerListUpdatePart2 = true;
				}
			}
		});
		$(connection2).on('players', function(e, data) {
			var players = connection2.players;
			for (var i = 0; i < players.length; i++) {
				if (players[i].name == connection1.userName && players[i].state == 'idle') {
					playerListUpdatePart1 = true;
				}
			}
		});
		
		runs(function() {
			connection1.call(connection2.userName);
		});
		
		waitsFor(function() {
			return user2ReceivedCall;
		}, 'user2 to be called');
		
		waitsFor(function() {
			return callAccepted;
		}, 'call to be accepted');
		
		waitsFor(function() {
			return user2ReceivedHangUp;
		}, 'call to be hung up');
		
		waitsFor(function() {
			return playerListUpdatePart1 && playerListUpdatePart2;
		}, 'both user states to be set to "idle"');
		
		runs(function() {
			connection1.close();
			connection2.close();
		});
	});
	
	it('should hang up call between A and B when A calls C', function() {
		var connection1 = new ServerConnection();
		connection1.login(getUniqueUserName());
		var connection2 = new ServerConnection();
		connection2.login(getUniqueUserName());
		var connection3 = new ServerConnection();
		connection3.login(getUniqueUserName());
		
		waitsFor(function() {
			return connection1.isConnected && connection2.isConnected && connection3.isConnected;
		}, 'all three connections to be established');

		var user2ReceivedCall = false;
		$(connection2).on('call', function(e, call) {
			if (call.sender == connection1.userName) {
				user2ReceivedCall = true;
				call.accept();
			}
		});

		var callAccepted = false;
		$(connection1).on('accept', function(e, data) {
			if (data.sender == connection2.userName) {
				callAccepted = true;
				connection1.call(connection3.userName);
			}
		});

		var user2RecivedHangUp = false;
		$(connection2).on('hangup', function(e, data) {
			user2RecivedHangUp = true;
		});

		var playerListUpdatePart1 = false;
		var playerListUpdatePart2 = false;
		$(connection1).on('players', function(e, data) {
			var players = connection1.players;
			for (var i = 0; i < players.length; i++) {
				if (players[i].name == connection2.userName && players[i].state == 'idle') {
					playerListUpdatePart2 = true;
				} 
			}
		});
		$(connection2).on('players', function(e, data) {
			var players = connection2.players;
			for (var i = 0; i < players.length; i++) {
				if (players[i].name == connection1.userName && players[i].state == 'calling') {
					playerListUpdatePart1 = true;
				}
			}
		});
		
		runs(function() {
			connection1.call(connection2.userName);
		});
		
		waitsFor(function() {
			return user2ReceivedCall;
		}, 'user2 to be called');
		
		waitsFor(function() {
			return callAccepted;
		}, 'call to be accepted');
		
		waitsFor(function() {
			return user2RecivedHangUp;
		}, 'call to be hung up');
		
		waitsFor(function() {
			return playerListUpdatePart1 && playerListUpdatePart2;
		}, 'user 1 to set to "calling" and user 2 to be set to "idle"');
		
		runs(function() {
			connection1.close();
			connection2.close();
			connection3.close();
		});
	});
	
	it('should establish a connector when call accepted', function() {
		var connection1 = new ServerConnection();
		connection1.login(getUniqueUserName());
		var connection2 = new ServerConnection();
		connection2.login(getUniqueUserName());
		
		waitsFor(function() {
			return connection1.isConnected && connection2.isConnected;
		}, 'both connections to be established');

		var user2Called = false;
		$(connection2).on('call', function(e, call) {
			if (call.sender == connection1.userName) {
				user2Called = true;
				call.accept();
			}
		});
		
		var sentData = {test: 123};

		var callAccepted = false;
		$(connection1).on('accept', function(e, data) {
			callAccepted = true;
			// connection events with invalid data will be ignored by the peer channel
			connection1.connector.send('connection', sentData);
		});
		
		var eventReceived = false;
		$(connection2).on('accept', function(e, data) {
			$(connection2.connector).on('connection', function(e, data) {
				if(data && data.test == 123)
					eventReceived = true;
			});
		});
		
		runs(function() {
			connection1.call(connection2.userName);
		});
		
		waitsFor(function() {
			return user2Called;
		}, 'user2 to be called');
		
		waitsFor(function() {
			return callAccepted;
		}, 'call to be accepted');
		
		waitsFor(function() {
			return eventReceived;
		}, 'data to be retrieved by user1');
		
		runs(function() {
			connection1.close();
			connection2.close();
		});
	});
	
	it('should establish a peer channel when call accepted', function() {
		var connection1 = new ServerConnection();
		connection1.login(getUniqueUserName());
		var connection2 = new ServerConnection();
		connection2.login(getUniqueUserName());
		
		waitsFor(function() {
			return connection1.isConnected && connection2.isConnected;
		}, 'both connections to be established');

		var user2Called = false;
		$(connection2).on('call', function(e, call) {
			if (call.sender == connection1.userName) {
				user2Called = true;
				call.accept();
			}
		});

		var callAccepted = false;
		$(connection1).on('accept', function(e, data) {
			callAccepted = true;
		});
		
		runs(function() {
			connection1.call(connection2.userName);
		});
		
		waitsFor(function() {
			return user2Called;
		}, 'user2 to be called');
		
		waitsFor(function() {
			return callAccepted;
		}, 'call to be accepted');
		
		waitsFor(function() {
			return connection1.peerChannel.isConnected && connection2.peerChannel.isConnected;
		}, 'peer channel to be connected');
		
		runs(function() {
			connection1.close();
			connection2.close();
		});
	});
});
