
'use server';

import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

/**
 * Server action to handle high-urgency alerts via SMS and Email.
 * This runs on the server to protect API keys.
 */

// These would be set in your Firebase App Hosting environment variables
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM_EMAIL;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function sendHighUrgencyAlerts(requestData: {
  title: string;
  description: string;
  category: string;
  area: string;
  postedByName: string;
}) {
  const { title, description, category, area, postedByName } = requestData;
  const alertMessage = `[HIGH URGENCY] ${category.toUpperCase()}: ${title}\nArea: ${area}\nBy: ${postedByName}\n\n"${description}"`;

  console.log('Initiating High Urgency Alerts...');

  // 1. SEND SMS (Twilio)
  if (TWILIO_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) {
    try {
      const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
      // In production, you would fetch a list of responder phone numbers from Firestore
      // For this prototype, we log the attempt to simulate a broadcast
      console.log(`[Twilio Simulation] Sending SMS to community responders: ${alertMessage}`);
      
      /* Example actual call:
      await client.messages.create({
        body: alertMessage,
        from: TWILIO_FROM,
        to: '+1234567890' // Replace with dynamic list
      });
      */
    } catch (error) {
      console.error('Twilio Alert Failed:', error);
    }
  } else {
    console.warn('Twilio credentials missing. SMS alert skipped.');
  }

  // 2. SEND EMAIL (SendGrid)
  if (SENDGRID_API_KEY && SENDGRID_FROM) {
    try {
      const msg = {
        to: 'emergency-responders@university.edu', // Representative email list
        from: SENDGRID_FROM,
        subject: `[URGENT HELP] ${category.toUpperCase()}: ${title}`,
        text: alertMessage,
        html: `
          <div style="font-family: sans-serif; padding: 24px; border: 2px solid #ef4444; border-radius: 16px; background-color: #fef2f2;">
            <h1 style="color: #b91c1c; margin-top: 0;">⚠️ High Urgency Request</h1>
            <p style="font-size: 18px; font-weight: bold; color: #111827;">${title}</p>
            <div style="margin: 16px 0; padding: 16px; background-color: white; border-radius: 8px;">
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Location:</strong> ${area}</p>
              <p><strong>Posted By:</strong> ${postedByName}</p>
              <p><strong>Description:</strong> ${description}</p>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 0;">
              This is an automated alert from Local HelpLink Hyperlocal Network.
            </p>
          </div>
        `,
      };
      await sgMail.send(msg);
      console.log(`[SendGrid] Emergency email alert sent for: ${title}`);
    } catch (error) {
      console.error('SendGrid Alert Failed:', error);
    }
  } else {
    console.warn('SendGrid credentials missing. Email alert skipped.');
  }
}
