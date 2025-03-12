# Star Catcher: Codebase and Development Overview

**Star Catcher** is an interactive, web-based game designed to engage players in a gamified survey experience. Players catch stars moving through a 3D-like starfield, and each star, when clicked or tapped, reveals an opinion statement ("op-stat") sourced from a Firebase Firestore database. Players can agree or disagree with these statements, earning experience points (EXP) based on the star’s color. The game includes user authentication, a leveling system, and is optimized for both desktop and mobile devices. Below, we explore the game’s intent, codebase details, and the programming strategies employed to deliver a seamless and engaging user experience.

---

## Game Concept and Purpose

**Star Catcher** aims to collect user opinions in an entertaining way by disguising a survey as a game. The development team’s primary goal is to keep players engaged with op-stats longer than they would in a traditional survey format. The game achieves this through:

- **Immersive Gameplay**: A dynamic starfield where stars of varying colors move towards the player, creating a sense of depth and interaction.
- **Op-Stat Delivery**: Catching a star triggers a dialogue box with an op-stat, prompting the player to respond.
- **Reward System**: Players earn EXP based on star color, with rarer stars (e.g., gold) offering higher rewards, encouraging continued play.
- **Progression**: A leveling system provides a sense of achievement, motivating players to catch more stars and interact with more op-stats.

The team balances gameplay difficulty to ensure accessibility—especially on mobile—while maintaining the illusion of a challenging experience, making it fun and rewarding rather than frustrating.

---

## Codebase Description

The **Star Catcher** codebase is structured around three core files and leverages a modern web development stack:

### Technical Stack
- **HTML**: Defines the webpage structure, including the canvas for star rendering and UI elements like dialogue boxes and buttons.
- **CSS**: Styles the interface for visual appeal and usability across devices.
- **JavaScript**: Drives the game logic, handling star movement, user input, Firebase integration, and more.
- **Firebase**:
  - **Authentication**: Supports login via Google, Twitter, or email.
  - **Firestore**: Stores user data (e.g., EXP) and op-stats.

### File Structure
- **`index.html`**: Sets up the game’s foundation, including the canvas, dialogue box, stat display, and authentication controls.
- **`styles.css`**: Manages the visual design of UI elements.
- **`script.js`**: Contains the bulk of the logic:
  - Initializes Firebase for authentication and data storage.
  - Generates and animates stars on the canvas.
  - Fetches and assigns op-stats to stars.
  - Processes user inputs (clicks, taps, drags).
  - Tracks EXP and levels.

### Key Features
- **Starfield**: Stars move in a 3D-like space, rendered on a 2D canvas with perspective projection.
- **Op-Stat Interaction**: Each caught star displays an op-stat for player response.
- **EXP and Levels**: Players earn EXP (e.g., 1 for white stars, 50 for gold) and level up as they progress.
- **Authentication**: Optional login saves progress and responses.
- **Mobile Support**: Touch-optimized mechanics ensure playability.
- **Audio**: Sound effects enhance feedback for actions like catching stars or leveling up.

---

## Programming Strategies for End-User Experience

The development team employed deliberate programming strategies to ensure **Star Catcher** is engaging, balanced, and optimized across devices. Below are the key approaches:

### 1. Device-Specific Input Handling
- **Detection**: Uses `'ontouchstart' in window` to identify touch devices.
- **Desktop**: Handles clicks with `click` events, checking star hit areas with a precision factor (`desktopPrecision`).
- **Mobile**: Uses `touchstart` for taps and `touchmove` for dragging to adjust the view. Taps have larger hit areas (`mobilePrecision`) and an 80% chance (`mobileNearMissChance`) to catch the nearest star if missed but close (within `maxDistance`).
- **Purpose**: Ensures accurate star-catching on touchscreens while maintaining desktop responsiveness.

### 2. Efficient Star Rendering
- **Animation**: Leverages `requestAnimationFrame` for smooth, performant star movement.
- **Depth Sorting**: Stars are sorted by z-position to render correctly in the 3D-like field.
- **Minimal DOM Updates**: Limits interactions with the DOM, keeping the canvas-based rendering lightweight.
- **Purpose**: Delivers a fluid, immersive starfield without performance lag.

### 3. Balanced Op-Stat Distribution
- **Storage**: Op-stats reside in Firestore under an `op-stats` collection, split into 20 categories ("directions") with 50 statements each.
- **Fetching**: Pre-fetches batches of 20 op-stats (one per direction) into a queue (`opStatQueue`).
- **Assignment**: Stars pull the next op-stat from the queue, triggering a refill when low.
- **Shuffling**: Batches are randomized within each fetch to avoid repetition while ensuring equal category representation.
- **Purpose**: Keeps op-stats diverse and balanced, enhancing engagement.

### 4. Illusion of Gameplay Difficulty
- **Mobile Near-Miss**: Allows an 80% chance to catch the nearest star on a missed tap if within `maxDistance`, making the game feel forgiving yet skill-based.
- **Tunable Precision**: Variables like `desktopPrecision`, `mobilePrecision`, and `maxDistance` adjust hit detection difficulty.
- **Purpose**: Maintains a fun, rewarding experience without frustrating players, especially on mobile.

### 5. View Control
- **Desktop**: WASD keys adjust pitch and yaw via rotation matrices.
- **Mobile**: Tap, hold, and drag mimic WASD (left = `A`, right = `D`, up = `S`, down = `W`).
- **Implementation**: Rotation matrices efficiently compute view changes.
- **Purpose**: Provides intuitive navigation of the starfield across devices.

### 6. Progression Feedback
- **EXP System**: Rewards vary by star color (e.g., white = 1 EXP, gold = 50 EXP).
- **Leveling**: EXP thresholds increase per level, with a progress bar and sound effect on level-up.
- **Purpose**: Encourages continued play through tangible rewards and audio-visual cues.

### 7. Performance Optimization
- **Canvas Rendering**: Stars are drawn as squares with size and position calculated via perspective projection, avoiding heavy computations.
- **Batch Processing**: Op-stats are fetched in batches to minimize network calls.
- **Purpose**: Ensures the game runs smoothly on both low- and high-end devices.

---

## Conclusion

**Star Catcher** blends interactive gameplay with a backend-driven survey system to create a unique, engaging experience. The development team’s intention is to collect user opinions while keeping players entertained through a star-catching mechanic, progression system, and device-optimized design. The codebase—built with HTML, CSS, JavaScript, and Firebase—reflects a focus on performance, accessibility, and balance. By employing strategies like device-specific inputs, efficient rendering, and balanced op-stat delivery, the team ensures the game feels challenging yet approachable, achieving its goal of a gamified survey that players enjoy.

This overview equips an LLM or reader with a quick, comprehensive understanding of the **Star Catcher** codebase and the development team’s vision.