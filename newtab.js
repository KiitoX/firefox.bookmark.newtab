"use strict";

window.addEventListener("load", function() {
	let templates = document.getElementById("bookmark-templates").content;
	let bookmarkTemplate = templates.querySelector(".bookmark");
	let bookmarkItemTemplate = templates.querySelector(".bookmark-item");
	let bookmarkFolderTemplate = templates.querySelector(".bookmark-folder");
	let bookmarkFolderItemTemplate = templates.querySelector(".bookmark-folder-item");
	let bookmarkBar = document.querySelector(".bookmark-bar");

	let configureBookmark = function(bookmark, url, name, icon) {
		// set base tooltip
		bookmark.title = url;

		let link = url;

		let anchor = bookmark.querySelector("a");
		// this pattern might need to be opened up to just any words, i.e. \w+
		if (!url.match(/^(https?|ftps?|file|mailto|javascript):/g)) {
			// url is seemingly malformed, we're gonna assume it to be https
			link = "https://" + url;
			// this /should/ never be an issue, as it seems firefox already handles this
			// issue on bookmark creation, I'll be leaving it in for now though, just in case
			console.error("malformed url", url, "assumed to be", anchor.href);
		}
		anchor.href = link;

		let title = bookmark.querySelector(".bookmark-title");
		if (name !== undefined && name !== "") {
			bookmark.title = name + "\n" + url;
			title.textContent = name;
		} else {
			// don't leave empty nodes, messing up the spacing
			title.parentNode.removeChild(title);
		}

		// retrieve the image icon
		let img = bookmark.querySelector(".bookmark-icon");
		if (icon !== undefined) {
			img.src = icon;
		} else {
			// this provider is functional, but sadly only returns 16px icons
			img.src = "https://www.google.com/s2/favicons?domain_url=" + url;
			// this seems mostly sparsely populated so probably not useful
			// img.src = "https://favicons.githubusercontent.com/" + anchor.hostname;
			// this mostly works but breaks on changed favicons inside pages
			//img.src = anchor.protocol + anchor.hostname + "/favicon.ico";
			// this is janky on most pages, but handles multi level favicons
			//img.src = link + "/favicon.ico";
		}
	};

	let addBookmark = function(url, name, icon) {
		let bookmark = document.importNode(bookmarkTemplate, true);

		configureBookmark(bookmark, url, name, icon);

		bookmarkBar.appendChild(bookmark);
	};

	let hoverBookmarkItem = function(parentFolder) {
		// get any open bookmark folder
		let openFolderItem = parentFolder.querySelector(".bookmark-folder-item[open]");
		// if one exists and has no close timeout yet
		if (openFolderItem && !openFolderItem.closeTimeout) {
			// add close timeout
			openFolderItem.closeTimeout = window.setTimeout(function() {
				toggleFolder(openFolderItem);
				openFolderItem.closeTimeout = null;
			}, 300);
		}
		// if the folder we're in has a close timeout
		if (parentFolder.closeTimeout) {
			// cancel that timeout
			window.clearTimeout(parentFolder.closeTimeout);
			parentFolder.closeTimeout = null;
		}
	};

	let addBookmarkItem = function(folder, url, name, icon) {
		let bookmarkItem = document.importNode(bookmarkItemTemplate, true);

		let item = bookmarkItem.querySelector(".bookmark-layout");
		item.addEventListener("mouseover", () => hoverBookmarkItem(folder));

		configureBookmark(bookmarkItem, url, name, icon);

		let folderDropdown = folder.querySelector(".bookmark-dropdown");
		folderDropdown.appendChild(bookmarkItem);
	};

	let toggleFolder = function(folder) {
		let winLeft = 0;
		let winRight = window.innerWidth;
		let winBottom = window.innerHeight;

		let isOpen = folder.hasAttribute("open");

		if (!isOpen) {
			// the folder needs to be opened, then we have to see about it's correct positioning

			let dropdown = folder.querySelector(".bookmark-dropdown");

			if (folder.classList.contains("bookmark-folder-item")) {
				// position only matters on bookmark items, for now
				let parent = folder.closest("[open]");
				if (parent) {
					// by default, copy the parent direction
					folder.setAttribute("open", parent.getAttribute("open"));
				}
				if (folder.hasAttribute("vert")) {
					folder.removeAttribute("vert");
					dropdown.style.marginTop = "unset";
				}

				// get the dropdown position
				let rect = dropdown.getBoundingClientRect();

				// check if it's going outside the window bounds and then set it's alignment
				if (rect.right > winRight) {
					folder.setAttribute("open", "left");
				} else if (rect.left < winLeft) {
					folder.setAttribute("open", "right");
				}

				// TODO drop downs longer than the page are currently not done super nicely, but it's functional
				if (rect.bottom > winBottom) {
					folder.setAttribute("vert", "");
					dropdown.style.marginTop = Math.max(winBottom - rect.bottom, -(rect.top + 1)) + "px";
				}
			} else {
				// we are opening a folder on the bookmark bar, position here works a bit differently

				// get the dropdown position
				let rect = dropdown.getBoundingClientRect();

				// check if it's going outside the window bounds and then set it's alignment
				if (rect.right > winRight) {
					folder.setAttribute("open", "left");
				} else {
					// unless it goes outside of the window, set it to open on the right
					folder.setAttribute("open", "right");
				}
			}
		} else {
			// the folder should be closed
			folder.removeAttribute("open");
			// and then we want to close all remaining open folderItems as well
			let openFolderItems = folder.querySelectorAll(".bookmark-folder-item[open]");
			openFolderItems.forEach(function(openFolderItem) {
				openFolderItem.toggleAttribute("open");
			});
		}
	};

	let hoverFolder = function(folder) {
		// this function only applies to base level folders
		if (!folder.hasAttribute("open")) {
			let openFolder = bookmarkBar.querySelector(".bookmark-folder[open]");
			// only change open folder on hover, when another is already opened
			if (openFolder) {
				// close the previously open folder
				toggleFolder(openFolder);
				// and in turn open the one we hovered over
				toggleFolder(folder);
			}
		}
	};

	let configureFolder = function(folder, name, level) {
		let dropdown = folder.querySelector(".bookmark-dropdown");
		dropdown.style.zIndex = level;

		let title = folder.querySelector(".bookmark-title");
		if (name !== undefined && name !== "") {
			folder.title = name;
			title.textContent = name;
		} else {
			// don't leave empty nodes, messing up the spacing
			title.parentNode.removeChild(title);
		}
	};

	let addFolder = function(name) {
		let folder = document.importNode(bookmarkFolderTemplate, true);

		let item = folder.querySelector(".bookmark-layout");
		item.addEventListener("click", () => toggleFolder(folder));
		item.addEventListener("mouseover", () => hoverFolder(folder));

		configureFolder(folder, name);

		bookmarkBar.appendChild(folder);
		return folder;
	};

	let hoverFolderItem = function(parentFolder, folderItem) {
		if (!folderItem.openTimeout && !folderItem.hasAttribute("open")) {
			folderItem.openTimeout = window.setTimeout(function() {
				// if another folder is opened on this level, close it
				let openFolderItem = parentFolder.querySelector(".bookmark-folder-item[open]");
				if (openFolderItem) {
					toggleFolder(openFolderItem);
				}
				toggleFolder(folderItem);
				folderItem.openTimeout = null;
			}, 300);
		}
		if (folderItem.closeTimeout) {
			window.clearTimeout(folderItem.closeTimeout);
			folderItem.closeTimeout = null;
		}
		if (parentFolder.closeTimeout) {
			window.clearTimeout(parentFolder.closeTimeout);
			parentFolder.closeTimeout = null;
		}
	};

	let leaveFolderItem = function(parentFolder, folderItem) {
		if (folderItem.openTimeout) {
			window.clearTimeout(folderItem.openTimeout);
			folderItem.openTimeout = null;
		}
	};

	let addFolderItem = function(folder, name, level) {
		let folderItem = document.importNode(bookmarkFolderItemTemplate, true);

		folderItem.closeTimeout = null;
		folderItem.openTimeout = null;

		let item = folderItem.querySelector(".bookmark-layout");
		item.addEventListener("mouseover", () => hoverFolderItem(folder, folderItem));
		item.addEventListener("mouseout", () => leaveFolderItem(folder, folderItem));

		configureFolder(folderItem, name, level);

		let folderDropdown = folder.querySelector(".bookmark-dropdown");
		folderDropdown.appendChild(folderItem);
		return folderItem;
	};

	document.addEventListener("click", function(event) {
		let openFolder = bookmarkBar.querySelector(".bookmark-folder[open]");
		if (openFolder) {
			// only operate if a folder has been opened
			if (openFolder.contains(event.target)) {
				// we clicked on something within, this event is just passed on
			} else {
				// we clicked outside of an open folder, we should close it
				toggleFolder(openFolder);
			}
		}
	});

	// ------------------------------------------------------------------------

	// TODO overflow menu, needs to change on resize, that is a bishh, would mean I need to
	//  refactor the CSS and all, to only have one type of thing, abt overwrite lots with
	//  direct descendant of bookmark bar... Not a fan, but necessary for this
	//  may also give way for a few simplifications, or the opposite.. oof -signed M

	let showBookmarks = async function() {
		let toolbarBookmarks = await browser.storage.local.get("___newtab_bookmarks");
		let toolbarItems = toolbarBookmarks.___newtab_bookmarks;

		let handleItem = async function(item, folder, level) {
			let type = item[0];
			if (type === "f") {
				let title = item[1];
				let childItems = item[2];
				let subFolder;
				if (!folder) {
					subFolder = addFolder(title);
					level = 0;
				} else {
					subFolder = addFolderItem(folder, title, level);
				}
				for (let childItem of childItems) {
					await handleItem(childItem, subFolder, level + 1);
				}
			} else if (type === "b") {
				let title = item[1];
				let url = item[2];
				let icon = item[3];
				if (!folder) {
					addBookmark(url, title, icon);
				} else {
					addBookmarkItem(folder, url, title, icon);
				}
			}
		};

		for (let item of toolbarItems) {
			await handleItem(item);
		}
	}

	let newTabUrl = browser.extension.getURL("newtab.html");

	browser.history.deleteUrl({url: newTabUrl}).then();

	window.addEventListener("beforeunload", function() {
		// when moving away from the site, dispatch signal to background script
		// which in turn checks whether the containing tab has been closed
		// if it has been, it clears this page from the last opened tabs menu
		browser.tabs.getCurrent().then((tab) => {
			browser.runtime.sendMessage({tabId: tab.id}).catch(console.error);
		});
	});

	showBookmarks();

}, false);
