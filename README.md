# Halfway

Find the fairest place for a group to meet in London based on Tube, Overground, and Tram travel times.

## Overview

This project helps groups of people find the most convenient station to meet at in London. It considers the travel time for each person from their starting station to every other station in the network.

The application provides a simple interface where users can input two or more starting stations. It then calculates potential meeting points and ranks them based on a user-adjustable slider that weighs between:

*   **Fairest:** The meeting point with the lowest variance in travel times for all members of the group.
*   **Fastest:** The meeting point with the lowest average travel time for the group.

## Tech Stack

This application is a modern web app built with the following technologies:

*   **Framework:** [Next.js](https://nextjs.org/) (React)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Database:** [SQLite](https://www.sqlite.org/index.html) (via the `better-sqlite3` package)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Deployment:** [Vercel](https://vercel.com/)

The backend logic and API are handled by Next.js API Routes, which query a pre-built SQLite database containing all station-to-station travel times.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/en/) (v18 or later recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js)

### Local Development

1.  **Clone the repository and navigate to the app directory:**
    ```bash
    git clone <repository-url>
    cd halfway/halfway-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the application:**
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment

This application is optimized for deployment on [Vercel](https://vercel.com/).

1.  **Install the Vercel CLI:**
    While you can install it globally, using `npx` is recommended to always use the latest version.

2.  **Login to Vercel:**
    This command will prompt you to log in to your Vercel account.
    ```bash
    npx vercel login
    ```

3.  **Deploy to Production:**
    From the `halfway-app` directory, run the deployment command. Vercel will automatically detect the Next.js project, build it, and deploy it.
    ```bash
    npx vercel --prod
    ```

Vercel will provide you with a public URL for your deployed application.

This app uses data from TfL. © Transport for London. Provided under [TfL’s Open Data Policy](https://tfl.gov.uk/info-for/open-data-users/open-data-policy).
