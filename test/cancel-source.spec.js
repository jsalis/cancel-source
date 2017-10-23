
import CancelSource from '../src/cancel-source';

describe('CancelSource', () => {

	beforeEach(() => {
		jasmine.clock().install();
		jasmine.clock().mockDate();
	});

	afterEach(() => {
		jasmine.clock().uninstall();
	});

	it('must return an object', () => {
		expect(CancelSource.create()).toEqual({
			token: jasmine.any(Object),
			cancel: jasmine.any(Function)
		});
	});

	describe('emptyToken', () => {

		describe('isCanceled', () => {

			it('must return false', () => {
				expect(CancelSource.emptyToken.isCanceled()).toBe(false);
			});
		});

		describe('throwIfCanceled', () => {

			it('must not throw', () => {
				expect(CancelSource.emptyToken.throwIfCanceled).not.toThrow();
			});
		});

		describe('subscribe', () => {

			it('must not call the listener', () => {
				let listener = jasmine.createSpy('listener');
				CancelSource.emptyToken.subscribe(listener);
				expect(listener).not.toHaveBeenCalled();
			});

			it('must return a subscription', () => {
				let listener = jasmine.createSpy('listener');
				let subscription = CancelSource.emptyToken.subscribe(listener);
				expect(subscription.unsubscribe).not.toThrow();
			});
		});
	});

	describe('cancel', () => {

		it('must immediately call listeners with the given reason', () => {
			let source = CancelSource.create();
			let reason = new Error('Timeout');
			let listener = jasmine.createSpy('listener');
			source.token.subscribe(listener);
			expect(listener).not.toHaveBeenCalled();
			source.cancel(reason);
			expect(listener).toHaveBeenCalledWith(reason);
		});

		it('must use a default reason when one is not passed', () => {
			let source = CancelSource.create();
			let listener = jasmine.createSpy('listener');
			source.token.subscribe(listener);
			expect(listener).not.toHaveBeenCalled();
			source.cancel();
			expect(listener).toHaveBeenCalledWith(jasmine.any(Error));
		});

		it('must not call listeners more than once', () => {
			let source = CancelSource.create();
			let listener = jasmine.createSpy('listener');
			source.token.subscribe(listener);
			source.cancel();
			source.cancel();
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('must throw in an empty stack when a listener throws', () => {
			let source = CancelSource.create();
			let listener = jasmine.createSpy('listener').and.throwError('fatality');
			source.token.subscribe(listener);
			expect(() => source.cancel()).not.toThrow();
			expect(() => jasmine.clock().tick(1)).toThrowError('fatality');
		});

		it('must not throw when a listener throws', () => {
			let source = CancelSource.create();
			let firstListener = jasmine.createSpy('firstListener').and.throwError('fatality');
			let secondListener = jasmine.createSpy('secondListener');
			source.token.subscribe(firstListener);
			source.token.subscribe(secondListener);
			expect(() => source.cancel()).not.toThrow();
			expect(firstListener).toHaveBeenCalled();
			expect(secondListener).toHaveBeenCalled();
		});

		it('must not throw when a listener is not a function', () => {
			let source = CancelSource.create();
			source.token.subscribe({ garbage: 'input' });
			expect(() => source.cancel()).not.toThrow();
		});
	});

	describe('token', () => {

		describe('isCanceled', () => {

			it('must return true if the source was canceled, false otherwise', () => {
				let source = CancelSource.create();
				expect(source.token.isCanceled()).toBe(false);
				source.cancel();
				expect(source.token.isCanceled()).toBe(true);
			});
		});

		describe('throwIfCanceled', () => {

			it('must throw the cancel reason if canceled', () => {
				let source = CancelSource.create();
				let reason = new Error('Timeout');
				expect(source.token.throwIfCanceled).not.toThrow();
				source.cancel(reason);
				expect(source.token.throwIfCanceled).toThrow(reason);
			});
		});

		describe('subscribe', () => {

			it('must immediately call the listener if the source is canceled', () => {
				let source = CancelSource.create();
				let reason = new Error('Timeout');
				let listener = jasmine.createSpy('listener');
				source.cancel(reason);
				expect(listener).not.toHaveBeenCalled();
				source.token.subscribe(listener);
				expect(listener).toHaveBeenCalledWith(reason);
			});

			it('must not throw when a listener is not a function', () => {
				let source = CancelSource.create();
				let reason = new Error('Timeout');
				source.cancel(reason);
				expect(() => source.token.subscribe({ garbage: 'input' })).not.toThrow();
			});

			it('must return a function to unsubscribe the listener', () => {
				let source = CancelSource.create();
				let firstListener = jasmine.createSpy('firstListener');
				let secondListener = jasmine.createSpy('secondListener');
				let subscription = source.token.subscribe(firstListener);
				source.token.subscribe(secondListener);
				subscription.unsubscribe();
				source.cancel();
				expect(firstListener).not.toHaveBeenCalled();
				expect(secondListener).toHaveBeenCalled();
			});

			it('must return an empty subscription if the source is canceled', () => {
				let source = CancelSource.create();
				let listener = jasmine.createSpy('listener');
				source.cancel();
				let subscription = source.token.subscribe(listener);
				expect(subscription.unsubscribe).not.toThrow();
			});
		});
	});

	describe('with parent tokens', () => {

		it('must cancel when a parent source is canceled', () => {
			let parentSource = CancelSource.create();
			let childSource = CancelSource.create(parentSource.token);
			expect(childSource.token.isCanceled()).toBe(false);
			parentSource.cancel();
			expect(childSource.token.isCanceled()).toBe(true);
		});

		it('must throw the reason of a canceled parent source', () => {
			let parentSource = CancelSource.create();
			let childSource = CancelSource.create(parentSource.token);
			let reason = new Error('Timeout');
			expect(childSource.token.throwIfCanceled).not.toThrow();
			parentSource.cancel(reason);
			expect(childSource.token.throwIfCanceled).toThrow(reason);
		});

		it('must immediately call listeners when a parent source is canceled', () => {
			let parentSource = CancelSource.create();
			let childSource = CancelSource.create(parentSource.token);
			let listener = jasmine.createSpy('listener');
			childSource.token.subscribe(listener);
			expect(listener).not.toHaveBeenCalled();
			parentSource.cancel();
			expect(listener).toHaveBeenCalled();
		});

		it('must immediately cancel the source when a parent source is already canceled', () => {
			let parentSource = CancelSource.create();
			parentSource.cancel();
			let childSource = CancelSource.create(parentSource.token);
			expect(childSource.token.isCanceled()).toBe(true);
		});
	});
});
