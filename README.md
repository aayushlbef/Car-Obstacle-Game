# 🏎️ Car Obstacles Game (Neon Racer 3D)

A fast-paced, 3D arcade driving game where players navigate a neon-lit futuristic city, dodging oncoming traffic to achieve the highest score.

## 🚀 Features
- **3D Graphics**: Built with `Three.js` for a high-quality visual experience including neon lights, rain effects, and a dynamic city environment.
- **Progressive Difficulty**: The game features a leveling system where speed and obstacle density increase as you score higher.
- **Social Integration**: 
  - **Google Authentication**: Sign in using Google to save your progress.
  - **Global Leaderboard**: Compete with other players and track your global rank.
  - **User Profiles**: Custom unique usernames and avatar support.
- **Responsive Controls**: Supports both Keyboard (Arrow keys/AD) and Touch (Swipe/Tap) for mobile and desktop play.
- **Dynamic Audio**: Procedural synthwave music and sound effects generated via the Web Audio API.

## 🛠️ Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **3D Engine**: [Three.js](https://threejs.org/)
- **Backend/Database**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Styling**: Custom CSS with a Neon/Cyberpunk aesthetic

## 🎮 How to Play
1. **Start**: Click the "Start Engine" button on the main screen.
2. **Movement**: 
   - **PC**: Use `Left Arrow` / `A` to move left and `Right Arrow` / `D` to move right.
   - **Mobile**: Swipe left/right or tap the left/right side of the screen.
3. **Objective**: Avoid crashing into other cars. Each car passed increases your score.
4. **Pause**: Press `Space` or the Pause button to halt the action.

## 📂 Project Structure
- `index.html`: The main entry point and UI layout.
- `style.css`: Styling for the neon UI and overlays.
- `script.js`: Core game logic, 3D rendering, and physics.
- `auth.js`: Firebase authentication and user profile management.
- `leaderboard.js`: Logic for fetching and displaying the top global scores.
- `firebase-config.js`: Firebase project configuration.
- `assets/`: Contains textures for the environment and car models.
