const DRAG_ENABLE = false;

window.addEventListener("load", function () {
	let templates = document.getElementById("bookmark-templates").content;
	let bookmarkTemplate = templates.querySelector(".bookmark");
	let bookmarkItemTemplate = templates.querySelector(".bookmark-item");
	let bookmarkFolderTemplate = templates.querySelector(".bookmark-folder");
	let bookmarkFolderItemTemplate = templates.querySelector(".bookmark-folder-item");
	let bookmarkBar = document.querySelector(".bookmark-bar");

	let getClosestBookmark = function(event) {
		let target = event.target;

		// TODO to do this properly, we totally should go through all,
		//  since with different styling there's a chance that you can reach the bookmark bar
		//  anywhere in the middle above or below the bookmarks, right now, to get around this
		//  we strictly made the bookmark wrapper to get around this issue

		if (target === bookmarkBar) {
			// we are not over any existing bookmarks, so on either end of the row
			// therefore we get the distance to the first bookmark
			let first = bookmarkBar.firstElementChild;
			let firstRect = first.getBoundingClientRect();
			let firstDistX = Math.abs(event.pageX - firstRect.left);

			// and also the distance to the last bookmark
			let last = bookmarkBar.lastElementChild;
			let lastRect = last.getBoundingClientRect();
			let lastDistX = Math.abs(event.pageX - lastRect.right);

			// and then we pick whichever is closest
			if (firstDistX < lastDistX) {
				target = first;
			} else {
				target = last;
			}
		} else {
			// if we are over parts of a bookmark node, we want to get the parent bookmark
			if (!target.closest) {
				// this function is only available on node elements and not primitives like plain text
				// these may well be the ones to respond to the event, therefore we need to move
				// to the respective parent node, which in turn will provide the required function
				target = target.parentNode;
			}
			// then we retrieve the closest parent node matching the selector (i.e. the surrounding bookmark div)
			target = target.closest(".bookmark");
		}

		return target;
	};

	let positionDraggedBookmarkNode = function (event) {
		let draggedNode = document.getElementById("dragged");
		let target = getClosestBookmark(event);

		// only do something if the dragged node isn't already in the right place
		if (target !== draggedNode) {
			// calculate relative offset on bookmark
			let rect = target.getBoundingClientRect();
			let offX = (event.pageX - rect.left) / rect.width;

			if (offX > 0.5) {
				// move to the next node and insert before it
				target = target.nextElementSibling;
				// check once more that we are not already placed correctly
				if (target !== draggedNode) {
					bookmarkBar.insertBefore(draggedNode, target);
				}
			} else if (target.previousElementSibling !== draggedNode) {
				// final check if the dragged node isn't already in place, if not, move there
				bookmarkBar.insertBefore(draggedNode, target);
			}
		}
	};

	if (DRAG_ENABLE) {
		let handleBookmarkDragStart = function (event) {
			event.dataTransfer.effectAllowed = "move";

			// select target and mark it as the element to be dragged
			let target = event.currentTarget;
			target.id = "dragged";

			// mark the location where the bookmark originates from, in case we want to cancel the drag operation
			let originMarker = document.createElement("div");
			originMarker.id = "origin-marker";
			bookmarkBar.insertBefore(originMarker, target);

			// I'm not sure that this is needed, but we set it anyway just in case
			event.dataTransfer.setData("text/plain", target.innerText);
		};

		let handleBookmarkDragEnter = function (event) {
			let draggedNode = document.getElementById("dragged");

			if (bookmarkBar.contains(event.target)) {
				// we are on the bookmark bar
				// move the dragged bookmark
				positionDraggedBookmarkNode(event);
			} else {
				// we are not on the bookmark bar
				// return the dragged bookmark to its origin
				// TODO we could check here if we aren't already there, for cases where the rest of the page
				//  becomes more intricate such that this event fires more frequently but currently that is not necessary
				let originMarker = document.getElementById("origin-marker");
				bookmarkBar.insertBefore(draggedNode, originMarker);
			}
		};

		let handleBookmarkDragOver = function (event) {
			// prevent other mouse events such as selection while dragging
			event.preventDefault();

			// move the dragged bookmark
			positionDraggedBookmarkNode(event);

			// set the dropEffect to move
			event.dataTransfer.dropEffect = "move";
		};

		let handleBookmarkDrop = function (event) {
			// prevent other mouse events such as selection
			event.preventDefault();

			// this event fires when a bookmark has been dropped on the bookmark bar and is therefore already
			// in the right position, we can simply remove the origin marker and let dragEnd handle the rest
			let originMarker = document.getElementById("origin-marker");
			bookmarkBar.removeChild(originMarker);
		};

		let handleBookmarkDragEnd = function (event) {
			// node has been dropped, remove mark and styling
			let draggedNode = document.getElementById("dragged");
			draggedNode.removeAttribute("id");

			let originMarker = document.getElementById("origin-marker");
			if (originMarker) {
				// if the bookmark hasn't been dropped on the designated target zone (bookmarkBar)
				// the drop event doesn't fire, where the origin marker would be removed
				// so if it still exists, we need to reposition the dragged bookmark first
				bookmarkBar.insertBefore(draggedNode, originMarker);
				// and then remove the origin marker
				bookmarkBar.removeChild(originMarker);
			}
		};
	}

	let configureBookmark = function(bookmark, url, name, icon) {
		// set base tooltip
		bookmark.title = url;

		let link = url;

		let anchor = bookmark.querySelector("a");
		// this pattern might need to be opened up to just any words, i.e. \w+
		if (!url.match(/^(https?|ftps?|file|mailto|javascript):/g)) {
			// url is seemingly malformed, we're gonna assume it to be https
			link = "https://" + url;
			// not showing the change is (for now) deliberate but up for contention,
			// depending on how reliable this will be
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
			// this mostly works but breaks on changed favicons inside pages
			//img.src = anchor.protocol + anchor.hostname + "/favicon.ico";
			// this is janky on most pages, but handles multi level favicons
			//img.src = link + "/favicon.ico";
		}
	};

	let addBookmark = function (url, name, icon) {
		let bookmark = document.importNode(bookmarkTemplate, true);
		if (DRAG_ENABLE) {
			bookmark.draggable = true;
			bookmark.addEventListener("dragstart", handleBookmarkDragStart);
			bookmark.addEventListener("dragend", handleBookmarkDragEnd);
			// kinda doesn't go here, but whatever
			bookmark.addEventListener("contextmenu", () => console.log("for later"));
		}

		configureBookmark(bookmark, url, name, icon);

		bookmarkBar.appendChild(bookmark);
	};

	let hoverBookmarkItem = function (parentFolder, bookmarkItem) {
		let openFolderItem = parentFolder.querySelector(".bookmark-folder-item[open]");
		if (openFolderItem && !openFolderItem.closeTimeout) {
			openFolderItem.closeTimeout = window.setTimeout(function () {
				toggleFolder(openFolderItem);
				openFolderItem.closeTimeout = null;
			}, 300);
		}
		if (parentFolder.closeTimeout) {
			window.clearTimeout(parentFolder.closeTimeout);
			parentFolder.closeTimeout = null;
		}
	};

	let addBookmarkItem = function (folder, url, name, icon) {
		let bookmarkItem = document.importNode(bookmarkItemTemplate, true);

		let item = bookmarkItem.querySelector(".bookmark-layout");
		item.addEventListener("mouseover", () => hoverBookmarkItem(folder, bookmarkItem));

		configureBookmark(bookmarkItem, url, name, icon);

		let folderDropdown = folder.querySelector(".bookmark-dropdown");
		folderDropdown.appendChild(bookmarkItem);
	};

	let toggleFolder = function(folder) {
		let winLeft = 0;
		let winRight = window.innerWidth;
		let winTop = 0;
		let winBottom = window.innerHeight;

		let isOpen = folder.hasAttribute("open");

		if (!isOpen) {
			// the folder needs to be opened, then we have to see about it's correct positioning

			let dropdown = folder.querySelector(".bookmark-dropdown");

			if (folder.classList.contains("bookmark-folder-item")) {
				// position only matters on bookmark items, for now
				let parent = folder.closest("[open]");
				console.log(parent, parent.getAttribute("open"), parent.hasAttribute("open"));
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
			folderItem.openTimeout = window.setTimeout(function () {
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

	if (DRAG_ENABLE) {
		document.querySelector(".wrapper").addEventListener("dragenter", handleBookmarkDragEnter);

		bookmarkBar.addEventListener("dragover", handleBookmarkDragOver);
		bookmarkBar.addEventListener("drop", handleBookmarkDrop);
	}

	// ------------------------------------------------------------------------

	// TODO we may want to handle the querying and handling of changeEvents on a site script

	// TODO overflow menu, needs to change on resize, that is a bishh, would mean I need to
	//  refactor the CSS and all, to only have one type of thing, abt overwrite lots with
	//  direct descendant of bookmark bar... Not a fan, but necessary for this
	//  may also give way for a few simplifications, or the opposite.. oof -signed M

	let loadBookmarks = async function() {
		let toolbar = await browser.bookmarks.getSubTree("toolbar_____");
		toolbar = toolbar[0];

		let handleNode = function(node, folder, level) {
			if (!node.url && (!node.type || node.type === "folder")) {
				let subFolder;
				if (!folder) {
					subFolder = addFolder(node.title);
					level = 0;
				} else {
					subFolder = addFolderItem(folder, node.title, level);
				}
				node.children.forEach(function (childNode) {
					handleNode(childNode, subFolder, level + 1);
				});
			} else if (node.url && (!node.type || node.type === "bookmark")) {
				if(node.url.startsWith("place:")) {
					// this is a special thingy we can't really work with...
					return;
				} else if (node.url.startsWith("chrome-extension://klbibkeccnjlkjkiokjodocebajanakg/suspended.html")) {
					// handler for that page suspender extension I used
					let match = node.url.match(/uri=([^&]*)/);

					if (match && match.length >= 2) {
						node.url = match[1];
						console.log("extracted suspended url", node.url, "from bookmark");
					}
				}

				if (!folder) {
					addBookmark(node.url, node.title);
				} else {
					addBookmarkItem(folder, node.url, node.title);
				}
			}
		};

		toolbar.children.forEach(function(node) {
			handleNode(node);
		});
	};

	let newtabUrl = browser.extension.getURL("newtab.html");

	browser.history.deleteUrl({url: newtabUrl});

	window.addEventListener("beforeunload", function(evt) {
		browser.tabs.getCurrent((tab) => {
			let rt = browser.runtime.connect();
			rt.postMessage({tabId: tab.id});
		});
	});

	loadBookmarks().then(function() {
		console.log("done");
	});

}, false);
