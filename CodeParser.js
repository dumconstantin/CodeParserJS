var parser = (function () { 

	var events = {
		subscribers: {},
		publish: function (topic, letter, code) {
			var subcriber = 0;
			if (undefined !== this.subscribers[topic]) {
				for (subscriber = 0; subscriber < this.subscribers[topic].length; subscriber += 1) {
					this.subscribers[topic][subscriber].callback.call(this.subscribers[topic][subscriber].scope, topic, letter, code);
				}
			}
		},
		subscribe: function (topic, callback, scope) {
			if (undefined === this.subscribers[topic]) {
				this.subscribers[topic] = [];
			}
			this.subscribers[topic].push({
				callback: callback,
				scope: scope
			});
		},
		unsubscribe: function (topic, callback) {
			this.subscribers[topic] = this.subscribers[topic].filter(function (element) {
				return callback !== element.callback;
			});
		}
	};

	var tree = {};
	var listeners = {};

	var flags = {};

	function listen(name, index) {
		var id = name + '-' + index;
		tree[id] = {
			id: id,
			name: name,
			startRegex: listeners[name].startRegex,
			finishRegex: listeners[name].finishRegex,
			recorded: "",
			start: function () {
				if (undefined === flags[name]) {
					flags[name] = [];
				}
				flags[name].push(id);
				events.subscribe('letter', this.letter, this);
			},
			letter: function (topic, letter, code) {
				this.record(letter);
				if (true === this.finishRegex.test(code)) {
					// If this recorder is the last flag then it can be closed.
					// Else it's just a child from this recorder.
					if (this.id === flags[name][flags[name].length - 1]) {
						flags[name].pop();
						events.unsubscribe('letter', this.letter);
					}
				}
			},
			record: function (letter) {
				this.recorded += letter;
			}
		};

		tree[id].start();
	}


	listeners['var'] = {
		startRegex: /^var/,
		finishRegex: /^;/
	};

	listeners['object'] = {
		startRegex: /^=\s*{/,
		finishRegex: /^};/
	};

	listeners['functionCall'] = {
		startRegex: /^;\s+(?:[a-zA-Z0-9]+\.)*[a-zA-Z0-9]+\(/,
		finishRegex: /^\);/
	};

	listeners['function'] = {
		startRegex: /^function/,
		finishRegex: /^}/
	};


	return function (code) {
		var letter = 0;
		var part;
		var remainingCode;
		for (letter = 0; letter < code.length; letter += 1) {
			var remainingCode = code.slice(letter, code.length - 1);
			// Run tests.
			Object.keys(listeners).forEach(function (listenerName) {
				
				// For optimization/integrity reasons declare a length for 
				// the regex searches which issue a slice on the code
				// Dispatch a new listener if the test is valid.
				if (true === listeners[listenerName].startRegex.test(remainingCode)) {
					listen(listenerName, letter);
				}
			});
			// There can be only one finish on a letter.
			// Emit a record event.
			events.publish('letter', code[letter], remainingCode);
		}

		for (part in tree) {
			console.log('"' + tree[part].name + '" -> ' + tree[part].recorded);
		}
		// Get all found code.
		return tree;
	};
}());