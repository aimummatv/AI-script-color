# Script Stylist

Script Stylist is a web application designed to help screenwriters, directors, and actors analyze and format scripts. It uses AI to automatically identify characters, highlights their dialogue with distinct colors, and provides tools for easy script management and exporting.

This tool is built with Next.js, React, Tailwind CSS, and uses Google's Gemini models through Genkit for its AI-powered features.

## Features

- **AI-Powered Character Identification**: Upload a script (`.txt`, `.md`, `.docx`), and the application will automatically identify the characters using Google's Gemini AI.
- **Rule-Based Fallback**: If AI is disabled or fails, a rule-based system attempts to identify characters, ensuring functionality is always available.
- **Color-Coded Dialogue**: Each identified character is assigned a unique color, and their dialogue lines are highlighted throughout the script for easy visual scanning.
- **Dynamic Character Management**:
    - **Edit**: Easily correct or change character names directly in the UI.
    - **Delete**: Remove incorrectly identified characters.
    - **Add**: Manually add characters that were missed.
    - **Assign Artists**: Add artist names to each character for casting or reference.
- **Group by Character View**: Toggle a switch to group all dialogue by character, making it easy for artists to see all their lines in one place.
- **Unassigned Dialogue**: In the grouped view, all non-dialogue lines (scene descriptions, actions) are collected under an "Unassigned Dialogue" section so no content is lost.
- **Customizable Highlighting**: Randomize the assigned character colors with a single click.
- **Multiple Export Options**:
    - **CSV**: Export the character list, artist assignments, and dialogue counts.
    - **PDF**: Generate a styled PDF of the color-coded script, preserving the visual highlights.
    - **DOCX**: Create a professionally formatted Word document with proper fonts (Nirmala UI, 12pt), 1.5 line spacing, and a character list. The export respects the "Group by Character" view.
- **API Key Management**: Securely save your Google AI API key in your browser's local storage. The app includes a validator to test if your key is working correctly.
- **Dark/Light Mode**: Switch between themes for comfortable viewing in any lighting condition.
- **Responsive Design**: A clean, modern interface that works on both desktop and mobile devices.


## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Google AI API key. This key is used for the AI-powered features. You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

    ```env
    GEMINI_API_KEY="your_google_ai_api_key"
    ```
    *Note: You can also manage the API key directly within the application's settings, which saves it to your browser's local storage.*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## How to Use the Application

1.  **Upload a Script**: Click the "Upload Script" button to select a `.txt`, `.md`, or `.docx` file from your computer.
2.  **Character Identification**:
    - If the "Use AI" switch is on and a valid API key is set, the app will use AI to find characters.
    - If AI is disabled or fails, it will use a simpler rule-based method.
    - The identified characters will appear in the "Identified Characters" list on the right.
3.  **Manage Characters**:
    - **Edit a name**: Click the pencil icon next to a character's name to make corrections.
    - **Delete a character**: Click the trash icon to remove a character from the list.
    - **Add a character**: Use the "Add a character manually" input field at the bottom of the list.
    - **Assign an artist**: Type the artist's name in the "Artist" input field for any character.
4.  **View the Styled Script**:
    - The main script area will show your script with dialogue lines highlighted.
    - Use the **"Group by Character"** switch to see all lines for each artist grouped together. This view also includes an "Unassigned Dialogue" section for scene descriptions and other non-dialogue text.
    - Click **"Randomize"** to shuffle the highlight colors.
5.  **Export Your Script**:
    - **Export as CSV**: Downloads a CSV file with character names, assigned artists, and dialogue counts.
    - **Export as PDF**: Downloads a visually styled PDF of the script, perfect for digital sharing.
    - **Export as DOCX**: Downloads a formatted Microsoft Word document, ready for printing or further editing.

## Project Structure

-   `src/app/page.tsx`: The main page component containing the application's UI and core client-side logic.
-   `src/ai/flows/`: Contains the Genkit flows that interact with the Google AI models.
    -   `generate-character-confidence-scores.ts`: The flow for identifying characters with AI.
    -   `validate-api-key.ts`: The flow for testing the user's API key.
-   `src/components/ui/`: Contains the reusable UI components from [ShadCN](https://ui.shadcn.com/).
-   `public/`: Static assets for the application.
-   `tailwind.config.ts`: Configuration for Tailwind CSS.

## Technologies Used

-   **Framework**: [Next.js](https://nextjs.org/)
-   **UI Library**: [React](https://reactjs.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit) with [Google Gemini](https://ai.google.dev/)
-   **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)
-   **File Handling**:
    -   `mammoth`: For extracting text from `.docx` files.
    -   `jspdf` & `html2canvas`: for PDF generation.
    -   `docx`: For `.docx` generation.
    -   `file-saver`: For triggering file downloads.
