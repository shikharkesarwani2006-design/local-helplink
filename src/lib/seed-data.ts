'use client';

import { 
  Firestore, 
  collection, 
  doc, 
  writeBatch, 
  Timestamp,
  addDoc
} from 'firebase/firestore';

/**
 * Seeds the Firestore database with realistic Local HelpLink sample data.
 */
export async function seedDatabase(db: Firestore) {
  const batch = writeBatch(db);

  // 1. SAMPLE USERS
  const users = [
    {
      id: "user_arjun",
      name: "Arjun Sharma",
      email: "arjun.s@university.edu",
      role: "volunteer",
      verified: true,
      skills: ["Bike Repair", "Maths Tutoring"],
      rating: 4.8,
      totalHelped: 12,
      location: { area: "Hostel Block A" },
      createdAt: Timestamp.now(),
    },
    {
      id: "user_priya",
      name: "Priya Patel",
      email: "priya.p@university.edu",
      role: "user",
      verified: false,
      skills: [],
      rating: 5.0,
      totalHelped: 0,
      location: { area: "Library Block" },
      createdAt: Timestamp.now(),
    },
    {
      id: "user_rahul",
      name: "Rahul Verma",
      email: "rahul.v@university.edu",
      role: "provider",
      verified: true,
      skills: ["Laptop Repair", "Python"],
      rating: 4.2,
      totalHelped: 45,
      location: { area: "Main Gate" },
      createdAt: Timestamp.now(),
    },
    {
      id: "user_ananya",
      name: "Ananya Iyer",
      email: "ananya.i@university.edu",
      role: "volunteer",
      verified: true,
      skills: ["DSA", "Python"],
      rating: 4.9,
      totalHelped: 8,
      location: { area: "Hostel Block C" },
      createdAt: Timestamp.now(),
    },
    {
      id: "user_vikram",
      name: "Vikram Singh",
      email: "vikram.s@university.edu",
      role: "volunteer",
      verified: false,
      skills: ["First Aid"],
      rating: 3.8,
      totalHelped: 2,
      location: { area: "Sports Complex" },
      createdAt: Timestamp.now(),
    }
  ];

  users.forEach(u => {
    const userRef = doc(db, "users", u.id);
    batch.set(userRef, u);
  });

  // 2. SAMPLE REQUESTS
  const requests = [
    {
      title: "Urgent O+ Blood Needed",
      description: "Emergency surgery at City Hospital. Need 2 units of O+ blood immediately.",
      category: "blood",
      urgency: "critical",
      status: "open",
      location: { area: "Main Gate" },
      createdBy: "user_priya",
      postedByName: "Priya Patel",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)), // 2 hours
    },
    {
      title: "B+ Blood Donation Request",
      description: "Requesting blood donation for scheduled procedure next week.",
      category: "blood",
      urgency: "medium",
      status: "open",
      location: { area: "Hostel Block A" },
      createdBy: "user_vikram",
      postedByName: "Vikram Singh",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 12 * 60 * 60 * 1000)), // 12 hours
    },
    {
      title: "Help with DSA Graphs",
      description: "Struggling with Dijkstra's algorithm. Need a 1-hour session before the exam.",
      category: "tutor",
      urgency: "normal",
      status: "accepted",
      acceptedBy: "user_ananya",
      location: { area: "Library Block" },
      createdBy: "user_arjun",
      postedByName: "Arjun Sharma",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    },
    {
      title: "Python Debugging Help",
      description: "My Django project keeps throwing a CSRF error. Need a quick look.",
      category: "tutor",
      urgency: "medium",
      status: "open",
      location: { area: "Hostel Block C" },
      createdBy: "user_rahul",
      postedByName: "Rahul Verma",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 12 * 60 * 60 * 1000)),
    },
    {
      title: "Flat Tyre near Canteen",
      description: "Caught a nail on my way to class. Need a patch kit or help with the spare.",
      category: "repair",
      urgency: "normal",
      status: "completed",
      acceptedBy: "user_arjun",
      location: { area: "Main Gate" },
      createdBy: "user_priya",
      postedByName: "Priya Patel",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    },
    {
      title: "Laptop Screen Flickering",
      description: "My MacBook screen is flickering. Need someone to check the display cable.",
      category: "repair",
      urgency: "medium",
      status: "open",
      location: { area: "Hostel Block A" },
      createdBy: "user_ananya",
      postedByName: "Ananya Iyer",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 12 * 60 * 60 * 1000)),
    },
    {
      title: "Lost Wallet with ID",
      description: "Lost my brown wallet near the admin block. Had my college ID inside.",
      category: "emergency",
      urgency: "critical",
      status: "open",
      location: { area: "Main Gate" },
      createdBy: "user_rahul",
      postedByName: "Rahul Verma",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    },
    {
      title: "Looking for Gym Partner",
      description: "Looking for someone to hit the gym with at 6 PM daily for motivation.",
      category: "other",
      urgency: "normal",
      status: "open",
      location: { area: "Sports Complex" },
      createdBy: "user_vikram",
      postedByName: "Vikram Singh",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    }
  ];

  requests.forEach(r => {
    const requestRef = doc(collection(db, "requests"));
    batch.set(requestRef, r);
  });

  await batch.commit();
}
