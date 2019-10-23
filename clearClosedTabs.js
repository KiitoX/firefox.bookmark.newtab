// Licensed as MIT
// Source: https://github.com/mgwio/newtab.urlEX

let newtabUrl = browser.extension.getURL("newtab.html");

// this function hides closed new tabs from the "recently closed tabs" menu
async function tabComms(p) {
	async function expungeClosedTab(tab) {
		let tabId = tab.tabId;
		await browser.tabs.remove(tabId);
		let closed = await browser.sessions.getRecentlyClosed();
		if (Object.prototype.hasOwnProperty.call(closed[0], 'tab') && closed[0].tab.url === newtabUrl) {
			browser.sessions.forgetClosedTab(
				closed[0].tab.windowId,
				closed[0].tab.sessionId.toString()
			);
		}
		p.disconnect();
	}
	p.addEventListener("message", expungeClosedTab);
}

browser.runtime.onConnect.addListener(tabComms);
