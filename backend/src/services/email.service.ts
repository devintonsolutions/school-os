
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  FRONTEND_URL,
} = process.env;

if (
  !SMTP_HOST ||
  !SMTP_PORT ||
  !SMTP_USER ||
  !SMTP_PASS ||
  !EMAIL_FROM
) {
  throw new Error("Email SMTP environment variables are missing");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(
  options: SendEmailOptions
): Promise<void> {
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  if (!FRONTEND_URL) {
    throw new Error("FRONTEND_URL is not configured");
  }

  const verificationUrl = new URL(
    "/verify-email",
    FRONTEND_URL
  );

  verificationUrl.searchParams.set("token", token);

  const link = verificationUrl.toString();

  await sendEmail({
    to: email,
    subject: "Verify your LearnOS email",
    text: [
      "Welcome to LearnOS!",
      "",
      "Verify your email using this link:",
      link,
      "",
      "This link expires in 15 minutes.",
      "If you did not create this account, ignore this email.",
    ].join("\n"),
    html: `
      <h2>Welcome to LearnOS!</h2>
      <p>Please verify your email address.</p>
      <p>
        <a href="${link}">Verify my email</a>
      </p>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  });
}
