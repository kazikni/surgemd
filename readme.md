# Surgemd.io

## 📖 Description
Coming soon...

---

## 🖥️ Self-Host Instructions

### ⚙️ Setup
To run **Surgemd.io**, you’ll need to install a few programs first.  
The main ones are:

- [Deno](https://deno.com/)  
- [Node.js](https://nodejs.org/) (via [NVM](https://github.com/nvm-sh/nvm))  
- [Golang](https://go.dev/)
- [Python](https://www.python.org/)
---
### 1️⃣ Install Dependencies
* Install Deno
Follow the instructions here: [Deno Installation Guide](https://deno.com/)
* Install Node.js with NVM
First, install [NVM](https://github.com/nvm-sh/nvm).  
Then, install the recommended Node.js version (`v20.12.0`):
```bash
nvm install 20.12.0
nvm use 20.12.0
```
* Install Golang
Download and install from: [Golang](https://go.dev/)
* Install Python
Download and install from: [Golang](https://www.python.org/)
* Install FFmpeg
Download and install from: [FFmpeg](https://www.ffmpeg.org)
---
### 2️⃣ Install Golang

---
### 4️⃣ Get the Surgemd.io Code
You have three options:
* Download the source code directly from GitHub
* Clone the repository using Git
* (Recommended) Fork the repository on GitHub and clone your fork with Git
---
### 5️⃣ Install Dependencies
Open the project folder in your terminal and run:
```bash
python3 setup.py
```
This will install all required dependencies.
**Note: If you encounter errors, double-check your installation or the deno.json file.**
---
### 6️⃣ Run the Project
Start the development server with:
```bash
deno task dev
```
---
### 🎮 Play the Local Game
Once the server is running, open:
👉 [Local Game](http://localhost:3000)