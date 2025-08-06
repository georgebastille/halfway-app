import type { Metadata } from "next";
import SpamProtectedEmail from "../components/SpamProtectedEmail";

export const metadata: Metadata = {
  title: "About - Halfway",
  description: "Learn more about the Halfway app.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen text-gray-800">
      {/* Mobile title - only visible when sidebar is closed */}
      <header className="lg:hidden bg-white border-b border-gray-200 py-6 px-4 pt-20 pb-12 overflow-visible">
        <div className="text-center overflow-visible">
          <h1
            className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400 overflow-visible"
            style={{ lineHeight: "1.3" }}
          >
            Halfway
          </h1>
        </div>
      </header>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 pt-4 lg:pt-8">
        <header className="relative text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
            About Halfway
          </h1>
        </header>

        <main className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              How to Use the App
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Halfway helps you find the most convenient station to meet
                someone in London based on TfL travel times.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <strong>Enter Starting Points:</strong> Begin by typing the
                  names of the starting tube, overground, or tram stations for
                  each person in the input fields. An autocomplete list will
                  appear to help you select the correct station.
                </li>
                <li>
                  <strong>Add More People:</strong> If you&apos;re meeting with
                  more than one person, click the &quot;Add Another Starting
                  Point&quot; button to add more input fields.
                </li>
                <li>
                  <strong>Adjust Fairness vs. Speed:</strong> Use the slider to
                  define what &quot;best&quot; means to you.
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>
                      <strong>Fairest:</strong> Minimizes the difference in
                      travel time for everyone.
                    </li>
                    <li>
                      <strong>Fastest:</strong> Minimizes the average travel
                      time for the group.
                    </li>
                    <li>
                      <strong>Balanced:</strong> A mix of both, which is the
                      default.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>View Results:</strong> The app will automatically
                  calculate and display the top 5 meeting points that best match
                  your criteria. Each result shows the destination station, the
                  individual journey times, the average travel time, and an
                  &quot;unfairness&quot; score (the variance in travel times).
                </li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              How It Works
            </h2>
            <p className="text-gray-600">
              This application was built using Next.js, TypeScript, and Tailwind
              CSS. It queries a pre-built SQLite database of TfL station and
              travel time data to find optimal meeting points. If you&apos;re
              interested in the technical details of how it was built, you can
              read the full story in my blog post.
            </p>
            <div className="mt-4">
              <a
                href="https://building-ideas.hashnode.dev/finding-the-perfect-meeting-spot-building-a-meet-in-the-middle-app-with-tfl-data-and-geminicli"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium transition"
              >
                Read the blog post &rarr;
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Feedback
            </h2>
            <p className="text-gray-600">
              Have suggestions or found a bug? I&apos;d love to hear from you!
              Please send me an email.
            </p>
            <div className="mt-4">
              <SpamProtectedEmail
                user="georgebastille"
                domain="gmail"
                tld="com"
                subject="Feedback on Halfway App"
                className="text-blue-600 hover:text-blue-800 font-medium transition"
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Open Data
            </h2>
            <p className="text-gray-600">
              This app uses data from TfL. © Transport for London. Provided
              under TfL’s{" "}
              <a
                href="https://tfl.gov.uk/info-for/open-data-users/open-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open Data Policy
              </a>
              .
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
