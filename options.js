"use strict";
window.addEventListener("load", async function() {
	let bgSelect = document.getElementById("background-type");
	bgSelect.addEventListener("change", async function(evt) {
		let cfgContainer = document.getElementById("config-container");
		let selectedOption = bgSelect.querySelector(":checked");
		let selectedType = selectedOption.getAttribute("value");
		cfgContainer.setAttribute("show", selectedType);
		await browser.storage.sync.set({bgType: selectedType});
	});

	await initBackgroundSettings();

	document.getElementById("primary").addEventListener("change", async function(evt) {
		await browser.storage.sync.set({bgGradientInner: evt.currentTarget.value});
	});

	document.getElementById("secondary").addEventListener("change", async function(evt) {
		await browser.storage.sync.set({bgGradientOuter: evt.currentTarget.value});
	});

	document.getElementById("bg-url").addEventListener("change", async function(evt) {
		await browser.storage.sync.set({bgUrl: evt.currentTarget.value});
	});

	document.getElementById("bg-css").addEventListener("change", async function(evt) {
		await browser.storage.sync.set({bgCss: evt.currentTarget.value});
	});
});

const changeEvent = new Event("change");

async function initBackgroundSettings() {
	let config = await browser.storage.sync.get();
	let flag = false;
	if (config.bgType === undefined) {
		flag = true;
		config.bgType = "gradient";
	}
	let bgSelect = document.getElementById("background-type");
	let typeIndex = Array.from(bgSelect.options).findIndex(
		(e) => e.value === config.bgType);
	bgSelect.selectedIndex = typeIndex;
	bgSelect.dispatchEvent(changeEvent);
	if (config.bgGradientInner === undefined) {
		flag = true;
		config.bgGradientInner = "#748ddd";
	}
	document.getElementById("primary").value = config.bgGradientInner;
	if (config.bgGradientOuter === undefined) {
		flag = true;
		config.bgGradientOuter = "#233674";
	}
	document.getElementById("secondary").value = config.bgGradientOuter;
	if (config.bgUrl === undefined) {
		flag = true;
		config.bgUrl = ""
	}
	document.getElementById("bg-url").value = config.bgUrl;
	if (config.bgCss === undefined) {
		flag = true;
		config.bgCss = "";
	}
	document.getElementById("bg-css").value = config.bgCss;
	if (flag) {
		await browser.storage.sync.set(config);
	}
}