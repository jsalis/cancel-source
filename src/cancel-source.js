
/**
 * @type {Object} An empty token that will never be canceled.
 */
const emptyToken = createCancelSource().token;

/**
 * Limits a function to only be called once.
 *
 * @param   {Function} callback
 * @returns {Function}
 */
function once(callback) {

	return function () {

		if (typeof callback === 'function') {

			let fn = callback;
			callback = null;
			fn.apply(this, arguments);
		}
	};
}

/**
 * Tries to invoke a listener with a given cancel reason.
 *
 * @type {Function} (reason:Object) => (listener:Function) => void
 */
const invokeListener = (reason) => (listener) => {

	try {

		listener(reason);

	} catch (error) {

		setTimeout(() => {
			throw error;
		});
	}
};

/**
 * Creates a new cancel source.
 *
 * @param   {...Object} [parentTokens]      One or more cancel tokens to link.
 * @returns {Object}
 */
function createCancelSource(...parentTokens) {

	let data = {
		reason:    null,
		listeners: []
	};

	let cancel = once((reason) => {
		data.reason = reason || new Error('Operation Canceled');
		data.listeners.forEach(invokeListener(data.reason));
	});

	parentTokens.map((token) => token.subscribe(cancel));

	let token = {

		/**
		 * Gets whether the token has been canceled.
		 *
		 * @returns {Boolean}
		 */
		isCanceled() {

			return Boolean(data.reason);
		},

		/**
		 * Throws the cancel reason if the token has been canceled.
		 */
		throwIfCanceled() {

			if (data.reason) {
				throw data.reason;
			}
		},

		/**
		 * Adds a cancellation listener.
		 *
		 * @param   {Function} listener     A callback to be invoked on cancellation.
		 * @returns {Object}                A subscription that allows the consumer to unsubscribe.
		 */
		subscribe(listener) {

			if (data.reason) {

				invokeListener(data.reason)(listener);

				return {
					unsubscribe() {}
				};

			} else {

				data.listeners.push(listener);

				return {
					unsubscribe() {
						data.listeners = data.listeners.filter((el) => el !== listener);
					}
				};
			}
		}
	};

	return { token, cancel };
}

export default { create: createCancelSource, emptyToken };
