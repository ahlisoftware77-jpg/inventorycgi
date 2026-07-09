# **App Name**: AssetWise

## Core Features:

- Asset Search and Filtering: Enables users to quickly find assets based on various criteria such as name, category, location, or status.
- User Authentication: Secure user login and registration using email and password, managed by Firebase Authentication.
- Asset CRUD Operations: Allows authorized users to create, read, update, and delete asset records stored in Firestore, with each asset including fields like code, name, category, location, purchase date, price, condition, status, notes, and photo.
- Realtime Data Synchronization: Leverages Firestore's `onSnapshot` to provide realtime updates of asset information across all connected users.
- Asset Image Management: Enables uploading asset photos to Firebase Storage and displaying them within the application.
- Dashboard Summaries: Provides a dashboard view summarizing key asset metrics, including total asset count, total asset value, number of assets on loan, and number of damaged assets.
- Generate insights about assets: Tool uses LLM to determine how to generate textual insights regarding the status of all the company assets (such as summarizing common damages).

## Style Guidelines:

- Primary color: Vivid Blue (#4285F4) for a professional and trustworthy feel.
- Background color: Light Blue (#E3F2FD), a desaturated version of the primary, to create a calm and professional backdrop.
- Accent color: Yellow-Orange (#FFB300) for highlighting key actions and important information, analogous to vivid blue to capture attention.
- Font pairing: 'Space Grotesk' (sans-serif) for headers, 'Inter' (sans-serif) for body.
- Use flat, modern icons to represent asset categories and actions.
- Employ a clean, card-based layout to display assets and dashboard metrics.
- Incorporate subtle transitions and animations for a smooth user experience.