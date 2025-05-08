# bon-giveaway-unit3d

**bon-giveaway-unit3d** is a slot-based Bonus (BON) giveaway system tailored for UNIT3D trackers. This userscript integrates directly into the chat interface, allowing hosts to manage interactive giveaways with ease and style. With customizable options, real-time validations, and enhanced prompts.

---

## Features

- **Customizable Giveaway Setup**  
  Configure BON amount, number range, required slots, and reminder intervals directly from an easy-to-use UI.

- **Interactive Commands**  
  Supports a variety of chat commands:
  - `!help` — Show available giveaway commands.
  - `!status` — Display the current giveaway status.
  - `!info` — Reveal detailed giveaway information (host-only).
  - `!reminder` — Manually trigger a reminder (host-only).
  - `!random` — Enter with a random number within the allowed range.
  - `!cancel` — Cancel the ongoing giveaway (host-only).
  - `!start` — Force start the giveaway (host-only).

- **Dynamic User Feedback**  
  Validates user entries in real time, preventing duplicate or out-of-range numbers and providing clear prompts.

- **Automatic Winner Selection**  
  Once the required number of valid entries is reached, the script automatically draws a winner based on the closest number to a secret random value.

- **Sponsor Tracking (Stub)**  
  Includes a basic framework for sponsor tracking with room for further enhancements.

---

## Installation

### Prerequisites

- A user script manager such as [Tampermonkey](https://tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/).

### Steps

1. **Install via Direct Download**  
   Click the following link to install the userscript directly:  
   [Download bon-giveaway-unit3d.js](https://github.com/rkeaves/bon-giveaway-unit3d/raw/main/bon-giveaway-unit3d.js)

2. **Manual Installation (Git Clone)**  
   Clone the repository and add the script to your user script manager:
   ```bash
   git clone https://github.com/rkeaves/bon-giveaway-unit3d.git
