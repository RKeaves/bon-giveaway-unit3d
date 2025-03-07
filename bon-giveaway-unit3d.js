// ==UserScript==
// @name         bon-giveaway-unit3d
// @description  Slot-based Bonus (BON) giveaway system with enhanced prompts for UNIT3D trackers.
// @version      2.1.1
// @namespace   https://github.com/rkeaves
// @downloadURL https://github.com/rkeaves/bon-giveaway-unit3d/raw/main/bon-giveaway-unit3d.js
// @updateURL   https://github.com/rkeaves/bon-giveaway-unit3d/raw/main/bon-giveaway-unit3d.js
// @license      GPL-3.0-or-later
// @match        https://privatesilverscreen.cc/
// @grant        none
// @author      rkeaves
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG_SETTINGS = {
        log_chat_messages: false,
        disable_chat_output: false
    };

    // Global variables
    let messageSelector, authorSelector, botSelector, fancySelector, chatboxID, chatboxSelector;
    let newUnited = false, autoSponsor = null;
    let giveawayData = null;
    let chatbox = null, observer = null;
    let giveawayFrame, resetButton, closeButton, startButton, coinHeader, entriesWrapper;
    let numberEntries = new Map();
    // Private variable to store the winning number
    let secretWinningNumber;

    const regNum = /^-?\d+$/;
    const sponsorMessages = {
        "other_tracker": " [img=40]https://i.ibb.co/rRJwpJgR/Money-1x-1.webp[/img] ",
        "default": " [img=40]https://i.ibb.co/rRJwpJgR/Money-1x-1.webp[/img] "
    };

    // UI Elements HTML with an extra input for Reminder Interval (in minutes)
    const frameHTML = `
    <section id="giveawayFrame" class="panelV2" style="width: 450px; height: 90%; position: fixed; z-index: 9999; inset: 50px 150px auto auto; overflow: auto; border: 1px solid black" hidden="true">
      <header class="panel__heading">
        <div class="button-holder no-space">
          <div class="button-left">
            <h4 class="panel__heading">
              <i class="fas fa-coins" style="padding: 5px;"></i>
              Giveaway Menu
            </h4>
          </div>
          <div class="button-right">
            <button id="resetButton" class="form__button form__button--text">Reset</button>
            <button id="closeButton" class="form__button form__button--text">Close</button>
          </div>
        </div>
      </header>
      <div class="panel__body">
        <h1 id="coinHeader" class="panel__heading--centered"></h1>
        <form class="form" id="giveawayForm" style="display: flex; flex-flow: column; align-items: center;">
          <p class="form__group" style="max-width: 35%;">
            <input class="form__text" required id="giveawayAmount" pattern="[0-9]*" inputmode="numeric" type="text">
            <label class="form__label form__label--floating">Giveaway Amount</label>
          </p>
          <div class="panel__body" style="display: flex; justify-content: center; gap: 20px">
            <p class="form__group" style="width: 20%;">
              <input class="form__text" required id="startNum" pattern="[0-9]*" value="1" inputmode="numeric" type="text" maxlength="6">
              <label class="form__label form__label--floating">Start #</label>
            </p>
            <p class="form__group" style="width: 20%;">
              <input class="form__text" required id="endNum" pattern="[0-9]*" value="50" inputmode="numeric" type="text" maxlength="6">
              <label class="form__label form__label--floating">End #</label>
            </p>
          </div>
          <div class="panel__body" style="display: flex; justify-content: center; gap: 20px">
            <p class="form__group" style="width: 35%;">
              <input class="form__text" required id="slotNum" pattern="[0-9]*" value="3" inputmode="numeric" type="text">
              <label class="form__label form__label--floating">Required Slots</label>
            </p>
          </div>
          <p class="form__group" style="max-width: 35%;">
            <input class="form__text" required id="reminderInterval" pattern="[0-9]*" value="10" inputmode="numeric" type="text">
            <label class="form__label form__label--floating">Reminder Interval (min)</label>
          </p>
          <p class="form__group" style="text-align: center;">
            <button id="startButton" class="form__button form__button--filled">Start Giveaway</button>
          </p>
        </form>
        <div id="entriesWrapper" class="data-table-wrapper" hidden="">
          <table id="entriesTable" class="data-table">
            <thead><tr><th>User</th><th>Entry #</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>`;

    function checkUnit3d() {
        const newUnit3d = document.querySelector("#chatbox_header div");
        const oldUnit3d = document.querySelector(".panel__heading#frameHeader .button-right");
        if (newUnit3d) {
            newUnited = true;
            messageSelector = ".chatbox-message__content";
            authorSelector = ".user-tag";
            botSelector = ".chatbox-message__content";
            fancySelector = ".user-tag";
            chatboxSelector = "#chatbox_header div";
            chatboxID = "#chatbox__messages-create";
        } else if (oldUnit3d) {
            messageSelector = ".sent .text-bright div";
            authorSelector = ".list-group-item-heading span a";
            botSelector = ".sent div.system.bot";
            fancySelector = ".badge-user.text-bold";
            chatboxSelector = ".panel__heading#frameHeader .button-right";
            chatboxID = "#chat-message";
        }
    }

    function injectMenu() {
        checkUnit3d();
        document.body.insertAdjacentHTML("beforeend", frameHTML);
        const chatbox_header = document.querySelector(chatboxSelector);
        const giveawayBTN = createButton();
        chatbox_header.prepend(giveawayBTN);
        setupUIElements();
    }

    function createButton() {
        const coinsIcon = document.createElement("i");
        coinsIcon.className = "fas fa-coins";
        const btn = document.createElement("a");
        btn.className = "form__button form__button--text";
        btn.textContent = "Giveaway";
        btn.prepend(coinsIcon);
        btn.onclick = toggleMenu;
        return btn;
    }

    function setupUIElements() {
        giveawayFrame = document.getElementById("giveawayFrame");
        resetButton = document.getElementById("resetButton");
        resetButton.onclick = resetGiveaway;
        closeButton = document.getElementById("closeButton");
        closeButton.onclick = toggleMenu;

        const goldCoins = document.createElement("i");
        goldCoins.className = "fas fa-coins";
        goldCoins.style.cssText = "color: #ffc00a; padding: 5px;";
        coinHeader = document.getElementById("coinHeader");
        coinHeader.prepend(goldCoins);
        const currentBon = document.querySelector(".ratio-bar__points") ? document.querySelector(".ratio-bar__points").textContent.trim() : "0";
        coinHeader.append(` ${currentBon}`);

        startButton = document.getElementById("startButton");
        startButton.onclick = startGiveaway;
        entriesWrapper = document.getElementById("entriesWrapper");
        setupFormValidation();
    }

    function setupFormValidation() {
        const startInput = document.getElementById("startNum");
        const endInput = document.getElementById("endNum");
        const slotInput = document.getElementById("slotNum");

        startInput.addEventListener("input", validateRange);
        endInput.addEventListener("input", validateRange);
        slotInput.addEventListener("input", validateSlots);

        function validateRange() {
            if (parseInt(startInput.value) > parseInt(endInput.value)) {
                startInput.setCustomValidity("Start # must be ≤ End #");
                endInput.setCustomValidity("End # must be ≥ Start #");
            } else {
                startInput.setCustomValidity("");
                endInput.setCustomValidity("");
            }
        }

        function validateSlots() {
            if (parseInt(this.value) < 1) {
                this.setCustomValidity("At least 1 slot required");
            } else {
                this.setCustomValidity("");
            }
        }
    }

    function startGiveaway(event) {
        event.preventDefault();
        if (!document.getElementById("giveawayForm").checkValidity()) return;

        const currentBon = parseInt(document.querySelector(".ratio-bar__points") ? document.querySelector(".ratio-bar__points").textContent.replace(/\s/g, '') : "0");
        const formData = {
            host: document.querySelector(".top-nav__username") ? document.querySelector(".top-nav__username").children[0].textContent.trim() : "Host",
            amount: parseInt(document.getElementById("giveawayAmount").value),
            startNum: parseInt(document.getElementById("startNum").value),
            endNum: parseInt(document.getElementById("endNum").value),
            requiredSlots: parseInt(document.getElementById("slotNum").value),
            reminderInterval: parseInt(document.getElementById("reminderInterval").value) || 10,
            // winningNumber is now stored privately and not in formData
            sponsors: [],
            lastSponsorCheck: Date.now() / 1000,
            sponsorCheckInterval: 20
        };

        if (currentBon < formData.amount) {
            alert(`Insufficient BON! You have ${currentBon} but need ${formData.amount}`);
            return;
        }

        // Compute and store the winning number privately
        secretWinningNumber = getRandomInt(formData.startNum, formData.endNum);
        giveawayData = formData;
        setupGiveaway(giveawayData);
    }

    function setupGiveaway(data) {
        chatbox = document.querySelector(chatboxID);
        document.querySelectorAll("#giveawayForm input, #giveawayForm button").forEach(el => el.disabled = true);
        entriesWrapper.hidden = false;
        window.onbeforeunload = () => "Giveaway in progress";

        const sponsorMsg = window.location.href.includes("other_tracker") ? sponsorMessages.other_tracker : sponsorMessages.default;
        sendMessage(
            `[img]https://i.ibb.co/HfFjtyYC/cash-Money-1x.webp[/img]  ` +
            `[b][color=#ffc00a]${giveawayData.amount} BON Giveaway![/color][/b] ` +
            `[i]Pick a number[/i] [b]${giveawayData.startNum}-${giveawayData.endNum}[/b]. ` +
            `[b]Once we reach [color=#ffc00a]${giveawayData.requiredSlots}[/color] participants, the draw begins![/b] ${sponsorMsg}\n`
        );

        if (!observer) {
            observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        parseMessage(node);
                    });
                });
            });
        }
        const messagesContainer = document.querySelector(newUnited ? ".chatroom__messages" : ".messages .list-group");
        if (messagesContainer) {
            observer.observe(messagesContainer, { childList: true });
        }

        // Schedule sponsor tracking if needed
        if (!autoSponsor) {
            giveawayData.sponsorIntervalID = setInterval(() => getSponsors(), giveawayData.sponsorCheckInterval * 1000);
        }
        // Schedule automatic reminders
        if (giveawayData.reminderInterval > 0) {
            giveawayData.reminderIntervalID = setInterval(() => sendReminder(), giveawayData.reminderInterval * 60000);
        }
    }

    // Enhanced parseMessage: processes commands and numeric entries with professional prompts
    function parseMessage(node) {
        if (!(node instanceof HTMLElement)) return;
        const messageElement = node.querySelector(messageSelector);
        const authorElement = node.querySelector(authorSelector);
        if (!messageElement || !authorElement) return;
        const messageText = messageElement.textContent.trim();
        const author = authorElement.textContent.trim();
        if (!giveawayData) return; // Only process if giveaway is active

        const lowerMsg = messageText.toLowerCase();

        // !help command: show list of commands
        if (lowerMsg.startsWith("!help")) {
            const helpText = `[code][b][color=#ffc00a]🎉 Giveaway Commands 🎉[/color][/b]\n\n` +
        `[b]• [color=#00ff00]!help[/color][/b] — Show this help message.\n` +
        `[b]• [color=#00ff00]!status[/color][/b] — Display current giveaway status.\n` +
        `[b]• [color=#00ff00]!info[/color][/b] — Show detailed giveaway information.\n` +
        `[b]• [color=#00ff00]!reminder[/color][/b] — Manually trigger a giveaway reminder.\n` +
        `[b]• [color=#00ff00]!random[/color][/b] — Enter with a random number within the allowed range.\n` +
        `[b]• [color=#ff0000]!cancel[/color][/b] — Cancel the current giveaway.\n` +
        `[b]• [color=#00ff00]!start[/color][/b] — Force start the giveaway.\n` +
        `[b]• [color=#00ff00][number][/color][/b] — Enter the giveaway by typing a valid number.\n\n` +
        `[b] Once [color=#ffc00a]${giveawayData.requiredSlots}[/color] valid entries are received, the giveaway concludes automatically! [/b][/code]`;

            sendMessage(helpText);
            return;
        }

        // !status command: show current entry count and number range (winning number hidden)
        if (lowerMsg.startsWith("!status")) {
            const statusMsg = `[code][b][color=#ffc00a]🎉 Giveaway Status 🎉[/color][/b]\n\n` +
                `[b]• [color=#00ff00]Entries[/color][/b]: ${numberEntries.size} / [color=#ffc00a]${giveawayData.requiredSlots}[/color]\n` +
                `[b]• [color=#00ff00]Number Range[/color][/b]: [color=#ffc00a]${giveawayData.startNum}[/color] - [color=#ffc00a]${giveawayData.endNum}[/color][/code]`;

            sendMessage(statusMsg);
            return;
        }

        // !info command: host-only command to show detailed giveaway info (without winning number)
        if (lowerMsg.startsWith("!info")) {
            if (author !== giveawayData.host) {
                sendMessage(`[code]${author}, only the host can use that command.[/code]`);
                return;
            }
            const infoMsg = `[code]Giveaway Information:
• Host: ${giveawayData.host}
• BON Amount: ${giveawayData.amount}
• Number Range: ${giveawayData.startNum} to ${giveawayData.endNum}
• Required Slots: ${giveawayData.requiredSlots}
• Reminder Interval: ${giveawayData.reminderInterval} minute(s)
• Commands: !help, !status, !info, !reminder, !random, !cancel, !start, [number][/code]`;
            sendMessage(infoMsg);
            return;
        }

        // !reminder command: host-only command to manually trigger reminder (winning number hidden)
        if (lowerMsg.startsWith("!reminder")) {
            if (author !== giveawayData.host) {
                sendMessage(`[code]${author}, only the host can use that command.[/code]`);
                return;
            }
            sendReminder();
            return;
        }

        // !cancel command: allow host to cancel giveaway
        if (lowerMsg.startsWith("!cancel")) {
            if (author === giveawayData.host) {
                sendMessage(`[code]Giveaway cancelled by host ${author}.[/code]`);
                resetGiveaway();
            } else {
                sendMessage(`[code]${author}, only the host can cancel the giveaway.[/code]`);
            }
            return;
        }

        // !start command: host-only command to force start the giveaway even if required slots are not met
        if (lowerMsg.startsWith("!start")) {
            if (author !== giveawayData.host) {
                sendMessage(`[code]${author}, only the host can force start the giveaway.[/code]`);
                return;
            }
            sendMessage(`[code]Host ${author} has started the giveaway.[/code]`);
            endGiveaway();
            return;
        }

        // !random command: enter with a random number
        if (lowerMsg.startsWith("!random")) {
            const randomNum = getRandomInt(giveawayData.startNum, giveawayData.endNum);
            handleEntryMessage(randomNum, author, true);
            return;
        }

        // Process direct numeric entries
        if (regNum.test(messageText)) {
            const num = parseInt(messageText, 10);
            handleEntryMessage(num, author, false);
        }
    }

    // Modified handleEntryMessage with confirmation prompts and dynamic author links
    function handleEntryMessage(number, author, isRandom) {
        const currentDomain = window.location.hostname; // Get current domain

        // Build the user URL dynamically
        const userUrl = `https://${currentDomain}/users/${author}`;

        if (number < giveawayData.startNum || number > giveawayData.endNum) {
            sendMessage(`[code][b]❌ Invalid entry from [url=${userUrl}][u]${author}[/u][/url][/b] ! [i]Please choose a number between:[/i] [b]${giveawayData.startNum}[/b] and [b]${giveawayData.endNum}[/b].[/code]`);
            return;
        }
        if (numberEntries.has(author)) {
            sendMessage(`[code]◽️ [url=${userUrl}][b][u]${author}[/u][/b][/url], [i]you've already[/i] [b]entered[/b] [i]the giveaway, type !help for more.[/i][/code]`);
            return;
        }
        if (Array.from(numberEntries.values()).includes(number)) {
            sendMessage(`[code]◽️ Sorry [url=${userUrl}][b][u]${author}[/u][/b][/url], [i]the number[/i] [b][u]${number}[/u][/b] [i]is already taken.[/i] [b]Please choose another![/b][/code]`);
            return;
        }
        numberEntries.set(author, number);
        updateEntries();
        if (isRandom) {
            sendMessage(`[code]◽️ [i]Assigned number[/i]: [b][u]${number}[/u][/b] [i]for[/i] [url=${userUrl}][b][u]${author}[/u][/b][/url] [i]via !random[/i].[/code]`);
        } else {
            sendMessage(`[code]◽️ [i]Successfully registered[/i]: [url=${userUrl}][b][u]${author}[/u][/b][/url] [i]with number[/i] [color=#00ff00][b][u]${number}[/u][/b][/color].`);
        }

        if (numberEntries.size >= giveawayData.requiredSlots) {
            sendMessage("[code][b]Slots are full![/b] 🏁  [i]Drawing winner[/i]...[/code]");
            endGiveaway();
        }
    }

    // Reminder function to send current giveaway status (winning number hidden)
    function sendReminder() {
        const reminderText =
            `[img]https://i.ibb.co/HfFjtyYC/cash-Money-1x.webp[/img]  ` +
            `[b][color=#ffc00a]${giveawayData.amount} BON Giveaway![/color][/b] ` +
            `Pick a number [b]${giveawayData.startNum}-${giveawayData.endNum}[/b]. ` +
            `[b]Once we reach [color=#ffc00a]${giveawayData.requiredSlots}[/color] participants, the draw begins![/b] [img=40]https://i.ibb.co/sp1DDGHv/Coin-Time-1x.webp[/img] `;

        sendMessage(reminderText);
    }

    function endGiveaway() {
        if (numberEntries.size === 0) {
            sendMessage("[code]No entries received – giveaway cancelled![/code]");
            return resetGiveaway();
        }
        if (!autoSponsor && giveawayData.sponsorIntervalID) clearInterval(giveawayData.sponsorIntervalID);
        if (giveawayData.reminderIntervalID) clearInterval(giveawayData.reminderIntervalID);
        if (observer) observer.disconnect();

        let closestEntry = null, minDiff = Infinity;
        numberEntries.forEach((num, user) => {
            const diff = Math.abs(num - secretWinningNumber);
            if (diff < minDiff) {
                minDiff = diff;
                closestEntry = { user, num };
            }
        });

        if (closestEntry) {
            const currentDomain = window.location.hostname; // Get current domain
            const userUrl = `https://${currentDomain}/users/${closestEntry.user}`; // Build the user URL dynamically

            sendMessage(
                `[code]🏆 [i]Winner:[/i] [b][color=#ffc00a] [url=${userUrl}][u]${closestEntry.user}[/u][/url][/color][/b] [i]with number[/i] [color=#00ff00][b][u]${closestEntry.num}[/u][/b] 🎯[/color], [i]congrats ![/i]  [img=40]https://i.ibb.co/9mpKkQpM/Money-1x-1.webp[/img][/code]`
            );
            sendMessage(`/gift ${closestEntry.user} ${giveawayData.amount} Giveaway winner!`);
        } else {
            sendMessage("[code]No valid entries – giveaway cancelled![/code]");
        }
        resetGiveaway();
    }

    function resetGiveaway() {
        numberEntries.clear();
        updateEntries();
        document.getElementById("giveawayForm").reset();
        document.querySelectorAll("#giveawayForm input, #giveawayForm button").forEach(el => el.disabled = false);
        entriesWrapper.hidden = true;
        window.onbeforeunload = null;
        if (observer) observer.disconnect();
        if (giveawayData && giveawayData.sponsorIntervalID) clearInterval(giveawayData.sponsorIntervalID);
        if (giveawayData && giveawayData.reminderIntervalID) clearInterval(giveawayData.reminderIntervalID);
        giveawayData = null;
    }

    // Helper functions
    function toggleMenu() {
        giveawayFrame.hidden = !giveawayFrame.hidden;
    }

    function updateEntries() {
        const entriesTable = document.getElementById("entriesTable");
        entriesTable.innerHTML = Array.from(numberEntries)
            .map(([user, num]) => `<tr><td>${user}</td><td>${num}</td></tr>`)
            .join("");
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function sendMessage(msg) {
        if (!DEBUG_SETTINGS.disable_chat_output && chatbox) {
            chatbox.value = msg;
            chatbox.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 13 }));
        }
        if (DEBUG_SETTINGS.log_chat_messages) console.log(msg);
    }

    // Stub for sponsor tracking – implement as needed
    function getSponsors() {
        // Sponsor tracking logic can be added here if desired.
    }

    // Initialization
    setTimeout(injectMenu, 1000);
})();
