"use strict";

// Based on: https://github.com/mgwio/newtab.urlEX [Licensed with MIT on retrieval]

let newTabUrl = browser.extension.getURL("newtab.html");

async function handleMessage(message, sender, sendResp) {
	// this function hides closed new tabs from the "recently closed tabs" menu
	if (message.tabId) {
		let closed = await browser.sessions.getRecentlyClosed({maxResults: 1});
		if (Object.prototype.hasOwnProperty.call(closed[0], 'tab') && closed[0].tab.url === newTabUrl) {
			await browser.sessions.forgetClosedTab(
				closed[0].tab.windowId,
				closed[0].tab.sessionId.toString()
			);
		}
	}
}

browser.runtime.onMessage.addListener(handleMessage);

async function addIcon(tab) {
	let hasBookmark = await browser.bookmarks.search({url: tab.url});
	if (hasBookmark.length > 0) {
		let idMap = {};
		for (let bookmark of hasBookmark) {
			idMap["___newtab_icon_" + bookmark.id] = tab.favIconUrl;
		}
		browser.storage.local.set(idMap).then(debounceUpdateBookmarks, console.error);
	}
}

browser.pageAction.onClicked.addListener(addIcon);

// TODO this whole debounce could use a lowered timeout or even be removed altogether
//  if the update on event was modified/optimized such that we really only touch the changes elements
const debounceWait = 2000;
let debounceTimeout;

async function debounceUpdateBookmarks() {
	if (debounceTimeout) {
		window.clearTimeout(debounceTimeout);
		debounceTimeout = null;
	}
	debounceTimeout = setTimeout(updateBookmarks, debounceWait);
}

browser.bookmarks.onCreated.addListener(debounceUpdateBookmarks);
browser.bookmarks.onRemoved.addListener(debounceUpdateBookmarks);
browser.bookmarks.onChanged.addListener(debounceUpdateBookmarks);
browser.bookmarks.onMoved.addListener(debounceUpdateBookmarks);

browser.runtime.onInstalled.addListener(function() {
	updateBookmarks().then();
});

async function updateBookmarks() {
	console.log("updating bookmark cache...");

	let toolbar = await browser.bookmarks.getSubTree("toolbar_____");
	toolbar = toolbar[0];

	let handleItem = async function(item, parent) {
		if (!item.url && (!item.type || item.type === "folder")) {
			let childItems = [];
			for (let childItem of item.children) {
				await handleItem(childItem, childItems);
			}
			let itemData = ["f", item.title, childItems];
			parent.push(itemData);
		} else if (item.url && (!item.type || item.type === "bookmark")) {
			if (item.url.startsWith("place:")) {
				// firefox: placeholder for dynamic content we can't get at
				return;
			}

			let icon;
			let iconId = "___newtab_icon_" + item.id;
			let iconData = await browser.storage.local.get(iconId);
			if (iconData[iconId]) {
				icon = iconData[iconId];
			}

			let itemData = ["b", item.title, item.url, icon];
			parent.push(itemData);
		}
	};

	let toolbarItems = [];

	for (let item of toolbar.children) {
		await handleItem(item, toolbarItems);
	}
	await browser.storage.local.set({___newtab_bookmarks: toolbarItems});

	console.log("done");
}