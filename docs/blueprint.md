# **App Name**: CampusConnect

## Core Features:

- Real-time Request Feed: Display a real-time feed of nearby help requests using Firestore onSnapshot listeners.
- Location-Based Filtering: Enable users to filter requests within a specified radius (e.g., 5km) of their location.
- Request Urgency Indicator: Visually indicate the urgency of requests using color coding: red for critical, yellow for medium, and green for normal.
- Automatic Request Expiry: Automatically expire requests after 24 hours.
- Reputation and Skill Verification System: Utilize a tool to detect the applicant's skills from uploaded resume.
- Abuse Reporting: Allow users to report inappropriate or abusive requests for admin review.
- User Role Management: Implement different user roles (user, volunteer, service provider, admin) with role-based access control.

## Style Guidelines:

- Primary color: Light blue (#A7D1AB) to convey trust and community.
- Background color: Very light blue (#EBF4F0), almost white, to keep the interface clean.
- Accent color: Soft teal (#78B0B5) for interactive elements.
- Body font: 'Inter', sans-serif, to ensure readability and a modern feel.
- Headline font: 'Space Grotesk', sans-serif, used for headings to provide a contemporary, slightly techy feel.
- Use consistent, clean icons from a library like Material Icons to represent categories and actions.
- Employ a responsive layout using Tailwind CSS grid and flexbox for optimal viewing on all devices.