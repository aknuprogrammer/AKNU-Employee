const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendWelcomeEmail = async (email, setupLink) => {
  return; // Email notifications disabled as of now
  if (!email) return;
  const mailOptions = {
    from: `"AKNU Payroll" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Welcome to AKNU Payroll - Setup your Account',
    html: `
      <h2>Welcome to AKNU Payroll Portal</h2>
      <p>An account has been created for you to securely access your payslips online.</p>
      <p>Please click the link below to set up your password and access your dashboard:</p>
      <p><a href="${setupLink}" style="padding: 10px 20px; background-color: #0d2c6c; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Setup Password</a></p>
      <br/>
      <p style="font-size: 14px; color: #555;">If the button above does not work, you can copy and paste the following URL into your web browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${setupLink}</p>
      <br/>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

const sendPayslipEmail = async (email, month, year, portalUrl) => {
  return; // Email notifications disabled as of now
  if (!email) return;
  const mailOptions = {
    from: `"AKNU Payroll" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your Payslip for ${month} ${year} is ready`,
    html: `
      <h2>Payslip Generated</h2>
      <p>Your payslip for the month of <strong>${month} ${year}</strong> is now available.</p>
      <p>To view or download your payslip, please login to the portal and enter the <strong>last 4 digits of your Aadhaar number</strong> when prompted to securely unlock it.</p>
      <br/>
      <p><a href="${portalUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Employee Portal</a></p>
      <br/>
      <p style="font-size: 14px; color: #555;">If the button above does not work, you can copy and paste the following URL into your web browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${portalUrl}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Payslip email sent to ${email}`);
  } catch (error) {
    console.error('Error sending payslip email:', error);
  }
};

const sendForm16Email = async (email, academicYear, portalUrl) => {
  return; // Email notifications disabled as of now
  if (!email) return;
  const mailOptions = {
    from: `"AKNU Payroll" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your Form 16 (TDS Certificate) for AY ${academicYear} is ready`,
    html: `
      <h2>Form 16 Uploaded</h2>
      <p>Your Form 16 (TDS Certificate) for the academic year <strong>${academicYear}</strong> is now available.</p>
      <p>To view or download your certificate, please login to the portal and enter the <strong>last 4 digits of your Aadhaar number</strong> when prompted to securely unlock it.</p>
      <br/>
      <p><a href="${portalUrl}" style="padding: 10px 20px; background-color: #0d2c6c; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Employee Portal</a></p>
      <br/>
      <p style="font-size: 14px; color: #555;">If the button above does not work, you can copy and paste the following URL into your web browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${portalUrl}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Form 16 email sent to ${email}`);
  } catch (error) {
    console.error('Error sending Form 16 email:', error);
  }
};

const sendPFAccountSlipEmail = async (email, financialYear, portalUrl) => {
  return; // Email notifications disabled as of now
  if (!email) return;
  const mailOptions = {
    from: `"AKNU Payroll" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your PF Account Slip for FY ${financialYear} is ready`,
    html: `
      <h2>PF Account Slip Uploaded</h2>
      <p>Your Provident Fund (PF) Account Slip for the financial year <strong>${financialYear}</strong> is now available.</p>
      <p>To view or download your slip, please login to the portal and enter the <strong>last 4 digits of your Aadhaar number</strong> when prompted to securely unlock it.</p>
      <br/>
      <p><a href="${portalUrl}" style="padding: 10px 20px; background-color: #0d2c6c; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Employee Portal</a></p>
      <br/>
      <p style="font-size: 14px; color: #555;">If the button above does not work, you can copy and paste the following URL into your web browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${portalUrl}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`PF Account Slip email sent to ${email}`);
  } catch (error) {
    console.error('Error sending PF Account Slip email:', error);
  }
};

module.exports = { sendWelcomeEmail, sendPayslipEmail, sendForm16Email, sendPFAccountSlipEmail };
