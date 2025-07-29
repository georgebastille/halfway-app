## Project Overview

This is a Next.js application that helps users find the fairest or fastest meeting point in London based on travel times from various tube, overground, and tram stations. The application is built with TypeScript, Tailwind CSS for styling, and uses a pre-built SQLite database (`tfl.db`) to store station and travel time information.

The frontend is a single-page application where users can input multiple starting stations. The backend, implemented using Next.js API routes, queries the SQLite database to find all possible meeting points and then calculates the best option based on a user-defined "fairness" weight. The "fairest" option minimizes the variance in travel times, while the "fastest" option minimizes the average travel time.

## Building and Running

### Prerequisites

*   Node.js (v18 or later)
*   npm

### Key Commands

*   **Install dependencies:**
    ```bash
    npm install
    ```

*   **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at [http://localhost:3000](http://localhost:3000).

*   **Create a production build:**
    ```bash
    npm run build
    ```

*   **Run the production server:**
    ```bash
    npm run start
    ```

*   **Lint the code:**
    ```bash
    npm run lint
    ```

## Development Conventions

*   **Framework:** The project uses Next.js with the App Router.
*   **Language:** The entire codebase is written in TypeScript.
*   **Styling:** Tailwind CSS is used for styling.
*   **API:** The backend is implemented as API routes within the `src/app/api` directory.
*   **Database:** The application uses a SQLite database (`tfl.db`) accessed via the `better-sqlite3` library. The database connection is managed in `src/lib/db.ts`.
*   **Logic:** The core logic for calculating the meeting points is located in `src/lib/logic.ts`.
*   **Components:** Reusable React components are stored in the `src/app/components` directory.
