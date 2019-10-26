// Licensed as MIT
// Source: https://github.com/mgwio/newtab.urlEX

let newTabUrl = browser.extension.getURL("newtab.html");

// this function hides closed new tabs from the "recently closed tabs" menu
async function tabComms(p) {
	async function expungeClosedTab() {
		let closed = await browser.sessions.getRecentlyClosed();
		if (Object.prototype.hasOwnProperty.call(closed[0], 'tab') && closed[0].tab.url === newTabUrl) {
			await browser.sessions.forgetClosedTab(
				closed[0].tab.windowId,
				closed[0].tab.sessionId.toString()
			);
		}
		p.disconnect();
	}

	p.onMessage.addListener(expungeClosedTab);
}

browser.runtime.onConnect.addListener(tabComms);
