import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,     // e.g. "Finance Tracker <no-reply@yourdomain.com>"
      to: to,
      subject: subject,
      html: html,
    });
    if (error) {
      console.error("Resend email error", error);
      return false;
    }
    console.log("Resend email sent:", data.id);
    return true;
  } catch (err) {
    console.error("Resend sendEmail exception:", err);
    return false;
  }
}
