const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

type SendEmailParams = {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
};

export async function sendEmail({ to, subject, htmlContent, textContent }: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is not set');
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Oasify',
        email: 'adk2104@gmail.com',
      },
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[EMAIL ERROR]', error);
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return response.json();
}

export function generateVerificationEmail(code: string, magicLinkUrl: string): {
  subject: string;
  htmlContent: string;
  textContent: string;
} {
  const subject = `Your Oasify verification code: ${code}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 8px;">Sign in to Oasify</h1>
    <p style="font-size: 16px; color: #6b7280; margin: 0 0 32px;">Enter this code to verify your email:</p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827;">${code}</span>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Or click the button below:</p>

    <a href="${magicLinkUrl}" style="display: block; background-color: #06b6d4; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; padding: 14px 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
      Sign in to Oasify
    </a>

    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;

  const textContent = `Sign in to Oasify

Your verification code is: ${code}

Or click this link: ${magicLinkUrl}

This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.`;

  return { subject, htmlContent, textContent };
}
