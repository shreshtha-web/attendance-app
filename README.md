# SCRS Attendance Tracker

A simple, responsive attendance app for personal use, built with HTML, CSS and vanilla JavaScript. The roster was loaded from `SCRS Student updated sheet.xlsx`.

## Features
- 20 students preloaded from your Excel sheet (name, university roll number and section).
- Mark each student **Present** or **Absent**.
- Search by student name/roll number and filter by section/status.
- Summary counts update instantly.
- Attendance is saved in your browser's `localStorage`, separately for each date.
- Submit to download a PDF attendance report, including the present-student list and an absent-student summary.
- Responsive layout for desktop and mobile.

## Run locally
Because the app loads `students.json`, use a local web server instead of opening `index.html` directly.

### Option 1: VS Code Live Server
1. Extract this project folder.
2. Open the folder in VS Code.
3. Install the **Live Server** extension if needed.
4. Right-click `index.html` → **Open with Live Server**.

### Option 2: Python server
Open a terminal in this folder and run:

```bash
py -m http.server 8000
```

Then open `http://localhost:8000`.

The PDF generator uses jsPDF from a CDN, so an internet connection is needed when generating the PDF. Attendance storage is local to the browser/device; it does not sync between devices.

## Update the student list
Edit `students.json` and keep the same fields for every student:

```json
{
  "sno": 1,
  "rollNo": "1240439426",
  "name": "Student Name",
  "section": "AI3B"
}
```

Save the file, refresh the browser, and the updated roster will load.

## Publish on GitHub Pages
1. Create a new GitHub repository (for example, `scrs-attendance`).
2. Upload `index.html`, `style.css`, `app.js`, `students.json`, and `README.md` to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch `main` and folder `/ (root)`, then save.
6. Wait for the Pages deployment, then open the published URL.

After changing code or the roster, commit and push the updated files; GitHub Pages will publish the changes.

## Privacy notes
- No backend/server database is used.
- Attendance is stored in browser local storage. Clearing browser site data will remove it.
- If you publish the app publicly, the roster's names and roll numbers may be visible to anyone who can access the repository/site. Keep the repository **private** or remove personal student data before publishing publicly.
