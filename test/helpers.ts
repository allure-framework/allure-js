export function delay(ms: number) {
	return new Promise<void>(function(resolve) {
		setTimeout(resolve, ms);
	});
}

export function delayFail(ms: number) {
	return new Promise<void>(function(resolve, reject) {
		setTimeout(() => reject(new Error("Async error")), ms);
	});
}
